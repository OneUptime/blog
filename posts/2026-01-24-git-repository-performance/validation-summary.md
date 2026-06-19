# Validation Summary: How to Optimize Git Repository Performance

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Git
- Git maintenance
- Git commit-graph
- Partial clone and shallow clone
- Sparse checkout
- Git LFS
- Git configuration
- Repository repacking and garbage collection

## Sources Consulted
- Git documentation: git-maintenance - https://git-scm.com/docs/git-maintenance
- Git documentation: git-config - https://git-scm.com/docs/git-config
- Git documentation: git-gc - https://git-scm.com/docs/git-gc
- Git documentation: git-clone - https://git-scm.com/docs/git-clone
- Git documentation: git-sparse-checkout - https://git-scm.com/docs/git-sparse-checkout
- Git documentation: partial-clone - https://git-scm.com/docs/partial-clone
- Git LFS documentation - https://git-lfs.com/
- Git LFS migrate manual - https://github.com/git-lfs/git-lfs/blob/main/docs/man/git-lfs-migrate.adoc
- Local Git CLI help from Git 2.43.0 for `git maintenance`, `git clone`, `git fetch`, `git commit-graph`, `git repack`, `git fsck`, and `git update-index`.

## Issues Found
- `git maintenance run --task=gc --dry-run` was invalid because `git maintenance run` does not support `--dry-run`. Changed it to `git maintenance run --auto`, which checks whether automatic maintenance is needed and runs it when appropriate.
- The maintenance schedule comments incorrectly listed daily `gc` and weekly repack for the incremental maintenance strategy. Updated the comments to match Git's documented incremental strategy: hourly prefetch and commit-graph, daily loose-object cleanup and incremental repack, and weekly pack-refs.
- The partial clone offline-work example said `git fetch --filter=blob:none origin` prefetched blobs, but that command preserves blobless fetching. Updated the comments to explain that it fetches commits while keeping the blobless filter, and selected-path blobs are fetched on demand.
- The sparse checkout pattern example used non-cone patterns without enabling non-cone mode. Added `--no-cone`.
- The manual sparse-checkout file example used `git sparse-checkout set --no-cone` with no patterns. Changed it to `git sparse-checkout init --no-cone`, followed by writing `.git/info/sparse-checkout` and applying it with `git read-tree -mu HEAD`.
- The Watchman fsmonitor example set `core.fsmonitor` to `watchman`, which is not a valid hook path. Updated the example to configure a Watchman-compatible fsmonitor hook path.
- The repository config example set `index.skipHash = false` while describing it as skipping an expensive check. Changed it to `true`, which matches Git's documented performance behavior.
- The server-side bitmap config used deprecated `pack.writeBitmaps`. Changed it to the documented replacement, `repack.writeBitmaps`.

## Review Notes
- `git gc --prune=now` is valid, but Git's documentation warns that it can increase corruption risk if another process is writing to the repository concurrently.
- `index.skipHash=true` can improve index write performance, but Git documentation notes compatibility caveats for older Git versions and older `git fsck` behavior.
- Git LFS was not installed in the local environment, so Git LFS commands were verified against official Git LFS documentation rather than local CLI help.
