# Validation Summary: How to Configure SUSE Observability Agent

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- SUSE Observability
- SUSE Observability Agent
- Kubernetes
- Helm
- SUSE Observability CLI

## Sources Consulted
- SUSE Observability Kubernetes install documentation: https://documentation.suse.com/cloudnative/suse-observability/latest/en/setup/install-stackstate/kubernetes_openshift/kubernetes_install.html
- SUSE Observability requirements and sizing documentation: https://documentation.suse.com/cloudnative/suse-observability/latest/en/setup/install-stackstate/requirements.html
- SUSE Observability Kubernetes quick start guide: https://documentation.suse.com/cloudnative/suse-observability/latest/en/k8s-quick-start-guide.html
- SUSE Observability Rancher Prime guide: https://documentation.suse.com/cloudnative/suse-observability/latest/en/k8s-suse-rancher-prime.html
- SUSE Observability ingress and router service documentation: https://documentation.suse.com/cloudnative/suse-observability/latest/en/setup/install-stackstate/kubernetes_openshift/ingress.html
- SUSE Observability health synchronization documentation: https://documentation.suse.com/cloudnative/suse-observability/latest/en/configure/health/health-synchronization.html
- SUSE Observability Receiver API health documentation: https://documentation.suse.com/cloudnative/suse-observability/latest/en/configure/health/send-health-data/send-health-data.html
- SUSE Observability monitor CLI documentation: https://documentation.suse.com/cloudnative/suse-observability/latest/en/use/alerting/k8s-add-monitors-cli.html
- SUSE Observability Helm chart repository and packaged chart values: https://charts.rancher.com/server-charts/prime/suse-observability/index.yaml

## Issues Found
- The prerequisites used stale version guidance. Updated them to require a supported Kubernetes/Rancher environment, Helm 3.13.1 or higher, and capacity for the selected SUSE Observability sizing profile.
- The SUSE Observability server install command used obsolete top-level `license` and `baseUrl` values. Updated it to the current `global.suseObservability.*` values and added required sizing and admin password values.
- The agent Helm repository URL was incorrect. The SUSE Observability Agent chart is in the SUSE Observability chart repository, so the command now uses `suse-observability/suse-observability-agent`.
- The agent install and values examples omitted the required `stackstate.cluster.name` value and used the wrong receiver path. Updated them to use `stackstate.cluster.name`, a stable `stackstate.cluster.authToken`, and `/receiver/stsAgent`.
- The data collection values used non-existent chart keys such as `clusterName`, `kubernetes.enabled`, `containerRuntime.enabled`, and `nodeAgent.enabled`. Replaced them with current chart keys under `stackstate`, `clusterAgent.collection`, `logsAgent`, and `nodeAgent.containers.agent.resources`.
- Verification and troubleshooting commands used incorrect labels and resource names. Updated them to match chart-generated resources such as `suse-observability-agent-cluster-agent`, `suse-observability-agent-node-agent`, and the `app.kubernetes.io/instance` label.
- The UI access command used the wrong service name. Updated it to port-forward the generated router service, `suse-observability-suse-observability-router`.
- The health rule YAML did not match SUSE Observability's documented health synchronization model. Replaced it with an `ExternalMonitor` definition applied through the SUSE Observability CLI.
- The monitor command used a non-existent `stackstate monitor create` workflow. Replaced it with a documented monitor YAML and `sts monitor apply -f monitor.yaml`.
- The troubleshooting health check command used an unsupported pod selector and endpoint. Replaced it with the official quick checks for the Helm release and pods.
- Updated legacy component wording from `StackState Server` to `SUSE Observability Server`.

## Review Notes
The local environment did not have the `helm` binary installed, so Helm chart validation was done by inspecting SUSE's official chart index and packaged chart values directly. Ingestion API keys are deprecated in favor of service tokens, but the current agent chart still accepts the value through `stackstate.apiKey`.
