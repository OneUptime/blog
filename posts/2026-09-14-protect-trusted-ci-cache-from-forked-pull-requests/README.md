# How to Keep Forked Pull Requests from Poisoning a Trusted CI Build Cache

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GitHub Action, Security, CI/CD, Build Cache, Caching

Description: Separate trusted cache producers from forked pull requests using explicit cache access, safe workflow triggers, and enforced remote-cache permissions.

---

A build cache can contain executable files, generated code, compiler outputs, and package lifecycle scripts. A release job that trusts those files also trusts whoever could write them. Cache poisoning is therefore a producer-authorization problem as much as a key-design problem.

GitHub's built-in cache already has branch scope restrictions. A normal `pull_request` cache is scoped to its merge ref and cannot overwrite the default branch's scope. The dangerous paths include privileged workflows executing pull-request code, third-party cache services with shared write credentials, and persistent runners whose disk is shared across trust levels. [GitHub cache access reference](https://docs.github.com/en/actions/reference/workflows-and-actions/dependency-caching).

## Define the Producer Policy First

For an open-source repository, a useful starting policy is:

| Job | Reads trusted cache | Writes trusted cache |
| --- | --- | --- |
| Protected main-branch build | Yes | Yes |
| Fork pull-request tests | Optional | No |
| Release build | Only approved sources | Restricted |
| Untrusted preview build | Isolated cache only | Isolated cache only |

“Trusted” means the workflow definition, checked-out code, dependency installation, and action implementations meet your project's release requirements. A job triggered by a maintainer does not become trusted if it executes arbitrary contributor code while holding a shared write credential.

## Enforce Read-Only Access in the Fork Workflow

Current GitHub Actions supports a workflow or job-level `cache-mode`. Set it explicitly for jobs that execute contributor code. `read` permits restores and denies saves through scoped cache tokens; `none` disables both directions. This is separate from `permissions`, which controls `GITHUB_TOKEN` permissions. [Cache-mode reference](https://docs.github.com/en/actions/reference/workflows-and-actions/dependency-caching#controlling-cache-access-with-cache-mode).

```yaml
name: Pull request tests
on: pull_request
permissions:
  contents: read
cache-mode: read
jobs:
  test:
    runs-on: ubuntu-24.04
    steps:
      - uses: actions/checkout@v6
        with:
          persist-credentials: false
      - uses: actions/setup-node@v6
        with:
          node-version: '24'
          package-manager-cache: false
      - uses: actions/cache/restore@v6
        with:
          path: ~/.npm
          key: public-npm-v2-${{ runner.os }}-${{ runner.arch }}-${{ hashFiles('package-lock.json') }}
          restore-keys: |
            public-npm-v2-${{ runner.os }}-${{ runner.arch }}-
      - run: npm ci
      - run: npm test
```

The cache contains only material you are willing to expose to pull-request authors. The scoped token enforces the effective cache mode for this job. However, a contributor may edit pull-request workflow YAML, including `cache-mode`; a setting in editable YAML is not an immutable repository policy. Even if a normal pull-request run enables writes, GitHub's merge-ref isolation still prevents it from publishing into the default branch's cache scope. A conditional save step alone does not provide that isolation.

Use `cache-mode: none` when this job needs no cache access, but do not treat that line as a confidentiality boundary against authors who can edit the workflow or cause another cache-reading job to run. Keep private material out of cache scopes accessible to fork pull requests; use a separately access-controlled service or execution boundary for private dependencies. For GitHub Enterprise installations, verify support against the documentation for your deployed server version before adopting new workflow syntax.

## Populate the Cache from a Trusted Push

A separate workflow triggered by `push` to the protected default branch can run the same installation and publish with `actions/cache`. It should use the same compatible key format, and have explicit write capability where required by your policy.

Do not place registry tokens, signing material, cloud credentials, or private configuration into the archived directory. Removing those files later does not erase them from an already published archive. Public package download caches and private package download caches may require different readership even when both are safe to execute.

Keep the trusted producer's cache export after successful installation and verification. Avoid copying contributor-produced build artifacts into that workflow and then saving them under the trusted namespace.

## Avoid Privileged Trigger Shortcuts

GitHub's secure-use guidance warns against checking out and executing untrusted code in `pull_request_target` and `workflow_run` workflows. Their context and permissions differ from ordinary pull-request tests, and uploaded artifacts also require scrutiny. [Secure use of GitHub Actions](https://docs.github.com/en/actions/reference/security/secure-use).

Current low-trust trigger defaults reduce some cache-write exposure, but explicitly requesting write access can restore that risk. Treat the complete chain as the unit of review: trigger, checkout ref, scripts, downloaded artifacts, runtime credentials, and cache readers.

Actions themselves are code. Pin security-sensitive workflows to reviewed full commit SHAs and review changes to workflow definitions and lockfiles. Major action versions in the example are readability shorthand, not immutable references.

## Extend the Boundary to External Caches and Runners

`cache-mode` governs GitHub Actions cache access; it does not configure a registry, Bazel cache, Nx service, or shared filesystem. Enforce reader and writer permissions at those services. A prefix such as `trusted-` is just a string if an untrusted credential may write any prefix.

Likewise, a self-hosted machine can retain modified tools, Docker state, or workspace files outside the configured archive. Use isolated disposable execution environments for untrusted code, and avoid sharing a privileged builder daemon across the boundary.

## Verify from Both Sides

Test a fork pull request that attempts a harmless cache save and confirm it cannot publish trusted state. Check the effective cache mode and restore source. Then run the trusted producer and verify a fresh trusted consumer receives its archive.

Also test the absence of a cache. The pull-request build should still install and validate dependencies correctly. A cache access denial should cost performance, not cause maintainers to grant broad write access just to make CI green.

## References

- [GitHub cache access and cache-mode](https://docs.github.com/en/actions/reference/workflows-and-actions/dependency-caching)
- [GitHub secure use reference](https://docs.github.com/en/actions/reference/security/secure-use)
- [Cache restore action](https://github.com/actions/cache/tree/main/restore)
- [Setup-node caching behavior](https://github.com/actions/setup-node)
