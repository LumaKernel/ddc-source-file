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
  targets: readonly string[],
  path: typeof univPath | typeof posixPath | typeof windowsPath,
  dirReader: DirReader = defaultDirReader,
): Promise<string[]> => {
  const targetsSet = new Set(targets);
  const result: string[] = [];
  let remaining = max;
  let current = fromAbsNormalized;

  while (remaining > 0) {
    let found = false;
    for await (const p of dirReader(current)) {
      if (targetsSet.has(p)) {
        found = true;
        break;
      }
    }
    const parsed = path.parse(current);
    // A directory is a filesystem root when its root equals itself, or when
    // its parent dir equals itself (e.g. UNC roots such as \\server\share).
    const isRoot = parsed.root === current || parsed.dir === current;
    if (found) {
      result.push(current);
      remaining--;
    }
    if (isRoot) break;
    current = parsed.dir;
  }

  return result;
};
