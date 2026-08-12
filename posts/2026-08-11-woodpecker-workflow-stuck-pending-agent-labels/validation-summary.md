# Validation Summary: Fix Woodpecker Workflows Stuck in Pending

## Status

validated

## Post Type

Technical troubleshooting guide

## Technologies Covered

- Woodpecker CI 3.x workflow scheduling
- Woodpecker agents, labels, capacity, registration, and queue controls
- Docker, Kubernetes, Local, and custom Woodpecker backends
- Kubernetes Pods, PVCs, scheduling, node selectors, and container startup
- YAML workflow configuration
- Go `GOOS/GOARCH` platform naming

## Sources Consulted

- [Woodpecker workflow syntax: labels, platform filters, conditions, and backend options](https://woodpecker-ci.org/docs/usage/workflow-syntax)
- [Woodpecker agent configuration: registration, labels, capacity, and backend selection](https://woodpecker-ci.org/docs/administration/configuration/agent)
- [Woodpecker workflows: dependencies and concurrency](https://woodpecker-ci.org/docs/usage/workflows)
- [Woodpecker matrix workflows](https://woodpecker-ci.org/docs/usage/matrix-workflows)
- [Woodpecker project settings: approvals and trusted-resource controls](https://woodpecker-ci.org/docs/usage/project-settings)
- [Woodpecker secrets and scope](https://woodpecker-ci.org/docs/usage/secrets)
- [Woodpecker Kubernetes backend](https://woodpecker-ci.org/docs/administration/configuration/backends/kubernetes)
- [Woodpecker Local backend](https://woodpecker-ci.org/docs/administration/configuration/backends/local)
- [Woodpecker architecture and backends](https://woodpecker-ci.org/docs/administration/general)
- [Woodpecker environment variables](https://woodpecker-ci.org/docs/usage/environment)
- [Woodpecker migration guide, including 3.0 workflow syntax changes](https://woodpecker-ci.org/migrations#300)
- [Woodpecker 3.11 release, which introduced mandatory agent labels](https://github.com/woodpecker-ci/woodpecker/releases/tag/v3.11.0)
- [Woodpecker 3.17 scheduler label-matching source](https://github.com/woodpecker-ci/woodpecker/blob/v3.17.0/server/scheduler/filter.go)
- [Woodpecker 3.17 agent effective-label construction](https://github.com/woodpecker-ci/woodpecker/blob/v3.17.0/cmd/agent/core/agent.go)
- [Woodpecker 3.17 workflow/step creation and state source](https://github.com/woodpecker-ci/woodpecker/blob/v3.17.0/server/pipeline/items.go)
- [Woodpecker 3.17 Kubernetes backend source](https://github.com/woodpecker-ci/woodpecker/blob/v3.17.0/pipeline/backend/kubernetes/kubernetes.go)
- [Woodpecker 3.17 runtime lifecycle source](https://github.com/woodpecker-ci/woodpecker/blob/v3.17.0/pipeline/runtime/workflow.go)
- [Kubernetes Pod lifecycle and the definition of the `Pending` phase](https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/)
- [Docker Official Image: Go](https://hub.docker.com/_/golang)
- [Docker Official Image: Alpine](https://hub.docker.com/_/alpine)

## Issues Found

- The post defined a Woodpecker `pending` workflow as one that no agent had accepted. An agent can lease a task before calling `Init`, and Woodpecker creates pending step records before agent pickup. The wording now uses “initialized” and tests workflow/step state rather than the existence of step records.
- Kubernetes Pod `Pending` was described only as a Pod the scheduler had not placed. Kubernetes also keeps a Pod pending while containers await volume, network, image-pull, initialization, or other setup. The distinction and diagnostic now use the broader Kubernetes definition and correlate Pods through `woodpecker-ci.org/task-uuid`.
- The diagnosis treated label matching, capacity, concurrency, and approval as the only relevant blockers and said waiting could never help. Dependencies, agent `no_schedule`, a globally paused queue, and an expected reconnect or autoscaled agent are also relevant. These cases were added, and the absolute waiting claims were qualified.
- The post implied that detected platform/backend fields were always the effective scheduling labels. Same-named entries in `WOODPECKER_AGENT_LABELS` overwrite the defaults used for matching. The post now tells readers to compare the effective label map and use debug startup logs for it.
- A `tier=trusted` label was presented as a possible security boundary. Custom and mandatory labels are routing controls that workflow authors can explicitly request, not authorization. The security guidance now requires repository/organization scope and separate credential/resource controls, and the dedicated signing-agent example uses `!tier=signing` to reject unlabeled work.
- The platform guidance did not account for Kubernetes agents that launch step Pods on nodes of different architectures. The post now distinguishes agent selection through `labels.platform` from Pod node selection through `backend_options.kubernetes.nodeSelector`, including the required agent opt-in for per-step selectors.
- Mandatory `!key=value` agent labels were described without a version boundary. They were introduced in Woodpecker 3.11, which is now stated.
- The post said Boolean- or numeric-looking workflow labels had to be quoted to prevent a type change. Woodpecker decodes labels into `map[string]string` and accepts Boolean, numeric, and string scalar inputs. Quoting is now described as an optional way to make string intent explicit.
- The `repo=*` statement omitted server-enforced organization scope. It now clarifies that unrestricted repository matching applies to system/global agents; user- and organization-scoped agents remain limited to their organization.
- The **Settings → Agents** checklist included active workload and treated the agent record name as the hostname. That view shows configured capacity and last contact, not active workload, and its editable name need not equal the effective `hostname` label. The post now directs active-workload and paused-queue checks to **Admin → Queue**.
- The capacity explanation became false after increasing `WOODPECKER_MAX_WORKFLOWS`, and it listed long-running detached services as slot holders even though detached work is torn down with the workflow. The text now refers to the configured capacity limit and long-running blocking steps.
- The “portable” diagnostic used `alpine:3.22`, but the Local backend interprets `image` as a host shell executable. The test is now explicitly container-backend-specific, selects Docker or Kubernetes, skips cloning to isolate the scheduling path, and gives the correct Local-backend shell alternative.
- The default backend-label example appeared to limit values to the three built-in backends even though custom agents are supported. It now describes the label as a backend name and gives the built-in names as examples.

## Review Notes

- The review targets the current Woodpecker 3.17.x documentation and the v3.17.0 source. Earlier 3.x releases do not support every feature described, notably mandatory agent labels before 3.11.
- `CI_SYSTEM_PLATFORM` is still populated by the 3.17 agent and exposed by the current CLI, although it is absent from the current built-in environment-variable table. The diagnostic remains valid for 3.17, but this undocumented variable should be rechecked on a future major upgrade.
- The `golang:1.26` and `alpine:3.22` tags exist in their Docker Official Image repositories as of the validation date.
- All six links in the post's Official Documentation section resolved to the intended current documentation pages or anchors.
