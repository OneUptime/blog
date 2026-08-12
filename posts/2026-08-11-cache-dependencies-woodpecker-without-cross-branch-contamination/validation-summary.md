# Validation Summary: Cache Dependencies in Woodpecker Without Cross-Branch Contamination

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- Woodpecker CI
- Docker bind mounts and named volumes
- Kubernetes persistent volume claims
- POSIX shell and SHA-256 cache keys
- npm 11 and Node.js 24
- Apache Maven 3.9, Maven Resolver, and Eclipse Temurin JDK 25
- Go 1.26 modules, workspaces, module cache, and build cache

## Sources Consulted

- [Woodpecker environment variables](https://woodpecker-ci.org/docs/usage/environment)
- [Woodpecker 3.17.0 agent environment injection](https://github.com/woodpecker-ci/woodpecker/blob/v3.17.0/agent/runner.go#L161-L169)
- [Woodpecker volumes](https://woodpecker-ci.org/docs/usage/volumes)
- [Woodpecker Kubernetes backend volumes](https://woodpecker-ci.org/docs/administration/configuration/backends/kubernetes#volumes)
- [Woodpecker workflow workspaces and concurrency](https://woodpecker-ci.org/docs/usage/workflows#concurrency)
- [Woodpecker project settings](https://woodpecker-ci.org/docs/usage/project-settings)
- [Woodpecker Docker backend image cleanup](https://woodpecker-ci.org/docs/administration/configuration/backends/docker#image-cleanup)
- [Woodpecker 3.14.0 release notes](https://github.com/woodpecker-ci/woodpecker/releases/tag/v3.14.0)
- [Docker volumes](https://docs.docker.com/engine/storage/volumes/)
- [npm `ci`](https://docs.npmjs.com/cli/v11/commands/npm-ci/)
- [npm cache](https://docs.npmjs.com/cli/v11/commands/npm-cache/)
- [npm `prefer-offline` configuration](https://docs.npmjs.com/cli/v11/using-npm/config/#prefer-offline)
- [npm package-lock files](https://docs.npmjs.com/cli/v11/configuring-npm/package-lock-json/)
- [Maven settings reference](https://maven.apache.org/settings.html)
- [Maven Resolver local repository documentation](https://maven.apache.org/resolver/local-repository.html)
- [Maven Resolver named locks](https://maven.apache.org/resolver/maven-resolver-named-locks/)
- [Maven Resolver checksum documentation](https://maven.apache.org/resolver/about-checksums.html)
- [Maven Resolver trusted checksums](https://maven.apache.org/resolver/expected-checksums.html)
- [Go module reference](https://go.dev/ref/mod)
- [Go command build and test caching](https://pkg.go.dev/cmd/go#hdr-Build_and_test_caching)
- [Go 1.25 release notes](https://go.dev/doc/go1.25)
- [Go 1.26 release notes](https://go.dev/doc/go1.26)
- [Official Node.js container image](https://hub.docker.com/_/node/)
- [Official Maven container image](https://hub.docker.com/_/maven/)
- [Official Go container image](https://hub.docker.com/_/golang/)
- [Official Alpine container image](https://hub.docker.com/_/alpine/)

## Issues Found

- **Repository-key collisions across forges:** `CI_REPO` contains only the repository owner and name, so repositories with the same owner/name on different forge instances can collide when a Woodpecker installation uses multiple forges and its agents share cache storage. The post now includes `CI_FORGE_URL` in every cache-key expression and describes the key as including both forge and repository identity.
- **Overstated Go cache recovery:** `go mod verify` detects changed cached module content and exits unsuccessfully, but it does not itself repair the cache or perform scoped recovery. The post now distinguishes npm's possible automatic refetch from Go's verification failure and gives the separate manual recovery action: delete only the affected namespace and retry from a cold cache.

## Review Notes

- All four Woodpecker YAML examples parse successfully, and all three shell examples pass `/bin/sh -n` syntax validation.
- The documented `CI_COMMIT_BRANCH` and `CI_COMMIT_REF` pull-request behavior is accurate: the former is the target branch, while the latter is the execution ref and is suitable for strict PR/ref isolation.
- The npm, Maven, and Go cache behavior, integrity limitations, concurrency cautions, and commands are consistent with the cited official documentation.
- The container tags shown are available as of the validation date. They are version tags rather than immutable digest pins, so their patch-level contents can change over time.
