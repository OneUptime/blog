# Validation Summary: How to Handle Git Squash Commits

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Git
- Git interactive rebase
- Git reset
- Git merge
- Git push
- GitHub CLI
- GitLab CLI

## Sources Consulted
- Git rebase documentation: https://git-scm.com/docs/git-rebase
- Git merge documentation: https://git-scm.com/docs/git-merge
- Git reset documentation: https://git-scm.com/docs/git-reset
- Git commit documentation: https://git-scm.com/docs/git-commit
- Git push documentation: https://git-scm.com/docs/git-push
- GitHub CLI `gh pr merge` manual: https://cli.github.com/manual/gh_pr_merge
- GitHub Docs, configuring commit squashing for pull requests: https://docs.github.com/articles/configuring-commit-squashing-for-pull-requests
- GitLab CLI `glab mr merge` documentation: https://docs.gitlab.com/cli/mr/merge/
- GitLab Docs, merge request merge methods: https://docs.gitlab.com/user/project/merge_requests/methods/
- Local command help for `git rebase`, `git merge`, `git reset`, `git commit`, `git push`, and `gh pr merge`

## Issues Found
- The example abbreviated commit IDs used non-hex characters such as `g`, `i`, `z`, `y`, `x`, `w`, and `v`. Git object IDs are hexadecimal, so the examples were updated to plausible hexadecimal abbreviations.
- The opening before/after example showed five feature commits being collapsed into one, while the rest of the post demonstrates squashing the last four commits. Removed the extra example commit so the introductory example matches the tutorial flow.
- The regular merge comparison said `git merge feature-branch` creates a merge commit. Git's default merge behavior allows fast-forward merges, so this was changed to say it may create a merge commit and only shows one when the merge is not fast-forwarded.

## Review Notes
- The Git, GitHub CLI, and GitLab CLI commands reviewed are current and technically valid.
- The advice to squash before review is workflow-dependent. It is not technically incorrect, but some teams prefer reviewing incremental commits and squashing only at merge time.
