# Validation Summary: How to Troubleshoot Application Issues with SUSE Observability

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- SUSE Observability
- SUSE Observability Agent
- Kubernetes and OpenShift
- Rancher
- Helm
- kubectl
- SUSE Observability Receiver API
- SUSE Observability CLI (`sts`)
- YAML and JSON configuration

## Sources Consulted
- SUSE Observability Kubernetes install: https://documentation.suse.com/cloudnative/suse-observability/latest/en/setup/install-stackstate/kubernetes_openshift/kubernetes_install.html
- SUSE Observability requirements and sizing: https://documentation.suse.com/cloudnative/suse-observability/latest/en/setup/install-stackstate/requirements.html
- SUSE Observability Rancher/Kubernetes compatibility: https://documentation.suse.com/cloudnative/suse-observability/latest/en/setup/install-stackstate/Compatibility%20Self%20Hosted.html
- SUSE Observability Kubernetes quick start guide: https://documentation.suse.com/cloudnative/suse-observability/latest/en/k8s-quick-start-guide.html
- SUSE Observability expose outside the cluster: https://documentation.suse.com/cloudnative/suse-observability/latest/en/setup/install-stackstate/kubernetes_openshift/ingress.html
- SUSE Observability Topology Perspective: https://documentation.suse.com/cloudnative/suse-observability/latest/en/use/views/k8s-topology-perspective.html
- SUSE Observability health data over HTTP and Repeat States JSON: https://documentation.suse.com/cloudnative/suse-observability/latest/en/configure/health/send-health-data/send-health-data.html and https://documentation.suse.com/cloudnative/suse-observability/latest/en/configure/health/send-health-data/repeat_states.html
- SUSE Observability CLI and monitor CLI docs: https://documentation.suse.com/cloudnative/suse-observability/latest/en/setup/cli/cli-sts.html and https://documentation.suse.com/cloudnative/suse-observability/latest/en/use/alerting/k8s-add-monitors-cli.html
- SUSE Observability advanced troubleshooting: https://documentation.suse.com/cloudnative/suse-observability/latest/en/setup/install-stackstate/advanced-troubleshooting.html
- SUSE Observability Helm repository index and chart archives: https://charts.rancher.com/server-charts/prime/suse-observability/index.yaml
- Helm command documentation: https://helm.sh/docs/helm/helm_upgrade/ and https://helm.sh/docs/helm/helm_repo_add/
- Kubernetes kubectl command documentation: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/, https://kubernetes.io/docs/reference/kubectl/generated/kubectl_port-forward/, and https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_restart/

## Issues Found
- The prerequisites were outdated and underspecified. Updated them to require a supported Kubernetes/OpenShift environment, a Rancher version matching the current compatibility matrix, Helm v3.13.1+, sizing-profile-based resources, and an admin password.
- The server install command used deprecated/incorrect top-level `license` and `baseUrl` values. Updated it to the current `global.suseObservability.*` chart values with `helm upgrade --install`.
- The agent chart repository URL was incorrect. The agent chart is published in the same SUSE Observability Helm repository, so the command now uses `suse-observability/suse-observability-agent`.
- The agent receiver endpoint used `/receiver/sinks/generic`, which is not the current agent endpoint. Updated agent commands and values to use `/receiver/stsAgent`.
- The agent values file used invalid chart fields such as top-level `clusterName`, `kubernetes.enabled`, `containerRuntime.enabled`, and `nodeAgent.enabled`. Replaced them with valid `stackstate.cluster.name` and `nodeAgent.containers.agent.resources` values.
- The verification commands used an incorrect label selector. Updated them to use `app.kubernetes.io/instance=stackstate-agent` and added `--all-containers=true` where appropriate.
- The UI access command targeted an unreliable service lookup and the wrong service name for port-forwarding. Updated it to use the configured external URL or `svc/suse-observability-router`.
- The health-state YAML was not a valid SUSE Observability API format. Replaced it with a valid Receiver API Repeat States JSON payload shape.
- The monitor command used a non-existent `stackstate monitor create` CLI. Updated it to the supported `sts monitor apply -f monitor.yaml`, with `sts monitor list` and `sts monitor status`.
- The troubleshooting commands used an invalid pod selector, an unverified health endpoint, the wrong agent DaemonSet name, and a non-existent config map. Replaced them with current pod/log/describe checks, correct agent rollout restart targets, and the generated agent URL and cluster-name config maps.

## Review Notes
- `helm` and `kubectl` were not installed in the local environment, so command execution was verified against official documentation and the published SUSE Observability Helm chart index/archives rather than local `--help` output.
- The SUSE Observability UI normally provides the exact Kubernetes StackPack agent install command for a given instance. The post now shows a generic self-hosted equivalent, but production users should still copy the instance-specific command from their SUSE Observability UI when available.
