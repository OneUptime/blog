# Validation Summary: How to Handle Monorepo Path Filters in GitHub Actions

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- GitHub Actions workflow syntax
- GitHub Actions path filters and job conditions
- dorny/paths-filter
- Bash and jq
- Turborepo
- Nx

## Sources Consulted
- GitHub Actions workflow syntax: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- dorny/paths-filter README and release information: https://github.com/dorny/paths-filter
- Turborepo running tasks and source-control filtering docs: https://turborepo.dev/docs/crafting-your-repository/running-tasks
- Turborepo run command reference: https://turborepo.dev/docs/reference/run
- Nx affected command docs: https://nx.dev/docs/features/ci-features/affected
- nrwl/nx-set-shas README: https://github.com/nrwl/nx-set-shas

## Issues Found
- Updated `dorny/paths-filter@v3` examples to `dorny/paths-filter@v4` because the action's current documented major release is v4.
- Updated `nrwl/nx-set-shas@v4` to `nrwl/nx-set-shas@v5` because the action's current documented examples and configuration reference use v5.
- Replaced the Turborepo `--filter='...[HEAD^]'` examples with `--affected` and changed checkout depth to `fetch-depth: 0`, matching the current Turborepo guidance for affected package detection in CI.
- Fixed the shared-services Bash/JQ output generation. The previous `printf '%s\n' "${services[@]}" | jq -R . | jq -s -c .` command emits `[""]` for an empty array; the replacement emits a correct empty JSON array with `jq -cn '$ARGS.positional' --args "${services[@]}"`.
- Clarified the required-status-checks section because GitHub documents that workflows skipped by path filters can leave required checks pending. The corrected text recommends job-level conditions with a status job in a workflow that still starts.
- Updated status aggregation examples to treat both `failure` and `cancelled` dependency results as failing states.
- Corrected the basic path-filter explanation to include the workflow file path listed in the `push.paths` example.

## Review Notes
The post is technically relevant and the remaining examples use standard GitHub Actions syntax. Native GitHub Actions `paths` and `paths-ignore` filters operate at workflow trigger time, while `dorny/paths-filter` enables job-level conditional execution after a workflow has started; this distinction is now reflected in the required-checks guidance.
