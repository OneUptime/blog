# Validation Summary: How to Fix 'Changes Not Staged for Commit' Issues

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Git
- Git staging area / index
- Git stash
- Git line-ending normalization
- Git file mode tracking
- Git submodules
- `.gitattributes`
- `.gitignore`

## Sources Consulted
- Git `git-add` documentation: https://git-scm.com/docs/git-add
- Git `git-restore` documentation: https://git-scm.com/docs/git-restore
- Git `git-stash` documentation: https://git-scm.com/docs/git-stash
- Git `git-config` documentation: https://git-scm.com/docs/git-config
- Git `gitattributes` documentation: https://git-scm.com/docs/gitattributes
- Git `git-diff` documentation: https://git-scm.com/docs/git-diff
- Local Git CLI help output from Git 2.43.0 for `git add`, `git restore`, `git stash`, `git config`, and `git submodule`

## Issues Found
- The line-ending remediation command used `git rm --cached -r .` followed by `git reset --hard`. Git documents `git add --renormalize .` as the intended command after changing `core.autocrlf` or `text` attributes, so the post now uses `git add --renormalize .`.
- The comment for `git diff --cached` said "See what would be staged". This command shows changes that are already staged, so the comment now says "See what is staged".

## Review Notes
The remaining Git commands and explanations are consistent with current Git documentation. The examples use modern `git restore` syntax while still noting older `git checkout -- <file>` syntax where appropriate.
