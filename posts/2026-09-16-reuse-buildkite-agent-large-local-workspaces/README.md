# How to Reuse a Buildkite Agent for Steps That Need a Large Local Workspace

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Buildkite, CI/CD, Caching, DevOps, Automation

Description: Route dynamically uploaded Buildkite steps to a persistent workspace owner and guard local data against cleanup and agent loss.

---

A build creates hundreds of gigabytes of local data, and the next step needs to inspect it. Uploading and downloading that workspace may be more expensive than the work itself. Keeping the follow-up on the same persistent worker can help, but a normal dependency does not provide that placement guarantee.

Use an explicit ownership tag when uploading the follow-up, store the workspace outside the agent's checkout directory, and design recovery for the worker disappearing. Locality is a performance choice with an availability cost.

## Decide whether separate steps are necessary

The most reliable way to retain local state is to run preparation and consumption in one command job. That keeps process lifetime and cleanup under one owner:

```yaml
steps:
  - label: "Build and test large workspace"
    command: "bash .buildkite/scripts/build-and-test-local.sh"
    agents:
      queue: persistent-builds
```

Use separate jobs only when their visibility, retry behavior, or scheduling needs justify the additional coordination. A `wait` step or `depends_on` orders jobs but does not make their files available on another machine.

Buildkite's [agent targeting guide](https://buildkite.com/docs/agent/cli/reference/start) documents affinity through agent tags and warns about the reliability and utilization tradeoffs.

## Assign a unique workspace owner

Provision each persistent worker process with a unique custom tag, for example `workspace_owner=worker-17`. Keep that value unique across all active agents in the target queue. If several processes share the same tag, any of them may accept the follow-up.

The tag is a placement identifier, not a filesystem lock. If your ownership unit is an entire host, ensure all matching processes see the same mounted filesystem and coordinate concurrent access. If the requirement is the same agent process, assign a distinct tag per process.

Do not use this design with agents configured to disconnect after one job or with ephemeral job pods that disappear after completion. Matching an old tag cannot resurrect its disk.

## Create data outside the checkout

Use a preprovisioned base directory writable only by the intended agent account, such as `/var/lib/company/build-workspaces`. Create a per-build child rather than sharing one mutable directory among all builds.

The agent's next checkout may clean untracked or ignored files. A large workspace left under the repository directory can therefore disappear before its consumer runs. Changing Git clean flags globally just to preserve it weakens isolation for unrelated jobs.

Write a manifest containing the build UUID, commit, toolchain version, and workspace format version. The consumer must verify those values before treating the local files as valid. Existence alone is not enough: a partial producer failure can leave a convincing directory tree.

The [Git checkout documentation](https://buildkite.com/docs/pipelines/configure/git-checkout) explains checkout cleaning and overrides. Keep the large workspace's lifecycle separate from that mechanism.

## Upload the consumer from the producer

Give the producer a stable key:

```yaml
steps:
  - label: "Prepare local workspace"
    key: prepare-workspace
    command: "bash .buildkite/scripts/prepare-workspace.sh"
    agents:
      queue: persistent-builds
```

After preparation succeeds and the manifest is complete, the producer can execute this Python generator. It assumes the preparation script exports `LOCAL_WORKSPACE` with the absolute per-build directory it created:

```python
import json
import os

owner = os.environ["BUILDKITE_AGENT_META_DATA_WORKSPACE_OWNER"]
workspace = os.environ["LOCAL_WORKSPACE"]
if not owner or not workspace.startswith("/var/lib/company/build-workspaces/"):
    raise SystemExit("Missing workspace owner or unexpected workspace path")

print(json.dumps({
    "steps": [{
        "label": "Test prepared local workspace",
        "key": "test-local-workspace",
        "depends_on": "prepare-workspace",
        "agents": {"queue": "persistent-builds", "workspace_owner": owner},
        "checkout": {"skip": True},
        "env": {"LOCAL_WORKSPACE": workspace},
        "command": "/opt/company/bin/test-local-workspace",
    }]
}))
```

Save it as `.buildkite/local-consumer.py`, then upload the generated JSON:

```bash
#!/usr/bin/env bash
set -euo pipefail

consumer_definition=$(mktemp)
trap 'rm -f -- "$consumer_definition"' EXIT
python3 .buildkite/local-consumer.py > "$consumer_definition"
buildkite-agent pipeline upload --no-interpolation "$consumer_definition"
```

Generation completes successfully before upload begins, so a failed generator cannot fall through to an upload. The generator captures the producer's actual ownership tag. The consumer executable is preinstalled because checkout is skipped; native `checkout.skip` requires agent v3.136.0 or newer. The executable should validate the manifest and enforce the permitted workspace root before reading or deleting files.

Do not interpolate a workspace path into shell command text. Passing it as an environment value keeps the fixed command separate from data. The [dynamic pipeline guide](https://buildkite.com/docs/pipelines/configure/dynamic-pipelines) documents uploads and explicit dependencies.

## Plan retries and cleanup

A retried producer must not blindly upload another step with an existing key. Define whether retries rebuild the workspace in place, create a new generation, or require a fresh build. Keep consumers from observing half-written data by publishing the ready manifest only after preparation completes.

If the owner disconnects, the targeted consumer waits; it cannot safely fall back to a random machine. Establish a bounded operational recovery process that rebuilds the data or restores a durable checkpoint elsewhere.

Delete per-build data after consumption when appropriate, and run a separate age-based cleanup for abandoned directories. A pending cleanup step cannot guarantee execution after build cancellation or host loss.

Test successful reuse, consumer retry, producer failure, and owner loss. The design is worthwhile when the saved transfer time exceeds the coordination cost and local state is validated as carefully as a downloaded artifact.
