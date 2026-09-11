# Validation Summary: Why Buildkite Git Clone Flags Are Ignored

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Buildkite Pipelines and self-hosted agents (v3.134.0 and v4)
- Git cloning, fetching, shallow history, and references
- Bash lifecycle hooks and environment variables
- YAML pipeline configuration and agent configuration files

## Sources Consulted
- [Buildkite Git checkout guide](https://buildkite.com/docs/pipelines/configure/git-checkout): override modes, native checkout.depth, restricted attributes, and no-command-eval behavior.
- [Buildkite agent configuration](https://buildkite.com/docs/agent/self-hosted/configure): configuration keys, environment equivalents, strict-mode hook restrictions, and skipping fetches for existing commits.
- [Buildkite environment variables](https://buildkite.com/docs/pipelines/configure/environment-variables): clone/fetch flag overrides and supported hook phases.
- [Buildkite agent hooks](https://buildkite.com/docs/agent/hooks): hook scope, timing, non-vendored plugins, scriptwrapper environment capture, and return versus exit.
- [Buildkite agent v3.134.0 release](https://github.com/buildkite/agent/releases/tag/v3.134.0): introduction of checkout-override-mode.
- [Buildkite command-line reference](https://buildkite.com/docs/agent/cli/reference).
- [Git command reference](https://git-scm.com/docs/git): version option and Git environment handling.
- [git-clone](https://git-scm.com/docs/git-clone): verbose and depth flags, single-branch implication, and shallow history.
- [git-fetch](https://git-scm.com/docs/git-fetch): verbose, prune, depth, and shallow-fetch tag limitations.
- [git-rev-parse](https://git-scm.com/docs/git-rev-parse): shallow-repository inspection.
- [git-log](https://git-scm.com/docs/git-log): oneline output and commit limits.
- [git-show-ref](https://git-scm.com/docs/git-show-ref): branch/tag filtering and deprecated heads alias.

## Issues Found
1. The hook example lacked a strict-mode caveat. Clarified that flag overrides from environment/pre-checkout hooks work in from-job or none mode; strict mode also blocks hook overrides, as documented in the agent configuration reference.
2. The reused-checkout explanation implied that a fetch always occurs. Qualified it to account for the agent option that skips fetching when the requested commit already exists locally.
3. The test-script explanation implied that exporting Buildkite flag variables could automatically affect later Git commands. Clarified that Git does not interpret these Buildkite-specific variables; a script must explicitly pass flags to its Git commands.
4. The diagnostic command used git show-ref --heads, which current Git documentation marks as deprecated. Replaced it with the supported --branches spelling while preserving --tags.

## Review Notes
- Confirmed the three override modes, default from-job behavior, v3.134.0 introduction, agent configuration syntax, and native checkout.depth example against official documentation.
- Clone and fetch flag examples are valid. Depth is a history limit, and shallow cloning implies single-branch behavior unless overridden. The existing warnings about required refs, tags, and merge bases remain appropriate.
- The reference-listing command shows local branches and tags, not remote-tracking branches. The post separately instructs readers to verify required base refs and merge bases.
- Hook placement and return guidance are correct for the illustrated shell job hooks. Kubernetes jobs run checkout and command hooks in separate containers, so hook exports do not necessarily propagate between those containers.
- Checked all four documentation links in the post; each resolves to the intended official resource. The author profile link is attribution rather than technical evidence.
- Bash snippets passed bash -n syntax checks. This was a documentation and static syntax review; no live Buildkite job, agent restart, or fresh/reused worker checkout was performed. The test script path is an illustrative repository-specific prerequisite.
