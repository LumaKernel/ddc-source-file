import {
  BaseSource,
  Candidate,
  GatherCandidatesArguments,
  homeDir,
  path as univPath,
  wrapA,
} from "../ddc-file/deps.ts";
import * as util from "../ddc-file/util.ts";
import * as internal from "../ddc-file/internal_autoload_fn.ts";

type Params = {
  mode: "os" | "win32" | "posix";
  takeFileNum: number;
  projMarkers: string[];
  cwdMaxCandidates: number;
  bufMaxCandidates: number;
  projFromCwdMaxCandidates: number[];
  projFromBufMaxCandidates: number[];
  cwdAsRoot: boolean;
  bufAsRoot: boolean;
  projAsRoot: boolean;
};

type FindPoint = {
  dir: string;
  max: number;
  asRoot: boolean;
  menu: string;
};

const existsDir = async (filePath: string): Promise<boolean> => {
  try {
    return (await Deno.lstat(filePath)).isDirectory;
  } catch (_e: unknown) {
    // Should not care about error.
    // https://github.com/denoland/deno_std/issues/1216
    return false;
  }
};

export class Source extends BaseSource {
  async gatherCandidates(
    args: GatherCandidatesArguments,
  ): Promise<Candidate[]> {
    const p = args.sourceParams as Params;
    const mode = p.mode === "os"
      ? (Deno.build.os === "windows" ? "win32" : "posix")
      : p.mode;
    const path = mode === "posix" ? univPath.posix : univPath.win32;
    const maxCandidates = args.sourceOptions.maxCandidates;
    const maxOfMax = Math.max(
      p.cwdMaxCandidates,
      p.bufMaxCandidates,
      ...p.projFromCwdMaxCandidates,
      ...p.projFromBufMaxCandidates,
    );

    // e.g. '~/config/', bufPath = '/home/ubuntu/config/init.vim'
    const [inputFile, bufPath] = await internal.info(args.denops);

    // e.g. 'config' for inputFile = '~/config'
    // e.g. '' for inputFile = '~/config/'
    const inputBaseName = inputFile.endsWith(path.sep)
      ? ""
      : path.basename(inputFile);

    // e.g. '/home/ubuntu/config' for inputFile = '~/config'
    const inputFileExpanded = (() => {
      const home = homeDir();
      const last = inputFile.endsWith(path.sep) ? path.sep : "";
      {
        const pat = `~${path.sep}`;
        if (home && inputFile.startsWith(pat)) {
          return path.join(home, inputFile.slice(pat.length)) + last;
        }
      }
      {
        const pat = `$HOME${path.sep}`;
        if (home && inputFile.startsWith(pat)) {
          return path.join(home, inputFile.slice(pat.length)) + last;
        }
      }
      {
        const pat = `%USERPROFILE%${path.sep}`;
        if (
          home && inputFile.toUpperCase().startsWith(pat)
        ) {
          return path.join(home, inputFile.slice(pat.length)) + last;
        }
      }
      return inputFile;
    })();

    // e.g. '/home/ubuntu/config' for inputFile = '~/config/'
    // e.g. '/home/ubuntu' for inputFile = '~/config'
    const inputDirName = inputFileExpanded.endsWith(path.sep)
      ? inputFileExpanded
      : path.dirname(inputFileExpanded);

    // e.g. true for inputFile = '~/config', '/tmp/'
    // e.g. false for inputFile = 'tmp/', './tmp'
    const isInputAbs = path.isAbsolute(inputFileExpanded);

    const findPointsAsync:
      (FindPoint | FindPoint[] | Promise<FindPoint | FindPoint[]>)[] = [];

    if (isInputAbs) {
      // In this case, other points become 'asRoot' or omitted if asRoot is
      // not set, so the point from root should be added separately.

      // point from fs root
      findPointsAsync.push({
        dir: "",
        menu: "",
        max: maxOfMax,
        asRoot: true,
      });
    }

    // point from cwd
    findPointsAsync.push({
      dir: Deno.cwd(),
      max: p.cwdMaxCandidates,
      menu: "cwd",
      asRoot: p.cwdAsRoot,
    });

    // point from project-root found from cwd
    findPointsAsync.push(
      util.findMarkers(
        p.projFromCwdMaxCandidates.length,
        Deno.cwd(),
        p.projMarkers,
        path,
      )
        .then((dirs) =>
          dirs.map((dir, i) => ({
            dir,
            max: p.projFromCwdMaxCandidates[i],
            menu: `cwd^${i === 0 ? "" : i + 1}`,
            asRoot: p.projAsRoot,
          }))
        )
        .catch(() => []),
    );
    if (path.isAbsolute(bufPath)) {
      const bufDir = path.dirname(bufPath);

      // point from buf
      findPointsAsync.push({
        dir: bufDir,
        menu: "buf",
        max: p.bufMaxCandidates,
        asRoot: p.bufAsRoot,
      });

      // point from project-root found from buf
      findPointsAsync.push(
        util.findMarkers(
          p.projFromBufMaxCandidates.length,
          bufDir,
          p.projMarkers,
          path,
        )
          .then((dirs) =>
            dirs.map((dir, i) => ({
              dir,
              max: p.projFromBufMaxCandidates[i],
              menu: `buf^${i === 0 ? "" : i + 1}`,
              asRoot: p.projAsRoot,
            }))
          )
          .catch(() => []),
      );
    }

    // e.g. [
    //   {dir: '', asRoot: true, ...},
    //   {dir: '/home/ubuntu/config', asRoot: true, ...},
    // ]
    const findPoints = await Promise.all(findPointsAsync);

    // e.g. [
    //   {dir: '/vim', ...},
    //   {dir: '/home/ubuntu/config/vim', ...},
    // ] for inputFile = '/vim'
    const resolvedFindPoints = await Promise.all(
      findPoints
        .flat()
        .filter(({ max }) => max >= 1)
        .filter(({ asRoot }) => !isInputAbs || asRoot)
        .map((point) => ({
          ...point,
          dir: path.normalize(path.join(point.dir, inputDirName)),
        }))
        .map(async (point) => ({
          point,
          ex: await existsDir(point.dir.replaceAll(path.sep, univPath.sep)),
        })),
    );

    const candidatesList = await Promise.all(
      resolvedFindPoints
        .filter(({ ex }) => ex)
        .map(({ point }) => point)
        .map(
          async ({ dir, menu, max }) =>
            await wrapA(
              Deno.readDir(dir.replaceAll(path.sep, univPath.sep))
                [Symbol.asyncIterator](),
            )
              .take(p.takeFileNum)
              .filter(({ name }) =>name.toUpperCase().startsWith(inputBaseName.toUpperCase()))
              .map(({ name, isDirectory }): Candidate => ({
                word: name,
                menu: (menu !== "" && isInputAbs ? path.sep : "") + menu,
                kind: isDirectory ? "dir" : "",
              }))
              .take(Math.min(max, maxCandidates))
              .toArray()
              .catch(() => []),
        ),
    );
    const candidates: Candidate[] = candidatesList
      .flat();

    return candidates;
  }

  params(): Params {
    return {
      mode: "posix",
      projMarkers: [
        ".git",
        ".vscode",
        ".github",
      ],
      takeFileNum: 10000,
      cwdMaxCandidates: 1000,
      bufMaxCandidates: 1000,
      projFromCwdMaxCandidates: [1000],
      projFromBufMaxCandidates: [1000],
      cwdAsRoot: false,
      bufAsRoot: false,
      projAsRoot: true,
    };
  }
}
