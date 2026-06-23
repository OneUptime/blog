# Validation Summary: How to Cache Dependencies in GitHub Actions

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- GitHub Actions (`actions/cache`, `actions/checkout`, `actions/setup-node`, `actions/setup-python`, `actions/setup-go`, `actions/setup-java`)
- npm caching
- pip / Python virtualenv caching
- Go module caching
- Maven and Gradle caching
- Docker layer caching (`docker/setup-buildx-action`, `docker/build-push-action`)
- GitHub Actions cache keys, restore-keys, and cache limits

## Sources Consulted
- actions/cache repository README — https://github.com/actions/cache
- GitHub Docs: Caching dependencies to speed up workflows — https://docs.github.com/en/actions/writing-workflows/choosing-what-your-workflow-does/caching-dependencies-to-speed-up-workflows
- GitHub Docs: Dependency caching reference — https://docs.github.com/en/actions/reference/workflows-and-actions/dependency-caching
- actions/cache PR #1452 "Deprecate `save-always` input" — https://github.com/actions/cache/pull/1452

## Issues Found
1. **Deprecated `save-always` input** (Conditional Caching section). The post showed `save-always: false  # Only save on success` on `actions/cache@v4`. The `save-always` input is deprecated (PR #1452) and slated for removal in the next major version (v5); it never worked as intended because post-step `if` expressions do not support the input context. The accompanying prose ("Save cache only on specific branches") also did not match what the code did. Fixed by removing the deprecated input and clarifying that the cache action already only saves on a successful job by default, then leading into the separate `actions/cache/save@v4` conditional example that follows. No other content changed.

## Review Notes
- Cache limits stated in the post are accurate: 10 GB default per repository, caches not accessed within 7 days are evicted, and oldest caches are removed (by last-access date) when the limit is reached.
- All action versions referenced are current and non-deprecated: `actions/cache@v4`, `actions/checkout@v4`, `actions/setup-node@v4`, `actions/setup-python@v5`, `actions/setup-go@v5`, `actions/setup-java@v4`, `docker/setup-buildx-action@v3`, `docker/build-push-action@v6`.
- The built-in `cache:` options for setup actions (`'npm'`, `'pip'`, `true` for Go, `'maven'`/`'gradle'`) are all valid and correctly described.
- The Docker layer caching example uses the local-cache + move pattern, which is valid. GitHub now also offers `type=gha` cache backend as a more modern alternative, but the example as written is correct — this is an optional future improvement, not an error.
- In "Measuring Cache Effectiveness," `steps.install.outputs.duration` is illustrative pseudo-output; there is no built-in `duration` output, so it only works if the user's `install` step explicitly sets it. The surrounding text frames this as an example, so it is not a factual error, but readers should be aware it requires a custom step output.
