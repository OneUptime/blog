# Why Buildkite Git Clone Flags Are Ignored

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Buildkite, CI/CD, Git, DevOps, Troubleshooting

Description: Understand Buildkite agent checkout policy, supported Git flag overrides, hook timing, and the difference between cloning and fetching.

---

Setting `BUILDKITE_GIT_CLONE_FLAGS` in pipeline YAML does not necessarily change the Git command the agent runs. The agent owns checkout policy, and current releases deliberately restrict pipeline overrides of flag-based settings.

There is a second common explanation: a reused checkout runs `git fetch`, not `git clone`. A clone flag cannot affect a command that never executes. Diagnose policy, timing, and the actual checkout operation separately before changing the flags again.

## Inspect the installed agent and checkout log

Start with:

```bash
buildkite-agent --version
git --version
```

Then inspect the job's checkout log. Determine whether it performed a fresh clone, fetched into an existing working copy, used a Git mirror, or ran a custom checkout hook. Record the command and effective flags without enabling logs that expose credentials.

A command job starts after checkout, so printing the variable in `command:` only reveals a later environment value. It does not prove that the same value governed the earlier clone.

Also identify where the agent gets its configuration: a file, service environment, container arguments, or stack-managed settings. Editing a file that the running process does not use cannot change its behavior.

## Understand current checkout override policy

The [Git checkout guide](https://buildkite.com/docs/pipelines/configure/git-checkout) documents `checkout-override-mode`, introduced in agent v3.134.0 and available in v4. The relevant modes are:

| Mode | Effect on pipeline checkout settings |
| --- | --- |
| `from-job` | Default; restricted flag-based values remain agent-controlled |
| `none` | Allows pipeline overrides of all mode-governed checkout attributes |
| `strict` | Keeps all mode-governed checkout attributes agent-controlled |

In default `from-job` mode, pipeline values for `depth`, `flags`, and `commit_verification` are ignored in favor of agent configuration. This includes the corresponding Git flag environment settings. A YAML value can therefore be syntactically valid and still have no effect on checkout.

Older agent releases do not provide this exact three-mode interface. Use the documentation matching the installed release rather than assuming a current option exists everywhere.

## Set an agent-wide clone policy

For a self-hosted agent whose jobs are approved for a shallow checkout, the configuration can include:

```ini
git-clone-flags="-v --depth=50"
git-fetch-flags="-v --prune --depth=50"
```

The [agent configuration reference](https://buildkite.com/docs/agent/self-hosted/configure) documents the `git-clone-flags` setting and its `BUILDKITE_GIT_CLONE_FLAGS` environment equivalent. Use your installation's supported configuration mechanism and restart or replace the agent through its normal lifecycle.

Treat those values as an example policy. A depth of 50 can break tools that require older history, tag-based versioning, merge bases, or comparisons with another branch. Shallow fetches also need a deliberate branch/ref strategy.

Setting both clone and fetch behavior is important for a reusable workspace. Otherwise, the first build and subsequent builds can see different amounts of history. A clone-only optimization often appears to work on a new machine and disappear on the next run.

## Use a supported hook for a scoped change

If a trusted job needs a different clone configuration, the environment-variable reference allows modifying `BUILDKITE_GIT_CLONE_FLAGS` in an `environment` or `pre-checkout` hook:

```bash
#!/usr/bin/env bash
export BUILDKITE_GIT_CLONE_FLAGS='-v --depth=100'
export BUILDKITE_GIT_FETCH_FLAGS='-v --prune --depth=100'
```

Place the hook where it exists before checkout, such as the agent's configured hook directory or an appropriate non-vendored plugin. A repository cannot reliably provide a pre-checkout hook from files that have not yet been checked out.

Keep the hook's decision tied to an explicit, reviewed policy, and use `return` rather than `exit` for an early return from a shell job hook. Hook exports must be captured by the agent's wrapper to reach the next phase.

A `pre-command` hook is too late to alter an already completed checkout. Similarly, exporting flags in the test script affects only future Git commands that the script itself chooses to run.

## Allow pipeline-controlled flags only intentionally

On a dedicated pool where pipeline authors are allowed to control checkout flags, administrators can set:

```ini
checkout-override-mode="none"
```

A pipeline can then request a shallow checkout through the documented native configuration:

```yaml
steps:
  - label: "Tests with limited history"
    checkout:
      depth: 50
    command: "bash .buildkite/scripts/test.sh"
```

This is an agent policy change, not a harmless YAML workaround. Git flags can influence command execution, which is why the default keeps them restricted. Use it only where the pool's trust model permits pipeline authors to control those settings.

Disabling command evaluation forces strict mode, according to the checkout guide. In that configuration, setting the mode to `none` elsewhere does not provide the intended override.

## Verify both fresh and reused checkouts

Run a test build on a fresh worker, then another build that reuses the checkout. Inspect the clone and fetch commands and query the resulting repository:

```bash
git rev-parse --is-shallow-repository
git log --oneline -5
git show-ref --heads --tags
```

For workflows using change detection, verify the required base ref and merge base exist. For release tooling, verify tag discovery and version calculation. Faster checkout is useful only when it preserves the history operations the job needs.

## Conclusion

Git clone flags depend on agent policy, hook timing, and whether checkout actually clones. Configure the owning layer, account for fetches, and verify the resulting repository rather than a variable printed after checkout.

## Official Documentation

- [Git checkout and override modes](https://buildkite.com/docs/pipelines/configure/git-checkout)
- [Agent configuration](https://buildkite.com/docs/agent/self-hosted/configure)
- [Buildkite Git environment variables](https://buildkite.com/docs/pipelines/configure/environment-variables)
- [Agent hook timing](https://buildkite.com/docs/agent/hooks)
