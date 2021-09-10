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
  cwdIsRoot: boolean;
  bufIsRoot: boolean;
  projIsRoot: boolean;
};

type FindPoint = {
  dir: string;
  max: number;
  isRoot: boolean;
  menu?: string;
};

// https://github.com/denoland/deno_std/issues/1216
const exists = async (filePath: string): Promise<boolean> => {
  try {
    await Deno.lstat(filePath);
    return true;
  } catch (_e: unknown) {
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
    const [inputFile, bufPath] = await internal.info(args.denops);
    const base = inputFile.endsWith(path.sep) ? "" : path.basename(inputFile);
    const inputFileExpanded = (() => {
      const home = homeDir();
      const last = inputFile.endsWith(path.sep) ? path.sep : "";
      if (home && inputFile.startsWith(`~${path.sep}`)) {
        return path.join(home, inputFile.slice(2)) + last;
      }
      if (home && inputFile.startsWith(`$HOME${path.sep}`)) {
        return path.join(home, inputFile.slice(6)) + last;
      }
      if (
        home && inputFile.toUpperCase().startsWith(`%USERPROFILE%${path.sep}`)
      ) {
        return path.join(home, inputFile.slice(14)) + last;
      }
      return inputFile;
    })();

    const fromDirsProms:
      (FindPoint | FindPoint[] | Promise<FindPoint | FindPoint[]>)[] = [];
    const isAbs = path.isAbsolute(inputFileExpanded);
    if (isAbs) {
      fromDirsProms.push({
        dir: "",
        menu: "",
        max: maxOfMax,
        isRoot: true,
      });
    }

    fromDirsProms.push({
      dir: Deno.cwd(),
      max: p.cwdMaxCandidates,
      menu: "cwd",
      isRoot: p.cwdIsRoot,
    });
    fromDirsProms.push(
      util.findMarkers(
        p.projFromCwdMaxCandidates.length,
        Deno.cwd(),
        p.projMarkers,
      ).then((dirs) =>
        dirs.map((dir, i) => ({
          dir,
          max: p.projFromCwdMaxCandidates[i],
          menu: `cwd^${i === 0 ? "" : i + 1}`,
          isRoot: p.projIsRoot,
        }))
      ),
    );
    if (path.isAbsolute(bufPath)) {
      const bufDir = path.dirname(bufPath);
      fromDirsProms.push({
        dir: bufDir,
        menu: "buf",
        max: p.bufMaxCandidates,
        isRoot: p.bufIsRoot,
      });
      fromDirsProms.push(
        util.findMarkers(
          p.projFromBufMaxCandidates.length,
          bufDir,
          p.projMarkers,
        )
          .then((dirs) =>
            dirs.map((dir, i) => ({
              dir,
              max: p.projFromBufMaxCandidates[i],
              menu: `buf^${i === 0 ? "" : i + 1}`,
              isRoot: p.projIsRoot,
            }))
          ),
      );
    }

    const tmp4 = inputFileExpanded.endsWith(path.sep)
      ? inputFileExpanded
      : path.dirname(inputFileExpanded);
    const fromDirs = await Promise.all(fromDirsProms);
    const inputPaths = await Promise.all(
      fromDirs
        .flat()
        .filter(({ max }) => max >= 1)
        .filter(({ isRoot }) => !isAbs || isRoot)
        .map((point) => ({
          ...point,
          dir: path.normalize(path.join(point.dir, tmp4)),
        }))
        .map(async (point) => ({
          point,
          ex: await exists(point.dir.replaceAll(path.sep, univPath.sep)),
        })),
    );
    const tmp2 = await Promise.all(
      inputPaths
        .filter(({ ex }) => ex)
        .map(({ point }) => point)
        .map(
          async ({ dir, menu, max }) =>
            await wrapA(
              (await Deno.readDir(dir.replaceAll(path.sep, univPath.sep)))
                [Symbol.asyncIterator](),
            )
              .take(p.takeFileNum)
              .filter(({ name }) => name.startsWith(base))
              .map(({ name, isDirectory }): Candidate => ({
                word: name +
                  (isDirectory ? path.sep : ""),
                menu: (menu !== "" && isAbs ? path.sep : "") + menu,
              }))
              .take(Math.min(max, maxCandidates))
              .toArray()
              .catch(() => []),
        ),
    );
    const cs: Candidate[] = tmp2
      .flat();

    return cs;
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
      cwdIsRoot: false,
      bufIsRoot: false,
      projIsRoot: true,
    };
  }
}
