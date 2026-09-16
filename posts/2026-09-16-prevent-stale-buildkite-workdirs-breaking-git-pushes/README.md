# How to Prevent Stale Buildkite Working Directories from Breaking Git Pushes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Buildkite, Git, CI/CD, Troubleshooting, Automation

Description: Build Git updates from a fresh branch snapshot in Buildkite and use normal fast-forward pushes to detect concurrent writers.

---

A Buildkite job generates a version file and then fails to push it because the remote branch has moved. On a persistent worker, the same job may also inherit a detached HEAD, old local branches, or configuration left by an earlier build.

Separate the checkout used to test the triggering commit from the checkout used to create a new repository update. Build that update from a fresh remote snapshot, and let a normal push reject conflicting concurrent work.

## Inspect the state you actually have

Before changing anything, run these read-only commands in the failing workspace:

```bash
git status --short --branch
git rev-parse HEAD
git symbolic-ref -q --short HEAD || true
git log -1 --format='%H %s'
```

A detached HEAD is normal for CI systems that test an exact commit. It is not itself repository corruption. The error often comes from a script assuming a local branch exists or assuming its branch tip is still the remote tip.

Compare the job's requested commit with `HEAD`, then inspect the exact push command. `git push origin main` pushes a local branch named `main`, which may be unrelated to the detached commit the job just modified. `HEAD:refs/heads/main` states the source and destination explicitly, but still requires a correctly constructed commit.

## Choose the update contract

There are two different intents. A release job might push a tag referring to the tested commit. A maintenance job might update a generated file on the current default branch. Do not silently switch between these meanings when repairing a push.

For a generated-file update, a fresh clone of the target branch is often the easiest way to eliminate stale local branches and untracked build products. Buildkite normally reuses and cleans a previous checkout; its [agent security guide](https://buildkite.com/docs/agent/self-hosted/security) documents forcing clean checkouts when needed.

A fresh clone for the update is still useful even when the main CI checkout is clean, because the update's correct base can differ from the commit that triggered the build.

## Use an isolated update directory

This example assumes a trusted maintenance job, a writable repository credential supplied outside the URL, and a deterministic generator already installed on the agent:

```bash
#!/usr/bin/env bash
set -euo pipefail

: "${UPDATE_REPOSITORY:?Set the repository URL}"
update_dir=$(mktemp -d)
trap 'rm -rf -- "$update_dir"' EXIT

git clone --single-branch --branch main -- \
  "$UPDATE_REPOSITORY" "$update_dir/repo"
cd "$update_dir/repo"
git config user.name 'Repository Maintenance'
git config user.email 'maintenance@example.com'

/opt/company/bin/update-generated-version
# Limit the commit to the output this automation owns.
git add -- config/generated-version.json
if git diff --cached --quiet; then
  echo 'Generated version is already current'
  exit 0
fi

git commit -m 'Update generated version metadata'
git push origin HEAD:refs/heads/main
```

Replace the branch, file, identity, and generator with the repository's actual contract. The temporary directory is created by this script and is the only cleanup target. Repository credentials should come from an approved credential helper or SSH setup, not a token embedded in `UPDATE_REPOSITORY`.

The explicit `git add` prevents unrelated files from entering the commit. A no-change generation exits successfully, so retrying the job does not create meaningless commits.

## Treat rejection as concurrency evidence

A normal push fails if another writer moved `main` to an incompatible tip. Git's [push documentation](https://git-scm.com/docs/git-push) explains fast-forward checks and refspecs. Do not replace the command with `--force` to make the automation pass.

For deterministic generated output, retry by starting from a new remote snapshot and rerunning the generator. Use a bounded retry count and report persistent contention. Blindly rebasing an old generated file can preserve a value computed from outdated inputs.

If the output requires human interpretation, open a pull request instead of retrying automatically. Branch protection may intentionally prohibit direct pushes, in which case a fresh checkout cannot solve the authorization failure.

## Serialize the automation where useful

Buildkite concurrency can prevent multiple copies of your maintenance step from running together:

```yaml
steps:
  - label: "Update generated metadata"
    command: "bash .buildkite/scripts/update-metadata.sh"
    concurrency: 1
    concurrency_group: "repository/main/generated-metadata"
```

Use the same group for every Buildkite step that owns this update. The [concurrency guide](https://buildkite.com/docs/pipelines/configure/workflows/controlling-concurrency) describes the scope and behavior.

This does not lock GitHub, Bitbucket, a developer's laptop, or another CI system. Keep the normal push check even when Buildkite serialization is enabled. Also avoid making a serialized job wait for another job that needs the same concurrency slot.

## Keep checkout repair scoped

A broad `git clean -ffdx` can delete valuable local build products and still leave the wrong branch-push logic unchanged. Agent-wide forced cleaning may be appropriate for isolation, but it should be a deliberate fleet policy, not an incident command run against every workspace.

Git's [clone reference](https://git-scm.com/docs/git-clone) provides the fresh-clone behavior used above. Diagnose stale state with read-only commands, then repair only the update workflow that needs a different base.

Test the script with no changes, one generated change, and a simulated concurrent remote commit. The desired result is a clean no-op, one precise commit, or a visible push rejection followed by an intentional recovery path.
