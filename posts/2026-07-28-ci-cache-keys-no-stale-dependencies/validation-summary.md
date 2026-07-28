# Validation Summary: How to Design CI Cache Keys That Speed Builds Without Restoring Stale Dependencies

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- GitHub Actions
- `actions/cache`
- GitLab CI/CD
- npm and `npm ci`
- Dependency lockfiles
- Docker BuildKit cache
- Compiler object caches
- Build-system task and remote caches

## Sources Consulted

- [GitHub Actions dependency caching reference](https://docs.github.com/en/actions/reference/workflows-and-actions/dependency-caching)
- [GitHub Actions dependency caching concepts](https://docs.github.com/en/actions/concepts/workflows-and-actions/dependency-caching)
- [GitHub Actions contexts reference](https://docs.github.com/en/actions/reference/workflows-and-actions/contexts)
- [GitHub Actions expression reference](https://docs.github.com/en/actions/reference/workflows-and-actions/expressions)
- [`actions/cache` official repository](https://github.com/actions/cache)
- [GitLab CI/CD caching](https://docs.gitlab.com/ci/caching/)
- [GitLab CI/CD caching examples](https://docs.gitlab.com/ci/caching/examples/)
- [GitLab CI/CD YAML syntax reference](https://docs.gitlab.com/ci/yaml/#cachekeyfiles)
- [`npm ci` documentation](https://docs.npmjs.com/cli/commands/npm-ci/)
- [`npm cache` documentation](https://docs.npmjs.com/cli/commands/npm-cache/)
- [`package-lock.json` documentation](https://docs.npmjs.com/cli/configuring-npm/package-lock-json/)
- [Docker cache storage backends](https://docs.docker.com/build/cache/backends/)
- [Docker build cache invalidation](https://docs.docker.com/build/cache/invalidation/)
- [Bazel remote caching](https://bazel.build/remote/caching)
- [ccache manual](https://ccache.dev/manual/latest.html)

## Issues Found

- The cache-security paragraph said that cache scope was not a security boundary and that restored content was not signed or verified. GitHub does enforce cache access scopes and low-trust write restrictions, while its documented consumer guarantee is that readable cache content is restored as-is and must be treated as untrusted input. The paragraph now says not to treat cache scope as a secrets boundary and uses GitHub's documented restored-as-is model without making an unsupported cryptographic claim.

## Review Notes

- `actions/cache@v5` is available, but the post's `actions/cache@v4` example remains supported and is still used in GitHub's dependency-caching reference. Version 5 requires Actions Runner 2.327.1 or later on self-hosted runners.
- GitLab's `cache:key:files` supports at most two file paths or patterns. The example uses one file and is valid; jobs that must incorporate more inputs need a composed key strategy.
- The npm example caches the project-local `.npm/` download cache, not `node_modules`, and correctly runs `npm ci` afterward.
