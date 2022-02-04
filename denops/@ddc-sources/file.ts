import {
  BaseSource,
  Candidate,
  fn,
  GatherCandidatesArguments,
  homeDir,
  path as univPath,
  vars,
  wrapA,
} from "../@ddc-file/deps.ts";
import * as util from "../@ddc-file/util.ts";
import * as internal from "../@ddc-file/internal_autoload_fn.ts";

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
  trailingSlash: boolean;
  trailingSlashAbbr: boolean;
  followSymlinks: boolean;
  disableMenu: boolean;
  beforeResolve: string;
  afterResolve: string;

  // display customize
  displayFile: string;
  displayDir: string;
  displaySym: string;
  displaySymFile: string;
  displaySymDir: string;
  displayCwd: string;
  displayBuf: string;
};

type FindPoint = {
  dir: string;
  max: number;
  asRoot: boolean;
  menu: string;
};

const existsDir = async (filePath: string): Promise<boolean> => {
  try {
    return (await Deno.stat(filePath)).isDirectory;
  } catch (_e: unknown) {
    // Should not care about error.
    // https://github.com/denoland/deno_std/issues/1216
    return false;
  }
};

export class Source extends BaseSource<Params> {
  async gatherCandidates(
    args: GatherCandidatesArguments<Params>,
  ): Promise<Candidate[]> {
    const p = args.sourceParams;
    const mode = p.mode === "os"
      ? (Deno.build.os === "windows" ? "win32" : "posix")
      : p.mode;
    const path = mode === "posix" ? univPath.posix : univPath.win32;
    const maxOfMax = Math.max(
      p.cwdMaxCandidates,
      p.bufMaxCandidates,
      ...p.projFromCwdMaxCandidates,
      ...p.projFromBufMaxCandidates,
    );

    // e.g. (
    //   inputFileFull = '~/config/aaa.bbb'
    //   inputFileBasePrefix = 'aaa.'
    //   bufPath = '/home/ubuntu/config/init.vim'
    // )
    // e.g. (
    //   inputFileFull = 'config/abc'
    //   inputFileBasePrefix = ''
    //   bufPath = '/dir/to/path'
    // )
    const [inputFileFull, inputFileBasePrefix, bufPath] = await internal.info(
      args.denops,
      args.context.input,
      mode === "posix",
    );

    // e.g. '/home/ubuntu/config' for inputFileFull = '~/config'
    const inputFileFullExpanded = await (async () => {
      const home = homeDir();
      const last = inputFileFull.endsWith(path.sep) ? path.sep : "";
      {
        const pat = `~${path.sep}`;
        if (home && inputFileFull.startsWith(pat)) {
          return path.join(home, inputFileFull.slice(pat.length)) + last;
        }
      }
      {
        const pat = `$HOME${path.sep}`;
        if (home && inputFileFull.startsWith(pat)) {
          return path.join(home, inputFileFull.slice(pat.length)) + last;
        }
      }
      {
        const pat = `%USERPROFILE%${path.sep}`;
        if (
          home && inputFileFull.toUpperCase().startsWith(pat)
        ) {
          return path.join(home, inputFileFull.slice(pat.length)) + last;
        }
      }
      {
        const pat = new RegExp(
          `^(?:\\$(?:env:)?(\\w+)|%(\\w+)%)${path.sep === "/" ? "/" : "\\\\"}`,
          "i",
        );
        const m = inputFileFull.match(pat);
        if (m) {
          const env = await vars.environment.get(
            args.denops,
            m[1] || m[2],
          ) as string;
          if (env) {
            return path.join(env, inputFileFull.slice(m[0].length)) + last;
          }
        }
      }
      return inputFileFull;
    })();

    // e.g. '/home/ubuntu/config' for inputFileFull = '~/config/'
    // e.g. '/home/ubuntu' for inputFileFull = '~/config'
    const inputDirName = inputFileFullExpanded.endsWith(path.sep)
      ? inputFileFullExpanded
      : path.dirname(inputFileFullExpanded);

    // e.g. true for inputFileFull = '~/config', '/tmp/'
    // e.g. false for inputFileFull = 'tmp/', './tmp'
    const isInputAbs = path.isAbsolute(inputFileFullExpanded);

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

    const cwd = await fn.getcwd(args.denops) as string;

    // point from cwd
    findPointsAsync.push({
      dir: cwd,
      max: p.cwdMaxCandidates,
      menu: p.displayCwd,
      asRoot: p.cwdAsRoot,
    });

    // point from project-root found from cwd
    findPointsAsync.push(
      util.findMarkers(
        p.projFromCwdMaxCandidates.length,
        cwd,
        p.projMarkers,
        path,
      )
        .then((dirs) =>
          dirs.map((dir, i) => ({
            dir,
            max: p.projFromCwdMaxCandidates[i],
            menu: `${p.displayCwd}^${i === 0 ? "" : i + 1}`,
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
        menu: p.displayBuf,
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
              menu: `${p.displayBuf}^${i === 0 ? "" : i + 1}`,
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
    // ] for inputFileFull = '/vim'
    const resolvedFindPoints = await Promise.all(
      findPoints
        .flat()
        .filter(({ max }) => max >= 1)
        .filter(({ asRoot }) => !isInputAbs || asRoot)
        .map((point) => ({
          ...point,
          dir: path.normalize(
            path.join(point.dir, p.beforeResolve, inputDirName, p.afterResolve),
          ),
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
              .filter(({ name }) => name.startsWith(inputFileBasePrefix))
              .map(async (entry) => ({
                ...entry,
                isDirectory: entry.isDirectory ||
                  (entry.isSymlink && p.followSymlinks &&
                    await existsDir(path.join(dir, entry.name))),
              }))
              .map(({ name, isDirectory, isSymlink }): Candidate => ({
                word: name.slice(inputFileBasePrefix.length) +
                  (p.trailingSlash && isDirectory ? path.sep : ""),
                abbr: name.slice(inputFileBasePrefix.length) +
                  (p.trailingSlashAbbr && isDirectory ? path.sep : ""),
                menu: p.disableMenu
                  ? undefined
                  : (menu !== "" && isInputAbs ? path.sep : "") + menu,
                kind: isSymlink
                  ? p.followSymlinks
                    ? isDirectory ? p.displaySymDir : p.displaySymFile
                    : p.displaySym
                  : isDirectory
                  ? p.displayDir
                  : p.displayFile,
              }))
              .take(max)
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
      trailingSlash: false,
      trailingSlashAbbr: true,
      followSymlinks: false,
      disableMenu: false,
      beforeResolve: "",
      afterResolve: "",

      // display customize
      displayFile: "file",
      displayDir: "dir",
      displaySym: "sym",
      displaySymFile: "sym=file",
      displaySymDir: "sym=dir",
      displayCwd: "cwd",
      displayBuf: "buf",
    };
  }
}
