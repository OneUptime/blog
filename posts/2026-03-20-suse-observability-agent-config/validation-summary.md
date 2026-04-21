# Validation Summary: How to Configure the SUSE Observability Agent

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- SUSE Observability Agent
- Kubernetes
- Helm
- StackState Agent checks
- Promtail-based pod log shipping

## Sources Consulted
- SUSE Observability latest documentation: Installing SUSE Observability Agent in Air-Gapped Mode: https://documentation.suse.com/cloudnative/suse-observability/latest/en/k8s-suse-rancher-prime-agent-air-gapped.html
- SUSE Observability latest documentation: Log Shipping: https://documentation.suse.com/cloudnative/suse-observability/latest/en/use/logs/k8sTs-log-shipping.html
- SUSE Observability latest documentation: Expose SUSE Observability outside of the cluster: https://documentation.suse.com/cloudnative/suse-observability/latest/en/setup/install-stackstate/kubernetes_openshift/ingress.html
- StackVista Helm chart documentation for `suse-observability-agent` v1.2.28 / SUSE Observability 2.9.0: https://github.com/StackVista/helm-charts/blob/suse-observability/2.9.0/stable/suse-observability-agent/README.md
- StackVista Helm chart values and templates for `suse-observability-agent`: https://github.com/StackVista/helm-charts/tree/suse-observability/2.9.0/stable/suse-observability-agent
- StackState Agent check development documentation: https://docs.stackstate.com/5.1/develop/developer-guides/agent_check/how_to_develop_agent_checks
- StackVista StackState Agent source repository: https://github.com/StackVista/stackstate-agent

## Issues Found
- The receiver URL example used `/receiver/solarwinds`, which is not the SUSE Observability Agent receiver path. Updated it to `/receiver/stsAgent`, matching SUSE's documented agent receiver endpoint.
- The basic values used unsupported chart keys: `nodeAgent.enabled` and `clusterAgent.collection.kubernetesState`. Removed `nodeAgent.enabled` and replaced `kubernetesState` with `clusterAgent.collection.kubeStateMetrics.enabled`.
- The log collection snippet used unsupported values: `containerCollectAll`, `excludeNamespaces`, and `logProcessing.rules`. Replaced them with supported `logsAgent.enabled` and `logsAgent.resources` values.
- The tag examples used unsupported `extraEnvVars` fields and `STS_TAGS`. Updated them to the chart's `global.extraEnv.open` and `nodeAgent.containers.agent.env` maps, using the agent-supported `DD_TAGS` variable.
- The check override mounted `auto_conf/nginx.yaml` directly under `/etc/stackstate-agent/conf.d`, which does not match the agent's check configuration layout. Updated it to `auto_conf.yaml` under `/etc/stackstate-agent/conf.d/nginx.d`.
- The node-agent resource example used unsupported `nodeAgent.resources`. Updated it to the supported per-container paths under `nodeAgent.containers.agent.resources` and `nodeAgent.containers.processAgent.resources`.
- The Helm command referenced `suse-observability-agent/suse-observability-agent`. Updated it to the documented SUSE chart reference, `suse-observability/suse-observability-agent`, and added `--install` and `--create-namespace`.
- The verification command used `stackstate-agent check kubernetes_state`, while current SUSE agent deployments use the Kubernetes state core check and the command did not actually list checks. Replaced it with `stackstate-agent status` and clarified the comment.
- The API-key troubleshooting command used the wrong secret name and key. Updated it to read `STS_API_KEY` from the chart-generated `suse-observability-agent-secrets` secret.
- The best-practice note recommended namespace-selective log collection through Helm values that the chart does not expose. Reworded it to recommend disabling `logsAgent.enabled` or using a separate log pipeline for custom namespace filtering.

## Review Notes
- `helm` and `kubectl` were not installed in the local environment, so CLI behavior was verified from official documentation and chart templates rather than local `--help` output.
- The architecture diagram remains a high-level simplification; the chart can also deploy a checks agent and logs agent depending on values.
