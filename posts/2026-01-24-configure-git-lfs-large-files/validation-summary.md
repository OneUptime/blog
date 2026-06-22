# Validation Summary: How to Configure Git LFS for Large Files

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Git
- Git LFS
- Git attributes (`.gitattributes`)
- Git LFS repository configuration (`.lfsconfig`)
- Git command-line workflows

## Sources Consulted
- Git LFS official website: https://git-lfs.com/
- Git LFS official repository README and documentation: https://github.com/git-lfs/git-lfs
- GitHub Docs, "Installing Git Large File Storage": https://docs.github.com/en/repositories/working-with-files/managing-large-files/installing-git-large-file-storage
- GitHub Docs, "Configuring Git Large File Storage": https://docs.github.com/en/repositories/working-with-files/managing-large-files/configuring-git-large-file-storage
- GitHub Docs, "About Git Large File Storage": https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-git-large-file-storage
- Git LFS `git-lfs-track(1)` documentation: https://github.com/git-lfs/git-lfs/blob/main/docs/man/git-lfs-track.adoc
- Git LFS `git-lfs-fetch(1)` documentation: https://github.com/git-lfs/git-lfs/blob/main/docs/man/git-lfs-fetch.adoc
- Git LFS `git-lfs-ls-files(1)` documentation: https://github.com/git-lfs/git-lfs/blob/main/docs/man/git-lfs-ls-files.adoc
- Git LFS `git-lfs-config(5)` documentation: https://github.com/git-lfs/git-lfs/blob/main/docs/man/git-lfs-config.adoc
- Git LFS `git-lfs-migrate(1)` manpage: https://manpages.debian.org/unstable/git-lfs/git-lfs-migrate.1.en.html

## Issues Found
- The post stated that `lfs.concurrenttransfers` defaults to 3. Current Git LFS documentation lists the default as 8, so the comment was updated to `default: 8`.
- The post included `git lfs ls-files -s | sort -k1 -h` to check LFS storage usage. `git lfs ls-files -s` prints the object ID first and the size at the end of each line, so sorting on field 1 sorts by object ID rather than size. The command was changed to `git lfs ls-files -s`.
- The tracking examples implied Git LFS can track new files by size pattern. `git lfs track` writes path patterns to `.gitattributes`; size-based migration is handled by `git lfs migrate import --above`. The comment was updated to clarify that LFS tracking is pattern-based.

## Review Notes
The local environment did not have `git-lfs` installed, so command behavior was verified against official Git LFS documentation and current manpages rather than local CLI output. Installation, tracking, fetch/pull, migration, `.gitattributes`, `.lfsconfig`, and core troubleshooting commands were otherwise consistent with the consulted documentation.
