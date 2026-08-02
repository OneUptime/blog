# Validation Summary: How to Preserve and Retrieve Argo Workflow Logs After Pods Are Deleted

## Status

validated

## Post Type

Technical guide / operations tutorial

## Technologies Covered

- Argo Workflows 4.1, including Pod garbage collection, Workflow Archive, `archiveLogs`, artifact repositories, artifact APIs, UI links, and the init-less Pod layout
- Kubernetes Pod and container logging
- Kubernetes ConfigMaps, Secrets, service accounts, and Workflow custom resources
- S3 artifact storage and artifact garbage collection
- Argo CLI, `kubectl`, `curl`, `jq`, YAML, and shell commands
- Kubernetes-aware log collectors and backends, including Fluentd, Elastic Stack, Grafana Alloy, Loki, and Grafana

## Sources Consulted

- [Argo Workflows: Configuring Archive Logs](https://argo-workflows.readthedocs.io/en/latest/configure-archive-logs/)
- [Argo Workflows: Workflow Archive](https://argo-workflows.readthedocs.io/en/latest/workflow-archive/)
- [Argo Workflows: Links](https://argo-workflows.readthedocs.io/en/latest/links/)
- [Argo Workflows: Artifact Repository Ref](https://argo-workflows.readthedocs.io/en/latest/artifact-repository-ref/)
- [Argo Workflows: Field Reference](https://argo-workflows.readthedocs.io/en/latest/fields/)
- [Argo Workflows: Workflow Variables](https://argo-workflows.readthedocs.io/en/latest/variables/)
- [Argo Workflows: API Reference](https://argo-workflows.readthedocs.io/en/latest/swagger/)
- [Argo Workflows CLI: `argo archive get`](https://argo-workflows.readthedocs.io/en/latest/cli/argo_archive_get/)
- [Argo Workflows CLI: `argo logs`](https://argo-workflows.readthedocs.io/en/latest/cli/argo_logs/)
- [Argo Workflows CLI: `argo auth token`](https://argo-workflows.readthedocs.io/en/latest/cli/argo_auth_token/)
- [Argo Workflows: Init-less Pod Layout](https://argo-workflows.readthedocs.io/en/latest/initless-pod/)
- [Argo Workflows source: executor log-artifact creation](https://github.com/argoproj/argo-workflows/blob/main/workflow/executor/executor.go)
- [Argo Workflows source: archive-log precedence](https://github.com/argoproj/argo-workflows/blob/main/workflow/controller/workflowpod.go)
- [Argo Workflows source: generated artifact API specification](https://github.com/argoproj/argo-workflows/blob/main/pkg/apiclient/_.primary.swagger.json)
- [Kubernetes: Logging Architecture](https://kubernetes.io/docs/concepts/cluster-administration/logging/)
- [Kubernetes: `kubectl logs`](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/)
- [Grafana Loki: Promtail agent EOL notice](https://grafana.com/docs/loki/latest/send-data/promtail/)
- [Grafana Alloy: Collect Kubernetes logs and forward them to Loki](https://grafana.com/docs/alloy/latest/collect/logs-in-kubernetes/)
- [Alpine Linux release branches](https://www.alpinelinux.org/releases/)

## Issues Found

- The post repeated Argo's outdated Promtail suggestion even though Promtail reached end of life on March 2, 2026. It now recommends supported collectors such as Grafana Alloy for Loki and Grafana deployments.
- The custom-link examples used YAML folded scalars with the URL split across lines. YAML folding inserted spaces before the query parameters, producing an invalid or incorrectly parsed URL. Each example is now a single valid URL scalar.
- The per-Workflow archive example also set `archiveLogs: true` in the selected artifact repository. That repository-level value has controller-setting precedence and therefore contradicted the claim that the example enabled archiving only through `spec.archiveLogs`. The repository-level flag was removed so the example accurately demonstrates Workflow-level enablement.
- The post claimed that `archiveLogs` saved every container and sidecar log. Argo's executor archives `main` for container/script templates and each ContainerSet member, but not ordinary `sidecars:`. The scope and artifact-name guidance were corrected, with external logging retained as the recommendation for sidecar logs.
- The artifact-download example selected `.displayName == "main"`, but `main` is the example's template name; a root Pod node's display name is normally the generated Workflow name. The `jq` query now selects a node that actually records the `main-logs` output artifact and fails if it cannot find one.
- The artifact authorization wording implied a separate generic artifact authorization check. It now states the actual requirements: Argo authentication, authorization to get the Workflow, and successful access to the repository and referenced credentials.
- The smoke test selected the first result from `argo list`, which can identify a different Workflow when other runs are active. It now captures the exact name returned by `argo submit` and uses that name for `argo watch`, `argo logs`, and `kubectl`.
- The troubleshooting commands implied that both `wait` and `supervisor` exist in the same Pod. The text now distinguishes the default legacy `wait` container from the Argo Workflows 4.1 init-less `supervisor` container.
- Workflow-name lookup with `argo archive get` is an Argo Workflows 4.1 CLI feature. The text now states that version requirement and notes that older CLIs require the archived Workflow UID.

## Review Notes

- All YAML blocks parse successfully, and both complete Workflow manifests passed offline linting with the official Argo Workflows 4.0.8 CLI. The fields used by the examples remain present in the current 4.1 field definitions.
- The shell blocks pass syntax checking, and the corrected `jq` node-selection expression was exercised against representative Workflow status data.
- `alpine:3.23` remains within Alpine's supported lifecycle as of the validation date, although Alpine 3.24 is also available.
- Argo's current archive-log page still names Promtail, but Grafana's authoritative documentation marks Promtail EOL and directs users to Alloy or another supported client.
