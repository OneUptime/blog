# GitHub Actions Says “Cache Restored” but `cache-hit` Is False: Exact Keys vs `restore-keys`

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GitHub Action, CI/CD, Caching, Build Cache, Troubleshooting

Description: Distinguish exact GitHub Actions cache hits from fallback restores, inspect matched keys, and keep dependency installation correct after either result.

---

A workflow can download and unpack a cache successfully while reporting `cache-hit: 'false'`. Those observations describe different things: files were restored, but the selected cache did not exactly match the requested primary key. A fallback cache can still save substantial download time.

Treat the output as an exact-match indicator, not a general “files exist” flag. The distinction matters whenever a workflow skips installation or compilation after restoring a cache.

## Interpret the Three Outcomes

GitHub Actions expressions expose the cache action's `cache-hit` output as a string. An exact match produces `'true'`; both a restored non-exact match and a complete miss produce `'false'`. The robust condition for work required after anything other than an exact hit is `!= 'true'`, which also remains safe if the output is unavailable. [Cache action outputs](https://github.com/actions/cache#outputs).

| Requested primary key | Selected cache | Meaning |
| --- | --- | --- |
| `npm-v3-linux-abc123` | `npm-v3-linux-abc123` | Exact hit |
| `npm-v3-linux-abc123` | `npm-v3-linux-def456` | Fallback restored |
| `npm-v3-linux-abc123` | None | Cold or unavailable cache |

GitHub also matches the cache's version and applies branch access rules. Therefore, seeing the same visible key in another job does not prove that the current job can restore it. Cache paths and compression metadata contribute to the version. [Dependency caching reference](https://docs.github.com/en/actions/reference/workflows-and-actions/dependency-caching).

## Log the Requested and Matched Keys

Use the standalone restore action when you need clear diagnostics. This example caches npm's package download store; it does not cache an installed `node_modules` tree.

```yaml
name: Dependency cache diagnostics
on: [push, pull_request]
permissions:
  contents: read
jobs:
  test:
    runs-on: ubuntu-24.04
    steps:
      - uses: actions/checkout@v6
      - uses: actions/setup-node@v6
        with:
          node-version: '24'
          package-manager-cache: false
      - name: Check dependency inputs
        run: test -s package-lock.json
      - uses: actions/cache/restore@v6
        id: deps
        with:
          path: ~/.npm
          key: npm-v3-${{ runner.os }}-${{ runner.arch }}-${{ hashFiles('package-lock.json') }}
          restore-keys: |
            npm-v3-${{ runner.os }}-${{ runner.arch }}-
      - name: Report cache selection
        env:
          EXACT: ${{ steps.deps.outputs.cache-hit }}
          REQUESTED: ${{ steps.deps.outputs.cache-primary-key }}
          RESTORED: ${{ steps.deps.outputs.cache-matched-key }}
        run: |
          printf 'exact=%s\nrequested=%s\nrestored=%s\n' \
            "$EXACT" "$REQUESTED" "$RESTORED"
      - run: npm ci
      - run: npm test
      - uses: actions/cache/save@v6
        if: github.event_name == 'push' && github.ref == 'refs/heads/main' && steps.deps.outputs.cache-hit != 'true'
        with:
          path: ~/.npm
          key: ${{ steps.deps.outputs.cache-primary-key }}
```

Replace `main` if the trusted branch has a different name. The separate save is restricted to successful trusted-branch runs, and uses the primary key rather than the stale matched key. The restore action exposes those two keys separately. [Restore action documentation](https://github.com/actions/cache/tree/main/restore).

Disabling setup-node's automatic package cache avoids two actions managing the same directory. Pin production actions to reviewed commit SHAs under your normal dependency update process; major versions here keep the example readable.

## Keep Installation Separate from Download Reuse

An exact hit on `~/.npm` does not mean dependencies are installed. A fresh runner still needs `npm ci` to construct its dependency tree and execute the required installation behavior. npm documents that `npm ci` requires an existing lockfile, rejects manifest mismatches, and replaces an existing `node_modules` directory. [npm ci](https://docs.npmjs.com/cli/v11/commands/npm-ci/).

For that reason, the example installs on all three outcomes. A partial restore merely supplies previously downloaded packages that npm may reuse. It never authorizes keeping arbitrary older installed packages.

Caching build outputs is a different design. Skipping a build would require a key covering every relevant input, complete declared outputs, compatible toolchains, and a trusted producer. The fact that an archive restored successfully establishes none of those properties.

## Explain Unexpected Fallbacks

Start with a single affected job and compare its requested key with the last successful producer. Common explanations are a changed lockfile, changed operating system or architecture, altered cache path, or a cache saved on a ref that the consumer cannot access.

Check that `hashFiles` found the intended lockfile after checkout. An incorrect pattern can collapse many builds onto an unexpectedly broad key. The explicit file check in the example turns a missing lockfile into a visible failure before caching starts.

Also distinguish cache export from cache restore. The previous job may have restored a fallback, completed its installation, and then failed its tests. In that case a success-gated save never published the new primary key. A later job restoring the same fallback is consistent with that history.

## Verify with a Small Change Matrix

Use a temporary branch to observe four cases: a cold key, an identical rerun, a legitimate lockfile update, and a rerun after that update has been saved by the authorized producer. Record requested key, matched key, installation duration, and final dependency versions.

The lockfile update should never allow an older installed dependency tree to bypass installation. The second run after a saved update should show an exact match. This checks both performance behavior and the more important property: cache selection cannot change dependency correctness.

## References

- [GitHub cache action](https://github.com/actions/cache)
- [GitHub dependency caching](https://docs.github.com/en/actions/reference/workflows-and-actions/dependency-caching)
- [Standalone restore action](https://github.com/actions/cache/tree/main/restore)
- [npm ci reference](https://docs.npmjs.com/cli/v11/commands/npm-ci/)
