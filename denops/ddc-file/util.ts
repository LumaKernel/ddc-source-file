import { path as univPath, wrapA } from "./deps.ts";

export type DirReader = (absPath: string) => Promise<AsyncIterator<string>>;
export const defaultDirReader: DirReader = async (absPath) =>
  wrapA((await Deno.readDir(absPath))[Symbol.asyncIterator]())
    .map((entry) => entry.name)
    .unwrap();

export const findMarkers = async (
  max: number,
  fromAbsNormalized: string,
  targets: string[],
  path: typeof univPath | typeof univPath.win32 | typeof univPath.posix,
  dirReader: DirReader = defaultDirReader,
): Promise<string[]> => {
  if (max <= 0) return [];
  const found = await wrapA(await dirReader(fromAbsNormalized))
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
