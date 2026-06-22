# Validation Summary: How to Handle Git Blame Effectively

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Git
- git blame
- git log
- Git configuration
- Shell scripting for Git reports

## Sources Consulted
- Git `git-blame` documentation: https://git-scm.com/docs/git-blame
- Git `git-log` documentation: https://git-scm.com/docs/git-log
- Git `git-config` documentation for `blame.ignoreRevsFile`: https://git-scm.com/docs/git-config
- Local Git 2.43.0 man pages and command help output for `git blame`, `git log`, and `git config`

## Issues Found
- The post described `git blame -c` as showing commit messages for each line. Git documents `-c` as using the same output mode as `git annotate`, so the description and alias comment were corrected.
- The post described `git blame --porcelain` as suppressing the author name. Git documents `--porcelain` as machine-readable output, so the description was corrected.
- The post described `-M` and `-C` as ignoring moved or copied lines and summarized `-C -C -C` as following renames. Git documents these options as detecting moved or copied lines for blame attribution, while whole-file rename following is automatic, so the wording was corrected.
- The blame statistics script parsed dates from fixed fields in default `git blame` output. That is unreliable when author names contain spaces, so the time-period and oldest-line examples now use `--line-porcelain` metadata.

## Review Notes
The remaining commands and claims are consistent with Git documentation. `--ignore-revs-file` and `blame.ignoreRevsFile` are available in Git 2.23 and later, and the documented empty `--ignore-revs-file=""` form correctly clears previously configured ignored revisions.
