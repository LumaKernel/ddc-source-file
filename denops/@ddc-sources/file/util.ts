import type * as univPath from "@std/path";
import type * as windowsPath from "@std/path/windows";
import type * as posixPath from "@std/path/posix";

export type DirReader = (absPath: string) => AsyncIterable<string>;
export const defaultDirReader: DirReader = async function* (absPath) {
  for await (const entry of Deno.readDir(absPath)) {
    yield entry.name;
  }
};

export const findMarkers = async (
  max: number,
  fromAbsNormalized: string,
  targets: string[],
  path: typeof univPath | typeof posixPath | typeof windowsPath,
  dirReader: DirReader = defaultDirReader,
): Promise<string[]> => {
  if (max <= 0) return [];
  let found = false;
  for await (const p of dirReader(fromAbsNormalized)) {
    if (targets.includes(p)) {
      found = true;
      break;
    }
  }
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
