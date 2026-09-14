# Why a GitHub Actions Cache Never Updates Under the Same Key—and How to Version It Safely

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GitHub Action, Caching, CI/CD, Build Cache, DevOps

Description: Version immutable GitHub Actions cache entries deliberately, preserve compatible fallback boundaries, and avoid stale exact hits and competing writers.

---

A successful job can add files to its local package cache without changing the archive stored under its existing GitHub Actions key. Cache entries are immutable: saving again under the same key does not replace the previous entry. That behavior prevents a named cache from changing beneath readers, but it surprises teams treating the cache as a synchronized folder. [GitHub cache update guidance](https://github.com/actions/cache/blob/main/tips-and-workarounds.md#update-a-cache).

The fix is to decide what a key represents and publish a new key when that representation changes.

## Separate Compatibility from Freshness

Consider an npm download cache named:

```text
npm-v4-Linux-X64-node24-lock-8bd910
```

Each component has a purpose. `v4` represents your cache layout and policy. The platform components separate environments. `node24` documents a runtime family. The final value identifies dependency inputs.

A new dependency graph creates a new key. A changed cache directory structure or newly required compatibility boundary creates a new schema version. Neither requires deleting the old cache immediately; compatible readers can continue using it until normal retention removes it.

Do not use one permanent name such as `npm-cache` and expect every successful installation to refresh it. The first completed writer establishes the entry. Later exact hits restore that earlier snapshot. [Cache matching and save behavior](https://docs.github.com/en/actions/reference/workflows-and-actions/dependency-caching).

## Use Immutable Keys for Dependency Snapshots

For a typical repository, this is sufficient:

```yaml
- uses: actions/cache@v6
  with:
    path: ~/.npm
    key: npm-v4-${{ runner.os }}-${{ runner.arch }}-node24-${{ hashFiles('package-lock.json') }}
    restore-keys: |
      npm-v4-${{ runner.os }}-${{ runner.arch }}-node24-
- run: npm ci
```

This is a steps fragment for a checked-out repository with Node 24 already installed. If you use setup-node elsewhere in the job, avoid a second cache for the same directory; on versions that automatically enable npm caching from `package.json`, set `package-manager-cache: false`. The downloaded package store helps installation; an exact hit still does not create `node_modules` on a fresh runner.

Keep the fallback prefix inside the same schema and compatibility boundary. A prefix as broad as `npm-` can accidentally bridge layouts you intentionally separated. A version bump that still restores the previous version defeats the purpose when the old content is incompatible.

When only storage organization changes and old content is safe to migrate, explicitly document that migration and let installation reconcile it. Do not assume compatibility merely because an archive decompresses.

## When Every Successful Run Should Save Growth

A cumulative download store can grow even when the lockfile does not change, for example because different test subsets fetch optional tooling. If measurements show that publishing this growth is useful, use a unique suffix and restore from a stable prefix:

```yaml
- uses: actions/cache@v6
  with:
    path: ~/.npm
    key: npm-v4-${{ runner.os }}-${{ runner.arch }}-node24-${{ hashFiles('package-lock.json') }}-${{ github.run_id }}-${{ github.run_attempt }}
    restore-keys: |
      npm-v4-${{ runner.os }}-${{ runner.arch }}-node24-${{ hashFiles('package-lock.json') }}-
      npm-v4-${{ runner.os }}-${{ runner.arch }}-node24-
- run: npm ci
```

This intentionally creates a new immutable snapshot after each successful eligible job. GitHub searches fallback prefixes and selects a matching cache according to its documented matching rules. [Cache strategies](https://github.com/actions/cache/blob/main/caching-strategies.md).

Unique keys trade more storage and uploads for fresher snapshots. They also mean exact-hit rate will be low by design. Measure restore usefulness and installation time rather than interpreting that metric as failure.

For a matrix, include every dimension that changes the cached contents or assign one designated producer. Two jobs using the same run ID, attempt, and primary key are still competing to publish one entry. Their archives are not merged.

## Avoid Delete-and-Replace Races

Deleting an entry before recreating it can leave consumers with no cache and permits concurrent writers to race for the same name. It also makes troubleshooting harder: “the same key” no longer means “the same historical archive.”

Prefer a new schema or content key for normal changes. Reserve deletion for deliberate cleanup or incident response. If an entry contains incorrect or untrusted data, stop consuming the affected namespace and move trusted producers and consumers together to a clean one.

Use the cache management interface to inspect key, ref, size, creation time, and last access. Those facts often explain why a job restores an old snapshot: the expected producer never saved, saved on another branch, or lost the write race.

## Test the Policy, Not Just the Syntax

Run a producer with a test key, add a recognizable harmless file to the local cached directory, and run again under the same key. A fresh consumer should still see the first snapshot. Then publish under a new versioned key and verify that a fresh consumer sees the new file.

Perform this experiment in a disposable cache namespace, not a production dependency directory. It demonstrates the storage contract independently of package-manager behavior.

For the real workflow, verify a cold build, an exact restore, a dependency change with a compatible fallback, and a schema change that cannot fall back across the boundary. The build should produce the same valid result regardless of cache availability. The cache policy determines how much work is reused; it must not determine which dependencies are accepted.

## References

- [Cache update workaround](https://github.com/actions/cache/blob/main/tips-and-workarounds.md#update-a-cache)
- [Dependency caching reference](https://docs.github.com/en/actions/reference/workflows-and-actions/dependency-caching)
- [Caching strategies](https://github.com/actions/cache/blob/main/caching-strategies.md)
- [npm clean installation](https://docs.npmjs.com/cli/v11/commands/npm-ci/)
