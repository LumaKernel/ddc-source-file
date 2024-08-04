import {
  path as univPath,
  posix as posixPath,
  windows as windowsPath,
  wrapA,
} from "./deps.ts";

export type DirReader = (absPath: string) => AsyncIterator<string>;
export const defaultDirReader: DirReader = (absPath) =>
  wrapA(Deno.readDir(absPath)[Symbol.asyncIterator]())
    .map((entry) => entry.name)
    .unwrap();

export const findMarkers = async (
  max: number,
  fromAbsNormalized: string,
  targets: string[],
  path: typeof univPath | typeof posixPath | typeof windowsPath,
  dirReader: DirReader = defaultDirReader,
): Promise<string[]> => {
  if (max <= 0) return [];
  const found = await wrapA(dirReader(fromAbsNormalized))
    .some((p) => targets.includes(p));
  const parsed = path.parse(fromAbsNormalized);
  if (found) {
    if (parsed.root === fromAbsNormalized) return [fromAbsNormalized];
    return [
      fromAbsNormalized,
      ...await findMarkers(
        max - 1,
        parsed.dir,
        targets,
        path,
        dirReader,
      ),
    ];
  }
  if (parsed.root === fromAbsNormalized) return [];
  return await findMarkers(
    max,
    parsed.dir,
    targets,
    path,
    dirReader,
  );
};
