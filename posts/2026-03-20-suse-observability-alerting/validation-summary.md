# Validation Summary: How to Set Up Alerting in SUSE Observability

## Status
validated

## Post Type
Tutorial / setup guide

## Technologies Covered
- SUSE Observability
- SUSE Observability Helm charts
- SUSE Observability Agent
- Kubernetes
- Helm
- kubectl
- SUSE Observability `sts` CLI
- Monitors, health states, and notification configuration

## Sources Consulted
- SUSE Observability Kubernetes install guide: https://documentation.suse.com/cloudnative/suse-observability/latest/en/setup/install-stackstate/kubernetes_openshift/kubernetes_install.html
- SUSE Observability requirements and sizing: https://documentation.suse.com/cloudnative/suse-observability/latest/en/setup/install-stackstate/requirements.html
- SUSE Observability Rancher/Kubernetes compatibility matrix: https://documentation.suse.com/cloudnative/suse-observability/latest/en/setup/install-stackstate/Compatibility%20Self%20Hosted.html
- SUSE Observability Agent quick start guide: https://documentation.suse.com/cloudnative/suse-observability/latest/en/k8s-quick-start-guide.html
- SUSE Observability Agent air-gapped install guide, used to confirm chart name and required agent values: https://documentation.suse.com/cloudnative/suse-observability/latest/en/k8s-suse-rancher-prime-agent-air-gapped.html
- SUSE Observability Agent Helm chart and chart values from the official Rancher chart repository: https://charts.rancher.com/server-charts/prime/suse-observability/
- SUSE Observability CLI documentation: https://documentation.suse.com/cloudnative/suse-observability/latest/en/setup/cli/cli-sts.html
- SUSE Observability monitor CLI guide: https://documentation.suse.com/cloudnative/suse-observability/latest/en/use/alerting/k8s-add-monitors-cli.html
- SUSE Observability derived state monitor documentation: https://documentation.suse.com/cloudnative/suse-observability/latest/en/use/alerting/k8s-derived-state-monitors.html
- SUSE Observability notification configuration documentation: https://documentation.suse.com/cloudnative/suse-observability/latest/en/use/alerting/notifications/configure.html
- Helm `upgrade` command documentation: https://helm.sh/docs/v3/helm/helm_upgrade/
- Kubernetes `kubectl rollout restart` documentation: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_restart/

## Issues Found
- The prerequisites were outdated or underspecified. Updated Kubernetes, Rancher, Helm, and resource requirements to match the current SUSE Observability documentation and added the `sts` CLI prerequisite.
- The server install command used obsolete root-level `license` and `baseUrl` Helm values and omitted required sizing and admin password settings. Updated it to use `global.suseObservability.*` values with `helm upgrade --install`.
- The agent Helm repository URL was invalid; the agent chart is published in the main SUSE Observability Helm repository. Updated the chart reference to `suse-observability/suse-observability-agent`.
- The agent install command omitted `stackstate.cluster.name` and used the wrong receiver path. Updated the required values and default self-hosted receiver URL to `/receiver/stsAgent`.
- The agent values file used unsupported fields such as top-level `clusterName`, `kubernetes.enabled`, `containerRuntime.enabled`, and `nodeAgent.resources`. Replaced them with supported chart values under `stackstate.cluster`, `clusterAgent.collection`, and `nodeAgent.containers.agent.resources`.
- The verification commands used incorrect labels and a non-authoritative log grep. Replaced them with Helm release checks and labels emitted by the agent chart.
- The UI access command targeted an incorrect service and used `http`. Updated it to port-forward the router service and use `https://localhost:8080`.
- The health-state example used a fabricated `health_rule` schema. Replaced it with a derived-state monitor definition and the supported `sts monitor apply` command.
- The monitor example used a non-current `stackstate monitor create --notify-channel` command. Replaced it with current `sts monitor` commands and noted that notifications are configured in the SUSE Observability UI.
- The troubleshooting commands used incorrect labels, resource names, and a likely invalid health endpoint. Replaced them with release/pod checks, router logs, the correct agent DaemonSet name, and chart labels.

## Review Notes
- The receiver API key and final agent install command should normally be copied from the Kubernetes StackPack instructions in the SUSE Observability UI.
- Notifications are configured as separate UI objects scoped to monitors, tags, component types, or component tags; they are not attached with a `--notify-channel` flag on monitor creation.
- Helm and kubectl were not installed in the local environment, so command verification was performed against official documentation and the published Helm chart contents rather than by executing against a live cluster.
