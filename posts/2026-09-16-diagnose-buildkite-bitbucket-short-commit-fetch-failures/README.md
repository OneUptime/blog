# How to Diagnose Buildkite Git Fetch Failures from Short Bitbucket Commit Hashes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Buildkite, Git, Bitbucket, CI/CD, Troubleshooting

Description: Trace abbreviated Bitbucket commit identifiers through Buildkite checkout and resolve immutable full commits before scheduling builds.

---

A Buildkite checkout fails with a message such as `couldn't find remote ref abc1234`, although that prefix identifies a commit in a developer's clone. The prefix may be meaningful to a local object database without being a reference the remote server accepts in a fetch request.

Start by inspecting the commit passed to Buildkite. A full immutable commit ID is a better build input than a shortened display value, especially when workers begin with empty or shallow repositories.

## Compare the build input with the fetch command

Open the failing checkout log and record the repository URL, requested refspec, branch, and commit. Compare `BUILDKITE_COMMIT` with the corresponding webhook payload or API build request.

An abbreviation often enters through custom automation that copies a short value from a UI, formats a commit for a notification, or uses `git rev-parse --short HEAD` when creating the build. Do not conclude that Bitbucket itself necessarily supplied a shortened value; verify the original payload and every transformation between it and Buildkite.

Buildkite's [Bitbucket integration guide](https://buildkite.com/docs/pipelines/source-control/bitbucket) describes the native integration. If a custom bridge is involved, compare its behavior with that supported path before changing Git settings on every agent.

## Understand local resolution versus remote fetching

In a local clone, Git can resolve a unique prefix of an object already present. That does not mean a server must resolve the same prefix as a remote ref. Git's [revision parsing reference](https://git-scm.com/docs/git-rev-parse) explains object-name verification, while the [fetch reference](https://git-scm.com/docs/git-fetch) describes refspecs and fetching full object IDs.

A useful distinction is:

```bash
# Resolves against the objects already present in this clone.
git rev-parse --verify 'abc1234^{commit}'

# Asks the remote to satisfy a fetch request.
git fetch origin abc1234
```

The first succeeding does not prove the second must succeed. Likewise, a warm Buildkite checkout may contain the object while a new worker does not, making the problem appear intermittent.

Even a full hash does not bypass server reachability restrictions or permissions. A deleted branch, a force-pushed commit that is no longer advertised, or the wrong repository can still make an exact commit unavailable.

## Resolve the full commit before scheduling

If the triggering system has a trusted clone containing the intended commit, resolve it there:

```bash
#!/usr/bin/env bash
set -euo pipefail

: "${REQUESTED_COMMIT:?Set the intended revision}"
full_commit=$(git rev-parse --verify --end-of-options \
  "${REQUESTED_COMMIT}^{commit}")
printf '%s\n' "$full_commit"
```

Pass this full value as the Buildkite build request's `commit`. Keep the intended branch as a separate field. For a normal SHA-1 Bitbucket repository the full ID has 40 hexadecimal characters; do not truncate it for transport merely because the UI displays fewer.

The revision must exist locally and be unambiguous. Validate that it belongs to the intended repository and approved ref before using it to trigger privileged work. Resolving a revision is not an authorization check.

If the trigger only has an abbreviation and no clone, resolve it through the repository provider's commit API or fetch an explicit known branch in a controlled helper repository. Reject ambiguity or absence. Avoid silently substituting the branch's current HEAD, which may test newer code than the event that requested the build.

## Diagnose an already-failed build safely

Use a disposable clone with the same repository access and fetch policy as the agent. Fetch the intended branch by its full ref name, then check whether the expected full commit is present:

```bash
git fetch origin refs/heads/main:refs/remotes/origin/main
git cat-file -e 'FULL_COMMIT_ID^{commit}'
git merge-base --is-ancestor FULL_COMMIT_ID refs/remotes/origin/main
```

Replace `main` and `FULL_COMMIT_ID` with the intended values. The last command tests ancestry; it is useful evidence when the build is supposed to represent that branch. Pull-request refs and deliberately detached commits require their own expected relationship.

Do not use `git reset --hard` or a force push as a fetch repair. Neither makes an unavailable object appear, and both can obscure the original evidence.

## Check shallow clones and mirrors

A shallow clone can omit the commit or ancestry needed by the checkout. A stale mirror can hide a difference between a warm and cold worker. Inspect the configured depth and refspec before broadening them.

Buildkite's [Git checkout guide](https://buildkite.com/docs/pipelines/configure/git-checkout) documents current checkout customization. Fix the input first, then adjust fetch breadth only if the intended full commit legitimately requires it. Increasing depth everywhere can add cost without addressing a shortened identifier.

## Verify on a cold worker

Create a new build with the resolved full commit and run it on a worker without the repository's old object cache. Confirm the checked-out `git rev-parse HEAD` matches the requested ID and that the source-control status attaches to that same commit.

Then test the bridge with a deliberately invalid or ambiguous revision. It should reject the request before scheduling CI. This makes commit identity deterministic instead of depending on what objects a particular worker happened to retain.
