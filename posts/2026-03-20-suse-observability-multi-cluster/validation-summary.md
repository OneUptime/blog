# Validation Summary: How to Configure SUSE Observability for Multi-Cluster Monitoring

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- SUSE Observability
- Kubernetes
- Helm
- Rancher Prime
- SUSE Observability Agent
- SUSE Observability CLI (`sts`)

## Sources Consulted
- SUSE Observability Kubernetes install: https://documentation.suse.com/cloudnative/suse-observability/latest/en/setup/install-stackstate/kubernetes_openshift/kubernetes_install.html
- SUSE Observability compatibility matrix: https://documentation.suse.com/cloudnative/suse-observability/latest/en/setup/install-stackstate/Compatibility%20Self%20Hosted.html
- SUSE Observability requirements and sizing: https://documentation.suse.com/cloudnative/suse-observability/latest/en/setup/install-stackstate/requirements.html
- SUSE Observability quick start guide: https://documentation.suse.com/cloudnative/suse-observability/latest/en/k8s-quick-start-guide.html
- SUSE Observability ingress and router service documentation: https://documentation.suse.com/cloudnative/suse-observability/latest/en/setup/install-stackstate/kubernetes_openshift/ingress.html
- SUSE Observability CLI documentation: https://documentation.suse.com/cloudnative/suse-observability/latest/en/setup/cli/cli-sts.html
- SUSE Observability monitor CLI documentation: https://documentation.suse.com/cloudnative/suse-observability/latest/en/setup/custom-integrations/monitors/cli.html
- SUSE Observability notification documentation: https://documentation.suse.com/cloudnative/suse-observability/latest/en/use/alerting/notifications/README.html
- SUSE Observability health synchronization documentation: https://documentation.suse.com/cloudnative/suse-observability/latest/en/configure/health/health-synchronization.html
- SUSE Observability Receiver API health ingestion documentation: https://documentation.suse.com/cloudnative/suse-observability/latest/en/configure/health/send-health-data/send-health-data.html
- SUSE Observability API keys deprecation note: https://documentation.suse.com/cloudnative/suse-observability/latest/en/use/security/k8s-ingestion-api-keys.html
- Official SUSE Observability Helm chart repository metadata and chart values: https://charts.rancher.com/server-charts/prime/suse-observability/index.yaml

## Issues Found
- The prerequisites used outdated version and resource guidance. Updated Kubernetes support from `v1.24+` to the current documented range, changed Helm to `v3.13.1 or later`, removed the unsupported Rancher `v2.7+` claim, and replaced the 16 GB memory claim with sizing-profile-based capacity and persistent storage requirements.
- The architecture used the old "StackState Server" name and oversimplified the deployed components. Updated the component descriptions to match SUSE Observability Server, agents, receiver, and UI responsibilities.
- The server Helm install only set `license` and `baseUrl`, which is not sufficient for the current chart. Replaced it with a `global.suseObservability` values file including license, base URL, sizing profile, and admin password, then installed with `helm upgrade --install`.
- The agent section used a non-existent separate Helm repository URL and missed the required `stackstate.cluster.name` value. Updated it to use the official `suse-observability` chart repository and `suse-observability/suse-observability-agent` chart with required `stackstate.apiKey`, `stackstate.cluster.name`, and `stackstate.url` values.
- The agent receiver URL used `/receiver/sinks/generic`, which does not match current agent installation examples. Updated it to `/receiver/stsAgent`.
- The agent values snippet used unsupported keys such as `clusterName`, `kubernetes.enabled`, `containerRuntime.enabled`, and `nodeAgent.resources`. Replaced them with current chart values under `stackstate.cluster.name`, `clusterAgent.collection`, and `nodeAgent.containers.agent.resources`.
- The verification commands used old namespace, labels, daemonset names, and a brittle log grep. Replaced them with rollout checks and log selectors that match the current agent chart resources.
- The UI access command targeted `svc/suse-observability`, but the chart exposes the router service. Updated it to use `suse-observability-router` and included the documented localhost allowed-origin setting required for port-forward debugging.
- The health-state YAML used an unsupported `health_rule` schema. Replaced it with an `ExternalMonitor` configuration and the documented `sts settings apply` command.
- The monitor CLI example used the wrong executable and unsupported `monitor create` flags. Updated it to use the SUSE Observability `sts` CLI with `sts monitor list` and `sts monitor apply -f monitor.yaml`.
- The alerting text implied notification channels are attached directly through the monitor CLI. Clarified that notification channels are configured separately and are triggered by monitor health-state changes.
- The troubleshooting commands used an unverified server health endpoint, old labels, old agent daemonset names, and an old configmap name. Replaced them with documented install checks, pod inspection, current rollout restart commands, and the current agent configmap name.

## Review Notes
- The post remains a high-level setup guide. For production use, readers should choose an appropriate sizing profile instead of `trial`, configure ingress or a load balancer with TLS, and use service tokens because API keys are deprecated and scheduled for removal in Q4 2026.
