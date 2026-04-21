# Validation Summary: How to Configure SUSE Observability Dashboards

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
- kubectl
- SUSE Observability CLI (`sts`)
- SUSE Observability dashboards, widgets, monitors, and notifications

## Sources Consulted
- SUSE Observability Kubernetes install documentation: https://documentation.suse.com/cloudnative/suse-observability/latest/en/setup/install-stackstate/kubernetes_openshift/kubernetes_install.html
- SUSE Observability requirements and sizing documentation: https://documentation.suse.com/cloudnative/suse-observability/latest/en/setup/install-stackstate/requirements.html
- SUSE Observability Rancher/Kubernetes compatibility matrix: https://documentation.suse.com/cloudnative/suse-observability/latest/en/setup/install-stackstate/Compatibility%20Self%20Hosted.html
- SUSE Observability agent quick start guide: https://documentation.suse.com/cloudnative/suse-observability/latest/en/k8s-quick-start-guide.html
- SUSE Observability ingress and router service documentation: https://documentation.suse.com/cloudnative/suse-observability/latest/en/setup/install-stackstate/kubernetes_openshift/ingress.html
- SUSE Observability dashboard documentation: https://documentation.suse.com/cloudnative/suse-observability/latest/en/use/dashboards/dashboards.html
- SUSE Observability dashboard widget documentation: https://documentation.suse.com/cloudnative/suse-observability/latest/en/use/dashboards/dashboard-widgets.html
- SUSE Observability monitor CLI documentation: https://documentation.suse.com/cloudnative/suse-observability/latest/en/use/alerting/k8s-add-monitors-cli.html
- SUSE Observability notification documentation: https://documentation.suse.com/cloudnative/suse-observability/latest/en/use/alerting/notifications/configure.html
- SUSE Observability CLI documentation: https://documentation.suse.com/cloudnative/suse-observability/latest/en/setup/cli/cli-sts.html
- SUSE Observability API key deprecation documentation: https://documentation.suse.com/cloudnative/suse-observability/latest/en/use/security/k8s-ingestion-api-keys.html
- Published SUSE Observability Helm chart index and chart values: https://charts.rancher.com/server-charts/prime/suse-observability/index.yaml

## Issues Found
- The prerequisites used outdated or underspecified version guidance. Updated them to reference the compatibility matrix, current Rancher-integrated compatibility, Helm 3.13.1+, and sizing-profile-based capacity.
- The install command used legacy top-level Helm values (`license` and `baseUrl`) and omitted required current global-mode values. Updated it to use `global.suseObservability.license`, `baseUrl`, `sizing.profile`, and `adminPassword`.
- The agent repository and chart reference were incorrect. The agent chart is in the same `suse-observability` Helm repository, so the command now uses `suse-observability/suse-observability-agent`.
- The agent URL used `/receiver/sinks/generic`, which is not the documented SUSE Observability agent receiver path. Updated it to `/receiver/stsAgent`.
- The agent values file used invalid chart keys such as `clusterName`, `kubernetes.enabled`, `containerRuntime.enabled`, and `nodeAgent.enabled`. Replaced them with current chart values including `stackstate.cluster.name`, `clusterAgent.collection.*`, and `nodeAgent.containers.agent.resources.requests`.
- The log selectors used `app.kubernetes.io/name=stackstate-agent`, which does not match the current chart labels. Updated the examples to select by release instance and component labels.
- The UI access commands referenced a non-existent `svc/suse-observability` service. Updated them to use the documented router service, `suse-observability-router`.
- The health rule YAML was not a documented SUSE Observability monitor or health ingestion format. Replaced it with a documented `Monitor` STY/YAML example for a Kubernetes deployment threshold monitor.
- The monitor CLI example used a non-existent `stackstate monitor create` command and inline flags. Updated it to the documented `sts monitor apply -f monitor.yaml`, `sts monitor list`, and `sts monitor status` workflow.
- The troubleshooting commands referenced an undocumented server health endpoint, an incorrect agent DaemonSet name, and an incorrect config map name. Replaced them with documented Helm/pod checks and current agent resource names from the chart templates.

## Review Notes
- API keys are deprecated for ingestion and SUSE recommends service tokens. The post now uses a placeholder that allows either a service token or a receiver API key because the current agent chart still accepts the value through `stackstate.apiKey`.
- `helm` and `kubectl` were not installed in the local review environment, so command behavior was checked against official SUSE documentation and the published Helm chart templates rather than local CLI help output.
