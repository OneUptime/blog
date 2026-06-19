# Validation Summary: How to Fix 'Push Rejected' Non-Fast-Forward Errors

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Git
- GitHub branch protection
- GitLab protected branches
- Mermaid diagrams

## Sources Consulted
- Git push documentation: https://git-scm.com/docs/git-push
- Git pull documentation: https://git-scm.com/docs/git-pull
- Git config documentation for `pull.rebase`: https://git-scm.com/docs/git-config
- Git reflog documentation: https://git-scm.com/docs/git-reflog
- Local Git 2.43.0 `git push -h`, `git pull -h`, `git reflog -h`, and `git config --help`
- GitHub protected branches documentation: https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches
- GitLab protected branches documentation: https://docs.gitlab.com/user/project/repository/branches/protected/

## Issues Found
- The opening explanation said the non-fast-forward error occurs when the local branch has diverged from the remote branch. Divergence is a common cause, but Git's push rules reject branch updates whenever the remote destination is not an ancestor of the commit being pushed, which also includes a branch that is simply behind. Updated the explanation to describe the ancestor relationship and keep the divergence example.
- The summary said the safe path is always to pull first. That is correct for ordinary collaboration, but not for all cases covered by the post, such as an amended or rebased personal branch where `--force-with-lease` is appropriate. Updated the sentence to scope the pull-first guidance to ordinary collaboration.

## Review Notes
The Git commands and flags used in the post are current and valid. The `--force-with-lease` examples are technically correct, with the usual caveat from Git documentation that its default lease check depends on remote-tracking refs and can be weakened if another tool updates those refs in the background.
