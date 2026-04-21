# Validation Summary: How to Set Up Topology Views in SUSE Observability

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- SUSE Observability
- SUSE Observability Helm charts
- SUSE Observability Agent
- Kubernetes
- Helm
- SUSE Observability `sts` CLI
- Topology views, health synchronization, and monitors

## Sources Consulted
- SUSE Observability installation guide: https://documentation.suse.com/en-us/cloudnative/suse-observability/latest/en/installing-suse-obs.html
- SUSE Observability requirements and sizing: https://documentation.suse.com/en-us/cloudnative/suse-observability/latest/en/setup/install-stackstate/requirements.html
- SUSE Observability Rancher Prime installation guide: https://documentation.suse.com/en-us/cloudnative/suse-observability/latest/en/k8s-suse-rancher-prime.html
- SUSE Observability Kubernetes quick start: https://documentation.suse.com/en-us/cloudnative/suse-observability/latest/en/k8s-quick-start-guide.html
- SUSE Observability topology perspective: https://documentation.suse.com/cloudnative/suse-observability/latest/en/use/views/k8s-topology-perspective.html
- SUSE Observability CLI documentation: https://documentation.suse.com/en-us/cloudnative/suse-observability/latest/en/setup/cli/cli-sts.html
- SUSE Observability monitor CLI documentation: https://documentation.suse.com/en-us/cloudnative/suse-observability/latest/en/use/alerting/k8s-add-monitors-cli.html
- SUSE Observability health synchronization documentation: https://documentation.suse.com/cloudnative/suse-observability/latest/en/configure/health/send-health-data/send-health-data.html
- SUSE Observability chart repository index: https://charts.rancher.com/server-charts/prime/suse-observability/index.yaml
- SUSE Observability chart values and templates from `suse-observability-2.9.0.tgz`
- SUSE Observability Agent chart values and templates from `suse-observability-agent-1.2.45.tgz`

## Issues Found
- The prerequisites used outdated and oversimplified version/resource requirements. Updated them to reference supported Kubernetes/Rancher versions by SUSE Observability release, Helm v3.13.1+, a default storage class, and sizing-profile resources.
- The server installation command used obsolete top-level `license` and `baseUrl` Helm values. Updated it to the current `global.suseObservability.*` values with `sizing.profile` and `adminPassword`.
- The agent Helm repository URL was incorrect. The agent chart is published in the same SUSE Observability Helm repository, so the install command now uses `suse-observability/suse-observability-agent`.
- The agent install and values examples omitted the required `stackstate.cluster.name` value and used the wrong receiver path. Updated them to use `stackstate.cluster.name`, optional stable `stackstate.cluster.authToken`, and `/receiver/stsAgent`.
- The agent values used invalid keys such as top-level `clusterName`, `kubernetes.enabled`, `containerRuntime.enabled`, and `nodeAgent.resources`. Replaced them with documented chart values under `stackstate.cluster`, `clusterAgent.collection`, and `nodeAgent.containers.agent.resources`.
- Verification commands used old labels and namespace assumptions. Updated them to use the current chart labels and `suse-observability` namespace.
- UI access commands used an arbitrary service and the wrong service name. Updated them to use the `suse-observability-router` service.
- The health rule example used a non-documented `health_rule` schema. Replaced it with a documented external monitor configuration and `sts settings apply`.
- The monitor command used a non-existent `stackstate monitor create` flow. Replaced it with the documented `sts monitor apply -f monitor.yaml` workflow and a threshold monitor YAML example.
- Troubleshooting commands used an incorrect server selector, daemonset name, and configmap name. Replaced them with documented Helm/pod inspection commands and current agent resource names.

## Review Notes
The local workspace does not have `helm` or `kubectl` installed, so command behavior was validated against official documentation and live Helm chart contents rather than by executing against a Kubernetes cluster. YAML snippets added during the review were parsed successfully with PyYAML.
