# Validation Summary: How to Configure Git Worktrees

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Git
- Git worktrees
- Git configuration
- GitHub pull request refs
- VS Code multi-root workspaces

## Sources Consulted
- Official Git worktree documentation: https://git-scm.com/docs/git-worktree
- Official Git config documentation: https://git-scm.com/docs/git-config
- Official Git clone documentation: https://git-scm.com/docs/git-clone
- Official Git checkout documentation: https://git-scm.com/docs/git-checkout
- Local Git 2.43.0 CLI help for `git worktree`, `git config`, `git clone`, and `git checkout`

## Issues Found
- The post described every worktree as having its own checked-out branch. Git worktrees can also use a detached HEAD, so the description was updated to say each worktree has its own checked-out branch or detached HEAD.
- The build comparison example created a worktree for `main` directly, which fails if `main` is already checked out in another worktree. The command was changed to `git worktree add --detach ../project-current main` so it can be used for side-by-side build comparison without checking out the same branch twice.
- The worktree-specific configuration example used `git config --worktree` without first enabling `extensions.worktreeConfig`. Git requires this extension for worktree-specific configuration, so the setup command was added.
- The path-exists pitfall suggested `--force` as a solution for an existing path. `git worktree add --force` does not allow creating a worktree over an existing non-empty directory; the guidance was corrected to remove the directory first.

## Review Notes
The remaining commands and examples are consistent with current Git worktree behavior. `git worktree remove --force`, `git worktree lock --reason`, `git worktree prune --dry-run`, `git worktree repair`, bare clone workflows, and PR review refs were verified as valid. The dependency note is correct: each worktree has its own working directory, so installed dependency directories such as `node_modules` are not automatically shared.
