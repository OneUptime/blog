# Validation Summary: How to Fix 'Loose Object Is Corrupt' Errors

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Git object database
- Git repository integrity checks
- Git fetch and object recovery
- Git plumbing commands
- Shell scripting

## Sources Consulted
- Git `git-fsck` documentation: https://git-scm.com/docs/git-fsck
- Git `git-fetch` documentation: https://git-scm.com/docs/git-fetch
- Git `git-config` documentation: https://git-scm.com/docs/git-config
- Git `git-hash-object` documentation: https://git-scm.com/docs/git-hash-object
- Git `git-unpack-objects` documentation: https://git-scm.com/docs/git-unpack-objects
- Git `git-read-tree` documentation: https://git-scm.com/docs/git-read-tree
- Local Git CLI help from Git 2.43.0

## Issues Found
- The `git fsck --full` comment called it a "filesystem check"; changed it to "repository integrity check" because `git fsck` verifies Git object connectivity and validity, not the host filesystem.
- The loose-object scanning command used `find .git/objects -type f`, which also includes pack and info files that are not loose objects. Narrowed it to the two-level loose-object layout and skipped `pack` and `info`.
- The clone/transplant section said it saved "local-only branches" but the command omitted the current branch and did not distinguish local-only branches. Changed it to accurately save local branch names with `git for-each-ref`.
- The blob recovery example suggested `git checkout HEAD -- .`, which cannot restore a blob if Git's only copy of that blob is corrupt. Replaced it with `git add` / `git hash-object -w` from known-good working-tree content.
- The pack recovery example unpacked pack files from the same repository and moved the corrupt loose object afterward. Git documentation states `git unpack-objects` does not unpack objects that already exist, and unpacking a pack already in the target repository will unpack nothing. Changed the order to move the corrupt loose object first and clarified that the pack should come from a good copy.
- The corrupt-commit example tried to derive parent and tree hashes from a corrupt commit object. Updated it to require known tree and parent hashes before creating a replacement commit.
- The prevention section described `core.compression 9` as more robust. Git documents this as a speed/size compression tradeoff, not a corruption-prevention setting, so the wording now states that explicitly.
- The filesystem protection section recommended deprecated `core.fsyncObjectFiles`. Replaced it with current `core.fsync committed`.
- The pre-commit hook used `git fsck --connectivity-only`, which official documentation notes does not detect blob corruption. Changed it to `git fsck --quiet`.
- The automated repair script parsed corrupt object IDs with a PCRE expression that could include quotes from common `git fsck` output. Replaced it with line-specific hash extraction and changed the final verification to fail on any nonzero `git fsck --full` result, not only output containing the word "corrupt".

## Review Notes
The guide is technically relevant and generally sound after the corrections. Some recovery steps remain inherently situational because corrupted Git object stores can fail differently depending on whether the object is loose, packed, reachable from refs, available from remotes, or present in backups.
