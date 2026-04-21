# Validation Summary: How to Install SUSE Observability in Rancher

## Status
validated

## Post Type
Tutorial / installation guide

## Technologies Covered
- SUSE Observability
- Rancher / Rancher-managed Kubernetes
- Kubernetes / RKE2
- Helm
- SUSE Observability Agent
- SUSE Observability CLI (`sts`)
- StackState monitor definitions

## Sources Consulted
- SUSE Observability for Rancher Prime: https://documentation.suse.com/en-us/cloudnative/suse-observability/latest/en/k8s-suse-rancher-prime.html
- SUSE Observability Kubernetes install: https://documentation.suse.com/cloudnative/suse-observability/latest/en/setup/install-stackstate/kubernetes_openshift/kubernetes_install.html
- SUSE Observability requirements and sizing: https://documentation.suse.com/cloudnative/suse-observability/latest/en/setup/install-stackstate/requirements.html
- SUSE Observability Agent quick start guide: https://documentation.suse.com/cloudnative/suse-observability/latest/en/k8s-quick-start-guide.html
- SUSE Observability ingress and router service documentation: https://documentation.suse.com/cloudnative/suse-observability/latest/en/setup/install-stackstate/kubernetes_openshift/ingress.html
- SUSE Observability CLI (`sts`) documentation: https://documentation.suse.com/cloudnative/suse-observability/latest/en/setup/cli/cli-sts.html
- SUSE Observability monitor CLI documentation: https://documentation.suse.com/cloudnative/suse-observability/latest/en/setup/custom-integrations/monitors/cli.html
- Published SUSE Observability Helm chart repository index: https://charts.rancher.com/server-charts/prime/suse-observability/index.yaml
- Published `suse-observability`, `suse-observability-agent`, and `suse-observability-values` Helm chart `values.yaml` and README files from the SUSE chart repository.

## Issues Found
- The prerequisites were outdated. Replaced broad Kubernetes/Rancher/Helm version claims and the 16 GB RAM claim with compatibility-matrix, Helm 3.13.1+, sizing-profile, SSD-backed storage, and privilege requirements from SUSE documentation.
- The server install command used legacy/non-current chart values (`license`, `baseUrl`) and omitted required simplified-mode values. Updated it to `global.suseObservability.*`, included an admin password and sizing profile, and used `helm upgrade --install`.
- The agent repository URL was incorrect. The `suse-observability-agent` chart is published in the same `suse-observability` Helm repository, so the agent commands now use `suse-observability/suse-observability-agent`.
- The agent command omitted the required `stackstate.cluster.name` value and used the wrong receiver path. Added `stackstate.cluster.name`, recommended `stackstate.cluster.authToken`, and corrected the receiver URL to `/receiver/stsAgent`.
- The agent values snippet used non-existent fields such as `clusterName`, `kubernetes.enabled`, `containerRuntime.enabled`, and `nodeAgent.resources`. Replaced them with chart-supported `stackstate.cluster.*`, `clusterAgent.collection.*`, and `nodeAgent.containers.agent.resources.*` fields.
- Verification commands used incorrect namespaces, labels, resource names, and a brittle log string. Updated them to match the default `suse-observability-agent` release labels and current generated resources.
- The UI access commands referenced a non-existent `svc/suse-observability` service. Updated the commands to use the router service `suse-observability-router`, and added localhost as an allowed origin in the install command for port-forwarded access.
- The health-rule YAML example did not match SUSE Observability monitor configuration. Replaced it with a monitor STY example using the documented `Monitor` node format and the Kubernetes threshold monitor function.
- The `stackstate monitor create` command was not a valid current CLI command. Replaced it with `sts monitor apply -f monitor.yaml` and `sts monitor list`.
- Troubleshooting commands used incorrect selectors and a questionable internal health endpoint. Replaced them with official first-line troubleshooting checks and corrected agent resource/configmap names.

## Review Notes
`helm` and `kubectl` were not installed in the local workspace, so CLI help output could not be checked locally. Commands and values were validated against current SUSE documentation and the published Helm chart metadata/templates instead.
