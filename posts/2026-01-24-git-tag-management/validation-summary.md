# Validation Summary: How to Handle Git Tag Management

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Git tags
- Git remotes and fetch/push behavior
- Semantic versioning
- GitHub Actions
- GitHub CLI

## Sources Consulted
- Git tag documentation: https://git-scm.com/docs/git-tag
- Git push documentation: https://git-scm.com/docs/git-push
- Git fetch documentation: https://git-scm.com/docs/git-fetch
- Git describe documentation: https://git-scm.com/docs/git-describe
- Pro Git book, Git Basics - Tagging: https://git-scm.com/book/en/v2/Git-Basics-Tagging
- GitHub Actions workflow syntax: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- GitHub CLI `gh release create` manual: https://cli.github.com/manual/gh_release_create
- Local Git CLI help from Git 2.43.0 for `git tag`, `git push`, `git fetch`, and `git describe`

## Issues Found
- The `git push origin --follow-tags` comment said it pushes only annotated tags. Git's `--follow-tags` pushes the refs that would otherwise be pushed plus missing annotated tags reachable from those pushed refs. Updated the comment to avoid implying it only pushes tags.
- The post used `git rev-parse v1.0.0` to show the commit a tag points to. For annotated tags, that can return the tag object's ID rather than the tagged commit. Replaced it with `git rev-list -n 1 v1.0.0`, which resolves to the commit for normal release tags.
- The tag sync section used `git fetch --tags --prune` for pruning deleted tags. Git documentation states that `--tags` alone does not subject tags to pruning when used with `--prune`; `--prune --prune-tags` is the intended form. Updated the command.
- The `git describe` comments called the result the "most recent tag." `git describe` reports the most recent reachable tag from the target commit, not necessarily the newest tag in the repository. Updated the comments to say "reachable tag."

## Review Notes
The remaining commands and examples are technically valid for current Git usage. The version-increment shell snippet is intentionally simple and works for plain `vMAJOR.MINOR.PATCH` tags, but it is not a full semantic-version parser for pre-release or build metadata.
