import * as univPath from "jsr:@std/path@^1.0.2";
import * as windowsPath from "jsr:@std/path@^1.0.2/windows";
import * as posixPath from "jsr:@std/path@^1.0.2/posix";

import {
  wrapAsyncIterator as wrapA,
} from "https://deno.land/x/iterator_helpers@v0.1.2/mod.ts";

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
