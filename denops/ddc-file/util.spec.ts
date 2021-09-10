// deno-lint-ignore-file require-await

import { asserts, fromA } from "./deps.ts";
import * as util from "./util.ts";

const createVirtualDirReader: (
  virtualStorage: Record<string, string[]>,
) => util.DirReader = (virtualStorage) =>
  async (abs: string) => fromA(virtualStorage[abs] ?? []);

Deno.test({
  name: "findMarkers",
  async fn() {
    const reader = createVirtualDirReader({
      "/": ["1", "3"],
      "/a": ["x"],
      "/a/b": ["3"],
      "/a/b/c": [],
      "/a/b/c/d": ["2", "y"],
    });
    asserts.assertEquals(
      await util.findMarkers(
        0,
        "/a/b/c/d",
        ["1", "2", "3"],
        reader,
      ),
      [],
    );
    asserts.assertEquals(
      await util.findMarkers(
        1,
        "/a/b/c/d",
        ["1", "2", "3"],
        reader,
      ),
      ["/a/b/c/d"],
    );
    asserts.assertEquals(
      await util.findMarkers(
        2,
        "/a/b/c/d",
        ["1", "2", "3"],
        reader,
      ),
      ["/a/b/c/d", "/a/b"],
    );
    asserts.assertEquals(
      await util.findMarkers(
        3,
        "/a/b/c/d",
        ["1", "2", "3"],
        reader,
      ),
      ["/a/b/c/d", "/a/b", "/"],
    );
    asserts.assertEquals(
      await util.findMarkers(
        4,
        "/a/b/c/d",
        ["1", "2", "3"],
        reader,
      ),
      ["/a/b/c/d", "/a/b", "/"],
    );
  },
});
