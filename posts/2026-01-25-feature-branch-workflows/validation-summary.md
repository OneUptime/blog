# Validation Summary: How to Implement Feature Branch Workflows

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Git branching, rebasing, merging, pushing, and ref inspection
- GitHub pull requests and branch protection rules
- GitHub Actions workflow syntax
- GitHub CLI
- actions/github-script and GitHub REST API usage
- TypeScript / React feature flag example

## Sources Consulted
- Git documentation for `push`, including `--force-with-lease`: https://git-scm.com/docs/git-push
- Local Git 2.43.0 command help for `push`, `merge`, `rebase`, and `for-each-ref`
- GitHub CLI 2.45.0 command help for `gh api` and `gh pr create`
- GitHub Actions workflow syntax documentation: https://docs.github.com/actions/using-workflows/workflow-syntax-for-github-actions
- GitHub REST API documentation for branch protection: https://docs.github.com/en/rest/branches/branch-protection
- GitHub protected branches documentation: https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches
- GitHub pull request template documentation: https://docs.github.com/en/communities/using-templates-to-encourage-useful-issues-and-pull-requests/creating-a-pull-request-template-for-your-repository
- GitHub documentation for deleting and restoring pull request branches: https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-branches-in-your-repository/deleting-and-restoring-branches-in-a-pull-request
- actions/github-script documentation: https://github.com/actions/github-script

## Issues Found
- The branch-name validation regex rejected release branch examples such as `release/1.2.0` because it only allowed lowercase letters, digits, and hyphens after the slash. Updated the regex to allow dots after the first character.
- The "Update Stale Branches" workflow said it selected feature branches older than 3 days, but the script did not check branch age. Added a cutoff timestamp and skipped branches newer than 3 days.
- The GitHub CLI branch protection example passed nested JSON as string values to `gh api --field`. Replaced those arguments with GitHub CLI nested field syntax and added `required_linear_history=true` so the command matches the listed protection rules.
- The feature flag example used JSX while the file comment said `flags.ts`. Updated the path comment to `flags.tsx`.
- The cleanup workflow only protected a branch literally named `release`, not `release/*` branches, and could attempt to delete a same-named branch in the base repository for pull requests from forks. Updated the example to skip fork branches and protect `release/` prefixes.

## Review Notes
The Git commands and GitHub Actions snippets are broadly correct for current GitHub-hosted Linux runners. The stale-branch age examples use GNU `date -d`, which works on `ubuntu-latest` but is not portable to macOS without adjustment.
