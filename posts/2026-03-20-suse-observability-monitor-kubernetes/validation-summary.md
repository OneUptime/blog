# Validation Summary: How to Monitor Kubernetes Clusters with SUSE Observability

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- SUSE Observability
- SUSE Observability Agent
- Kubernetes
- Helm
- SUSE Observability `sts` CLI
- Kubernetes monitor annotations

## Sources Consulted
- SUSE Observability Kubernetes install documentation: https://documentation.suse.com/cloudnative/suse-observability/latest/en/setup/install-stackstate/kubernetes_openshift/kubernetes_install.html
- SUSE Observability quick start guide for Kubernetes integrations: https://documentation.suse.com/cloudnative/suse-observability/latest/en/k8s-quick-start-guide.html
- SUSE Observability ingress and router service documentation: https://documentation.suse.com/cloudnative/suse-observability/latest/en/setup/install-stackstate/kubernetes_openshift/ingress.html
- SUSE Observability troubleshooting guide: https://documentation.suse.com/cloudnative/suse-observability/latest/en/setup/install-stackstate/troubleshooting.html
- SUSE Observability CLI documentation: https://documentation.suse.com/cloudnative/suse-observability/latest/en/setup/cli/cli-sts.html
- SUSE Observability monitor CLI documentation: https://documentation.suse.com/cloudnative/suse-observability/latest/en/use/alerting/k8s-add-monitors-cli.html
- SUSE Observability monitor argument override documentation: https://documentation.suse.com/cloudnative/suse-observability/latest/en/use/alerting/k8s-override-monitor-arguments.html
- SUSE Observability Helm chart values: https://github.com/StackVista/helm-charts/tree/master/stable/suse-observability
- SUSE Observability Agent Helm chart values: https://github.com/StackVista/helm-charts/tree/master/stable/suse-observability-agent

## Issues Found
- The prerequisites used broad or outdated version/resource claims. Updated them to refer to supported SUSE Observability release compatibility, Helm v3.13.1+ for agent integration, sizing-profile-based capacity, and required Kubernetes permissions.
- The server installation command used legacy top-level `license` and `baseUrl` values directly on the main chart. Updated it to the current `global.suseObservability.*` Helm value structure and added required sizing profile and admin password values.
- The agent repository and chart reference were incorrect. The agent chart is served from the same `suse-observability` Helm repository and installed as `suse-observability/suse-observability-agent`.
- The agent ingest URL used `/receiver/sinks/generic`, which is not the documented Kubernetes agent receiver path. Updated it to `/receiver/stsAgent`.
- The agent configuration used incorrect values such as top-level `clusterName`, `kubernetes.enabled`, `containerRuntime.enabled`, and `nodeAgent.resources`. Replaced them with documented chart values under `stackstate.cluster.name` and `nodeAgent.containers.agent.resources`.
- The verification and troubleshooting commands used old namespaces, release names, labels, daemonset names, configmap names, and an unsupported health endpoint example. Updated them to match the current chart resource names and SUSE troubleshooting guidance.
- The UI access commands pointed to a non-existent `svc/suse-observability` service and an arbitrary load balancer lookup. Updated them to use the documented router service and port-forward pattern.
- The health rule YAML was not a documented SUSE Observability API format. Replaced it with the documented Kubernetes monitor override annotation format.
- The monitor CLI example used a non-existent `stackstate monitor create` command and mixed monitor creation with notification channel configuration. Replaced it with the documented `sts monitor apply`, `sts monitor list`, and `sts monitor status` commands.

## Review Notes
API keys for ingestion are deprecated in favor of service tokens, but the agent chart field remains `stackstate.apiKey`; the post now describes the value as a service token or API key. The local environment did not have the `helm` binary installed, so chart rendering was not executed locally; validation was performed against SUSE documentation and the published chart values/templates.
