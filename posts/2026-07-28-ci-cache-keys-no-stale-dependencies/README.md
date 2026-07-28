# How to Design CI Cache Keys That Speed Builds Without Restoring Stale Dependencies

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: CI/CD, Build Cache, GitHub Action, GitLab CI, Dependency Management

Description: Build CI cache keys from compatibility and dependency inputs while keeping restored data reconstructible, scoped, and safe to validate.

---

A cache key answers one question: "Under which conditions may these bytes be reused?" A good answer includes every input that makes the cached data incompatible and omits inputs that change without affecting it.

The cache is an optimization. A cache miss must make the build slower, not incorrect. A cache hit must still pass through the package manager or build tool that validates the declared dependency graph.

## Start with the Cached Object

Do not design a key before naming what the cache contains:

| Cached path | Usually keyed by | Main risk |
| --- | --- | --- |
| Package download store | OS, package-manager generation, lockfile hash | unnecessary misses |
| Installed dependencies | OS, architecture, runtime ABI, manager, lockfile | native or lifecycle-script staleness |
| Compiler object cache | compiler identity, flags, source and header inputs | incorrect build output |
| Build-system task cache | tool-defined action digest | undeclared inputs |
| Docker BuildKit cache | Dockerfile, context, build args, platform | overwritten cache scope |

Prefer caching downloads over an installed tree. A frozen install can cheaply link or unpack verified packages from the store while respecting the lockfile. An installed directory may contain native binaries, absolute paths, generated files, or side effects from a different runtime.

## Use a Versioned Key Schema

A practical dependency-cache key has this shape:

```text
<schema>-<os>-<arch>-<runtime>-<manager>-<lock-digest>
```

For GitHub Actions:

```yaml
- name: Cache npm downloads
  uses: actions/cache@v4
  with:
    path: ~/.npm
    key: npm-v3-${{ runner.os }}-${{ runner.arch }}-node22-${{ hashFiles('package-lock.json') }}
    restore-keys: |
      npm-v3-${{ runner.os }}-${{ runner.arch }}-node22-
```

The manual `v3` is a cache-schema version. Increment it when the cached path, configuration, archive expectations, or key logic changes. It provides a clean invalidation switch without deleting caches during an incident.

Include:

- OS and architecture when files can be platform-specific;
- runtime or compiler ABI when it affects cached content;
- package-manager/cache-format generation;
- all lockfiles governing the job;
- relevant configuration files not represented by the lock;
- a manual schema version.

Do not add the commit SHA to a dependency key. It guarantees a miss for every commit even when dependencies are unchanged. Branch names are usually better as fallback scope than as the only correctness input.

## Hash the Resolution Input, Not Just the Manifest

`package.json` may contain ranges; the lockfile records the resolved tree. Hash `package-lock.json`, not only the manifest. In a monorepo, identify which lockfiles and package-manager config govern the task.

GitLab can derive a cache key from files:

```yaml
cache:
  key:
    files:
      - package-lock.json
  paths:
    - .npm/

test:
  script:
    - npm ci --cache .npm --prefer-offline
    - npm test
```

If a global tool version, registry configuration, patch directory, or dependency constraint file changes resolution but is not in the lockfile, add it to the hash. The rule is semantic: hash every file that can change the reusable bytes or their interpretation.

## Keep Fallbacks Conservative

GitHub checks the exact `key`, then prefix matches and `restore-keys` in order. A broad fallback is useful for an append-like download store: an older store still contains packages that can be verified and supplemented. It is dangerous for an installed dependency tree or compiler output that the next command trusts as complete.

Good fallback:

```text
npm-v3-Linux-X64-node22-
```

Risky fallback:

```text
dependencies-
```

The risky version crosses operating systems, runtimes, lockfiles, and cache schemas. If the build cannot safely consume a partial or older cache and repair it, use exact keys only.

GitHub cache entries are immutable: an exact existing key is not updated in place. New contents need a new key. That makes a content-derived key a natural fit.

## Separate Correctness from Freshness

After restoring a cache, still run:

```bash
npm ci
```

The lockfile chooses versions; the cache only supplies bytes. Apply equivalent frozen or locked modes in other ecosystems. If a build skips installation entirely on a cache hit, it has made the cache an undeclared source of truth.

For generated build outputs, let a build tool calculate action keys when possible. Its digest should include source, transitive prerequisites, commands, toolchains, flags, and relevant environment. A hand-written CI key based only on `git rev-parse HEAD` cannot model fine-grained dependencies.

## Treat Restored Caches as Untrusted

Do not treat cache scope as a secrets boundary. GitHub documents that anyone able to open a pull request can read base-branch caches, including from a fork. Any run that can read a cache restores its contents as-is, so restored files are untrusted input that can influence later execution.

Therefore:

- never cache tokens, credentials, private keys, or authenticated config;
- do not execute arbitrary scripts directly from an unverified restored directory;
- give low-trust workflows restore-only behavior where appropriate;
- restrict cache writes to trusted triggers;
- keep release signing and deployment credentials out of build caches;
- validate package integrity with the ecosystem's lock and registry mechanisms.

Also avoid letting untrusted code poison a cache that a privileged workflow later executes. GitHub limits writes for low-trust triggers, but workflow design and third-party cache services still require review.

## Save Only Useful Successful State

The GitHub cache action saves a new cache after a successful job when there was a miss. That protects against many partial uploads. For custom cache logic, apply the same rule: do not publish a dependency tree from a failed or canceled install.

Consider whether multiple jobs race to write the same remote location. A content-addressed or immutable key avoids last-writer ambiguity. Docker cache exporters require distinct locations for separately scoped caches; two writers to the same location can overwrite one another.

## Diagnose the Key with Measurements

Log safe metadata for every lookup:

- final key or a redacted digest;
- exact hit versus prefix fallback;
- cache size and transfer time;
- install or compile time after restore;
- save result and eviction frequency.

Then test four cases:

1. no relevant change: exact hit;
2. source-only change: dependency hit;
3. lockfile change: exact miss, optional compatible fallback;
4. OS/runtime/schema change: no incompatible restore.

If changing a lockfile still produces an exact hit, the key is missing an input. If every source edit misses a dependency cache, the key includes an irrelevant input. If a restore is slower than a clean fetch, shrink or remove the cache.

## A Safe Default

For dependency downloads, begin with:

```text
schema + OS + architecture + runtime family + manager generation + lockfile hash
```

Use one same-platform fallback prefix, run a frozen install afterward, publish from trusted successful jobs, and keep secrets out. Broaden reuse only after tests prove the consumer repairs older content safely. A modest hit rate with clear correctness is better than a spectacular hit rate that occasionally builds yesterday's dependency graph.

## Official Documentation

- [GitHub Actions dependency caching reference](https://docs.github.com/en/actions/reference/workflows-and-actions/dependency-caching)
- [GitHub Actions dependency caching concepts](https://docs.github.com/en/actions/concepts/workflows-and-actions/dependency-caching)
- [GitLab CI/CD caching](https://docs.gitlab.com/ci/caching/)
- [GitLab CI/CD caching examples](https://docs.gitlab.com/ci/caching/examples/)
- [npm ci](https://docs.npmjs.com/cli/commands/npm-ci)
- [Docker cache storage backends](https://docs.docker.com/build/cache/backends/)
