import { path, wrapA } from "./deps.ts";

export type DirReader = (absPath: string) => Promise<AsyncIterator<string>>;
export const defaultDirReader: DirReader = async (absPath) =>
  wrapA((await Deno.readDir(absPath))[Symbol.asyncIterator]())
    .map((entry) => entry.name)
    .unwrap();

export const findMarkers = async (
  max: number,
  fromAbs: string,
  targets: string[],
  dirReader: DirReader = defaultDirReader,
): Promise<string[]> => {
  if (max <= 0) return [];
  const found = await wrapA(await dirReader(fromAbs))
    .some((p) => targets.includes(p));
  if (found) {
    if (fromAbs === "/") return [fromAbs];
    return [
      fromAbs,
      ...await findMarkers(max - 1, path.dirname(fromAbs), targets, dirReader),
    ];
  }
  if (fromAbs === "/") return [];
  return await findMarkers(max, path.dirname(fromAbs), targets, dirReader);
};
