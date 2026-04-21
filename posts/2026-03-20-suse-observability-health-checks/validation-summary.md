# Validation Summary: How to Configure Health Checks in SUSE Observability

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- SUSE Observability
- SUSE Observability Helm charts
- SUSE Observability Agent
- SUSE Observability `sts` CLI
- Kubernetes
- Helm
- Health synchronization, external monitors, and threshold monitors

## Sources Consulted
- SUSE Observability Kubernetes installation documentation: https://documentation.suse.com/cloudnative/suse-observability/latest/en/setup/install-stackstate/kubernetes_openshift/kubernetes_install.html
- SUSE Observability requirements and sizing: https://documentation.suse.com/cloudnative/suse-observability/latest/en/setup/install-stackstate/requirements.html
- SUSE Observability compatibility matrix: https://documentation.suse.com/cloudnative/suse-observability/latest/en/setup/install-stackstate/Compatibility%20Self%20Hosted.html
- SUSE Observability Kubernetes quick start guide: https://documentation.suse.com/cloudnative/suse-observability/latest/en/k8s-quick-start-guide.html
- SUSE Observability ingress and router service documentation: https://documentation.suse.com/cloudnative/suse-observability/latest/en/setup/install-stackstate/kubernetes_openshift/ingress.html
- SUSE Observability health synchronization documentation: https://documentation.suse.com/cloudnative/suse-observability/latest/en/configure/health/health-synchronization.html
- SUSE Observability health payload documentation: https://documentation.suse.com/cloudnative/suse-observability/latest/en/configure/health/send-health-data/repeat_snapshots.html
- SUSE Observability monitor CLI documentation: https://documentation.suse.com/cloudnative/suse-observability/latest/en/use/alerting/k8s-add-monitors-cli.html
- SUSE Observability CLI documentation: https://documentation.suse.com/cloudnative/suse-observability/latest/en/setup/cli/cli-sts.html
- SUSE Observability Helm chart repository metadata and chart values: https://charts.rancher.com/server-charts/prime/suse-observability/index.yaml
- Helm command documentation: https://helm.sh/docs/helm/helm_upgrade/
- Kubernetes kubectl reference: https://kubernetes.io/docs/reference/kubectl/

## Issues Found
- The prerequisites used outdated version and resource guidance. Updated them to refer to the SUSE Observability compatibility matrix, Helm v3.13.1+, sizing-profile resources, persistent storage, and an administrator password.
- The architecture section used the old "StackState Server" name and underspecified the current platform components. Updated it to describe SUSE Observability Server, agents, receiver, and UI responsibilities.
- The server install command used obsolete top-level `license` and `baseUrl` values and did not provide required current settings. Updated it to `helm upgrade --install` with `global.suseObservability.license`, `baseUrl`, `sizing.profile`, and `adminPassword`.
- The agent installation used a non-existent separate agent Helm repository and old `stackstate-agent` release/namespace names. Updated it to use the official `suse-observability/suse-observability-agent` chart in the main repository.
- The agent URL used `/receiver/sinks/generic`, which does not match the documented agent receiver path. Updated it to `/receiver/stsAgent`.
- The agent values used unsupported keys such as top-level `clusterName`, `kubernetes.enabled`, `containerRuntime.enabled`, and `nodeAgent.enabled`. Replaced them with current `stackstate.cluster`, `clusterAgent.collection`, `logsAgent`, `checksAgent`, and `nodeAgent.containers.agent.resources` values.
- The verification commands used old namespaces, labels, and a brittle log grep. Updated them to check current agent pods, deployment/daemonset rollouts, and cluster-agent logs.
- The UI access commands targeted an arbitrary service and the wrong service name. Updated them to use the `suse-observability-router` service and noted the documented `stackstate.allowedOrigins` requirement for localhost port-forwarding.
- The health-state example used an unsupported `health_rule` schema. Replaced it with a documented `ExternalMonitor` configuration and a valid `REPEAT_SNAPSHOTS` health payload shape.
- The alert example used a non-existent `stackstate monitor create` command and unsupported flags. Replaced it with a documented `sts monitor apply -f monitor.yaml` threshold monitor example.
- The troubleshooting commands used an unverified server health endpoint, old selectors, old daemonset names, and an old configmap name. Replaced them with Helm/pod inspection and current agent rollout/configmap commands.
- A shell placeholder used angle brackets in a command position. Replaced it with a `POD_NAME` variable so the snippet remains valid shell syntax.

## Review Notes
The local workspace does not have `helm` or `kubectl` installed, so CLI behavior was validated against official documentation and live Helm chart contents rather than by executing against a Kubernetes cluster. The updated shell blocks pass `bash -n`, and the fenced YAML and JSON snippets parse successfully.
