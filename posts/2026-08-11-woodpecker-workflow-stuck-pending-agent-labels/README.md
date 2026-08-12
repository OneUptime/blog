# Fix Woodpecker Workflows Stuck in Pending

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Woodpecker CI, CI/CD, Agent, Scheduling, Troubleshooting

Description: Diagnose pending Woodpecker workflows by comparing required workflow labels with connected agent labels, capacity, and backend.

---

A Woodpecker workflow becomes `pending` after the server has accepted its event and configuration but before an agent has initialized it. Scheduling is label-based: an agent may take a workflow only when every workflow label matches an agent label or wildcard. Platform and backend are labels too.

The fastest diagnosis is to copy the workflow's effective labels, copy the labels from each connected agent, and compare them key by key. If at least one agent matches, move on to dependencies, capacity, disabled or paused scheduling, concurrency, and approval. If none matches, waiting alone will not fix the queue unless a matching agent is expected to connect or be provisioned.

## Distinguish the Queue from Backend Scheduling

There are two different “pending” states:

1. **Woodpecker workflow pending**: no agent has initialized the workflow yet. It may be waiting for dependencies, concurrency, capacity, or scheduling.
2. **Kubernetes Pod pending**: a Kubernetes-backend agent initialized the workflow and created a step Pod, but the Pod has not reached `Running`. It may be unscheduled or waiting for storage, network setup, an image pull, or other container setup.

If the Woodpecker workflow and its steps remain pending and no Pod tied to its `woodpecker-ci.org/task-uuid` exists, debug Woodpecker scheduling. If a Pod bearing that task label exists, the Woodpecker label match already succeeded; inspect PVCs, node selectors, resources, taints, service accounts, and image pulls in Kubernetes.

Likewise, a pipeline on hold for approval is not an agent-label failure. Read the displayed state and approval requirement before editing labels.

## Understand the Default Agent Labels

Current Woodpecker agents provide at least these default labels:

- `platform=<os>/<arch>`, such as `linux/amd64`;
- `hostname=<agent hostname>`;
- `backend=<backend name>`, such as `docker`, `kubernetes`, or `local`;
- `repo=*`.

A workflow also has a repository label by default, such as `repo=acme/api`. The agent's `repo=*` wildcard accepts it.

Custom labels with these same keys overwrite the default scheduling-label values. Compare the agent's effective label map rather than assuming the detected platform or backend field is the value used for matching.

Custom labels are configured with `WOODPECKER_AGENT_LABELS`:

~~~ini
WOODPECKER_AGENT_LABELS=location=europe,tier=trusted,gpu=false
~~~

A workflow requests them through a key-value map:

~~~yaml
labels:
  location: europe
  tier: trusted

steps:
  - name: build
    image: golang:1.26
    commands:
      - go test ./...
~~~

Every requested key must match. An agent with only `location=europe` is not eligible because `tier=trusted` is absent.

## Build a Match Table

Suppose a pending workflow requires:

~~~yaml
labels:
  platform: linux/arm64
  backend: docker
  location: europe
~~~

List connected agents:

| Agent | platform | backend | location | Match |
| --- | --- | --- | --- | --- |
| agent-a | linux/amd64 | docker | europe | no: platform |
| agent-b | linux/arm64 | kubernetes | europe | no: backend |
| agent-c | linux/arm64 | docker | us | no: location |

Each agent is close, but none satisfies all keys. Either provision an agent with the required intersection or correct a label that does not represent a true requirement.

Do not remove a security-related routing label merely to drain the queue. For a sensitive pool, use the mandatory `!tier=trusted` form described below so unlabeled work cannot land there, and combine it with repository or organization scoping and separate credential controls. Labels select agents; they do not authorize workflow authors.

## Platform Must Match the Agent Architecture

Use the current workflow label syntax:

~~~yaml
labels:
  platform: linux/arm64
~~~

Woodpecker's documented platform format is `GOOS/GOARCH`, such as `linux/amd64` or `linux/arm64`. Check the agent's detected platform in the admin UI or startup log, then confirm that no same-named custom label overrides it for scheduling. Container image multi-architecture support does not change the agent's platform label.

Common mistakes include:

- `amd64` instead of `linux/amd64`;
- `aarch64` instead of Go's `arm64`;
- requesting `linux/arm` when only `linux/arm64` exists;
- copying the server architecture rather than the agent architecture;
- keeping legacy top-level `platform:` syntax removed as an error in Woodpecker 3.0.

For a multi-platform matrix on Docker or local agents, each permutation should request the agent platform that can execute it. With the Kubernetes backend, `labels.platform` still selects the agent; select a step Pod's node architecture with `backend_options.kubernetes.nodeSelector` and `kubernetes.io/arch` when one agent drives nodes of multiple architectures. The agent must enable `WOODPECKER_BACKEND_K8S_POD_NODE_SELECTOR_ALLOW_FROM_STEP` for that per-step option. A normal workflow is assigned to one agent, so a step-level platform condition cannot move later steps to a different architecture.

## Backend Is a Label, Not a Step Preference

An agent executes one configured backend: Docker, Kubernetes, local, or another supported/custom choice. It advertises a `backend` label. Request it only when the workflow truly relies on backend behavior:

~~~yaml
labels:
  backend: kubernetes
~~~

A Docker volume such as `/var/run/docker.sock:/var/run/docker.sock` does not make sense on an arbitrary Kubernetes agent. Conversely, Kubernetes `backend_options` require the Kubernetes backend.

If the workflow is portable, omit the backend label and keep backend-specific options out of it. If it is not portable, maintain a correctly labeled agent pool. Changing `WOODPECKER_BACKEND=auto-detect` without checking what the agent selected can produce a label different from the one operators expected; set the backend explicitly in production and verify startup logs.

## Custom Label Values and Wildcards

Agent labels can use `*` as a wildcard value:

~~~ini
WOODPECKER_AGENT_LABELS=location=*,repo=*
~~~

`location=*` matches any workflow value for the `location` key. It does not create a wildcard for unrelated missing keys.

Woodpecker 3.11 and later support an exclamation prefix on an **agent** label key to make that label mandatory in the workflow. For example, an agent configured with `!tier=trusted` accepts only workflows that explicitly request matching `tier: trusted`. This prevents unlabeled general work from landing on a sensitive pool, but it does not prevent a workflow author from explicitly requesting the label.

Use this capability carefully and document it. A pending workflow may appear to request very little while an agent itself requires an additional label.

Quote numeric or boolean-looking workflow values if you want to make their string intent explicit:

~~~yaml
labels:
  gpu: 'false'
  generation: '3'
~~~

Keep label spelling, case, and whitespace consistent. `Location` and `location` should be treated as different keys.

## Repository Scoping

Every workflow carries its repository identity. On a system/global agent, the normal agent label `repo=*` permits any repository accepted by the instance and other labels. User- and organization-scoped agents remain restricted by the server to their organization.

For a dedicated worker, configure a specific repository:

~~~ini
WOODPECKER_AGENT_LABELS=repo=acme/signing-service,!tier=signing
~~~

Then require the security tier in that workflow. A typo after a repository rename can leave the queue with no match. Update the agent label and restart it, then verify the label shown by the server.

Repository scoping is useful but is not the only security control. Keep secrets, networks, volumes, and privileged-plugin allowlists scoped separately.

## Confirm the Agent Is Connected

An otherwise perfect label match is useless if the agent is offline. In **Settings → Agents**, confirm:

- recent last-contact time and whether scheduling is disabled;
- agent record name;
- platform;
- backend;
- custom labels, including overrides of default scheduling labels;
- version;
- configured capacity.

Use **Admin → Queue** to check whether the global queue is paused and to inspect pending and running tasks and their assigned agents. Use the agent's debug startup log to confirm the effective hostname and full scheduling-label map; the editable agent record name is not necessarily its `hostname` label.

Inspect agent logs for authentication failures or reconnect loops. A newly edited `WOODPECKER_AGENT_LABELS` value does not affect a process that was never restarted or rolled out.

If using system registration, persist the agent configuration file so its registered identity survives restarts. If using a per-agent token, ensure the token belongs to the expected server agent record.

## Capacity Can Look Like a Label Failure

`WOODPECKER_MAX_WORKFLOWS` defaults to 1. Once a matching agent reaches its configured limit, it cannot take another workflow until capacity is free. Increasing the value raises concurrency on that agent:

~~~ini
WOODPECKER_MAX_WORKFLOWS=4
~~~

Increase it only after measuring CPU, memory, disk I/O, ports, and backend limits. Four workflows can launch many more than four containers or Pods.

Check:

- active workflow count per matching agent;
- workflow concurrency limits;
- a deployment group serialized with `concurrency: 1`;
- workflow dependencies still in progress;
- disabled agent scheduling or a paused global queue;
- autoscaler capacity and registration;
- long-running or hung blocking steps;
- stuck cleanup that has not released a slot.

A label mismatch remains pending while the labels and agent pool stay unchanged. A capacity queue normally drains when running work completes. Observe whether older matching workflows progress.

## Workflow Concurrency and Approval

Woodpecker can limit concurrent instances of a workflow:

~~~yaml
concurrency:
  limit: 1
~~~

Additional runs stay queued until the running instance finishes. This is intentional and independent of agent availability.

A workflow can also wait on `depends_on`. **Admin → Queue** identifies tasks that are waiting on dependencies, so inspect their status before blaming labels.

Project settings may also require pipeline approval. Forked repositories are a common default. An unapproved pipeline can appear to be waiting, but scheduling is deliberately blocked. Approve only after reviewing the exact revision; do not change agent labels.

## A Minimal Container-Backend Test

To prove basic agent connectivity to a Docker or Kubernetes pool, create a temporary workflow and set `backend` to the pool you want to test:

~~~yaml
skip_clone: true

labels:
  backend: docker # use kubernetes when testing that pool

when:
  event: manual

steps:
  - name: identity
    image: alpine:3.22
    commands:
      - echo "system=$CI_SYSTEM_PLATFORM"
      - echo "workflow=$CI_WORKFLOW_NAME"
~~~

For a local-backend agent, use `backend: local` and replace `alpine:3.22` with an installed shell such as `bash`; the local backend treats `image` as the host shell executable.

Run the workflow manually on a safe branch. If it starts, at least one matching agent and capacity path works. Add the intended platform, then custom labels one at a time. The first addition that leaves it pending identifies the mismatch.

Remove the diagnostic workflow after use.

## Scheduling Checklist

1. Confirm the state is Woodpecker pending, not approval hold or Kubernetes Pod pending.
2. Copy all effective workflow labels.
3. List every connected agent and its effective labels.
4. Require an exact or wildcard match for every key.
5. Check the repository label.
6. Check stable 3.x `labels.platform` syntax and Go platform names.
7. Check the agent's actual backend.
8. Check mandatory `!key=value` agent labels.
9. Check `WOODPECKER_MAX_WORKFLOWS` and current load.
10. Check workflow dependencies, concurrency, and autoscaler state.
11. Check that agent scheduling and the global queue are enabled.
12. Restart/roll out agents after label changes.
13. Preserve routing and security controls instead of weakening them for convenience.

## Official Documentation

- [Woodpecker: Workflow labels and platform filtering](https://woodpecker-ci.org/docs/usage/workflow-syntax#labels)
- [Woodpecker: Agent labels and capacity](https://woodpecker-ci.org/docs/administration/configuration/agent)
- [Woodpecker: Workflow concurrency](https://woodpecker-ci.org/docs/usage/workflows#concurrency)
- [Woodpecker: Project approvals](https://woodpecker-ci.org/docs/usage/project-settings)
- [Woodpecker: Architecture and agent/backends](https://woodpecker-ci.org/docs/administration/general)
- [Woodpecker: 3.0 workflow syntax migrations](https://woodpecker-ci.org/migrations#300)

## Conclusion

Once dependencies, approval, concurrency, and queue scheduling allow it, a pending Woodpecker workflow needs one connected agent whose labels satisfy the complete required set. Compare platform, backend, repository, custom values, wildcards, and mandatory agent labels directly. If a match exists, check capacity and disabled or paused scheduling. If a Kubernetes Pod tied to the workflow already exists, stop changing Woodpecker labels and debug Kubernetes execution instead.
