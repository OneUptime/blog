# Validation Summary: How to Set Up Anomaly Detection in SUSE Observability

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- SUSE Observability
- SUSE Observability Agent
- Dynamic Threshold monitors
- Kubernetes
- Helm
- SUSE Observability CLI (`sts`)

## Sources Consulted
- SUSE Observability Kubernetes install documentation: https://documentation.suse.com/cloudnative/suse-observability/latest/en/setup/install-stackstate/kubernetes_openshift/kubernetes_install.html
- SUSE Observability Rancher/Kubernetes compatibility matrix: https://documentation.suse.com/cloudnative/suse-observability/latest/en/setup/install-stackstate/Compatibility%20Self%20Hosted.html
- SUSE Observability Kubernetes quick start and agent setup documentation: https://documentation.suse.com/en-us/cloudnative/suse-observability/latest/en/k8s-quick-start-guide.html
- SUSE Observability Dynamic Threshold monitors documentation: https://documentation.suse.com/cloudnative/suse-observability/latest/en/use/alerting/k8s-dynamic-threshold-monitors.html
- SUSE Observability monitor CLI documentation: https://documentation.suse.com/cloudnative/suse-observability/latest/en/use/alerting/k8s-add-monitors-cli.html
- SUSE Observability `sts` CLI documentation: https://documentation.suse.com/cloudnative/suse-observability/latest/en/setup/cli/cli-sts.html
- SUSE Observability troubleshooting documentation: https://documentation.suse.com/cloudnative/suse-observability/latest/en/setup/install-stackstate/troubleshooting.html
- SUSE Observability advanced troubleshooting documentation: https://documentation.suse.com/cloudnative/suse-observability/latest/en/setup/install-stackstate/advanced-troubleshooting.html
- Official SUSE Observability Helm chart index and chart values: https://charts.rancher.com/server-charts/prime/suse-observability/index.yaml

## Issues Found
- The prerequisites used outdated version guidance. Updated Kubernetes, Rancher, Helm, and resource requirements to match current SUSE Observability compatibility and sizing guidance.
- The server Helm install used top-level `license` and `baseUrl` values that are not the current recommended chart interface. Replaced them with `global.suseObservability.*` values, added a sizing profile and admin password, and enabled `anomaly-detection.enabled`.
- The agent installation used a non-existent separate Helm repository and outdated receiver path. Updated it to use `suse-observability/suse-observability-agent`, `stackstate.cluster.name`, and `/receiver/stsAgent`.
- The agent values file used invalid fields such as top-level `clusterName`, `kubernetes.enabled`, `containerRuntime.enabled`, and `nodeAgent.resources`. Replaced them with current chart values under `stackstate.cluster.name` and `nodeAgent.containers.agent.resources`.
- The verification commands used outdated namespaces, labels, and log expectations. Updated them to current release labels and added `sts agent list`.
- The UI access commands referenced the wrong service name and HTTP URL. Updated them to the router service name used by the current Helm chart and the HTTPS localhost URL from the docs.
- The health rule YAML was not a documented SUSE Observability API format. Replaced it with a Dynamic Threshold monitor YAML example for anomaly detection.
- The monitor CLI example used the obsolete/nonexistent `stackstate monitor create` form. Replaced it with `sts monitor apply -f anomaly-monitor.yaml` and `sts monitor list`.
- The troubleshooting commands used an unsupported health endpoint, outdated labels, and an incorrect agent ConfigMap name. Replaced them with documented Helm, pod, log, describe, and agent restart/configuration commands.

## Review Notes
The post is now technically aligned with the current SUSE Observability Helm chart and documentation. The guide still assumes a self-hosted installation path; hosted SUSE Cloud Observability users should follow the UI-provided StackPack/agent commands for their instance.
