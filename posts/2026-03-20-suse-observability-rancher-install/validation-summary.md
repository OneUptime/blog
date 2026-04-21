# Validation Summary: How to Install SUSE Observability with Rancher

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- SUSE Observability
- SUSE Rancher / Rancher-managed Kubernetes
- Kubernetes
- Helm
- SUSE Observability Helm charts
- SUSE Observability Agent
- Kubernetes Ingress

## Sources Consulted
- SUSE Observability Rancher Prime installation documentation: https://documentation.suse.com/en-us/cloudnative/suse-observability/latest/en/k8s-suse-rancher-prime.html
- SUSE Observability Kubernetes installation documentation: https://documentation.suse.com/cloudnative/suse-observability/latest/en/setup/install-stackstate/kubernetes_openshift/kubernetes_install.html
- SUSE Observability requirements and sizing: https://documentation.suse.com/cloudnative/suse-observability/latest/en/setup/install-stackstate/requirements.html
- SUSE Observability compatibility matrix: https://documentation.suse.com/cloudnative/suse-observability/latest/en/setup/install-stackstate/Compatibility%20Self%20Hosted.html
- SUSE Observability Kubernetes quick start guide: https://documentation.suse.com/cloudnative/suse-observability/latest/en/k8s-quick-start-guide.html
- SUSE Observability Helm chart repository metadata: https://charts.rancher.com/server-charts/prime/suse-observability/index.yaml
- SUSE Observability chart values: https://charts.rancher.com/server-charts/prime/suse-observability/suse-observability-2.9.0.tgz
- SUSE Observability Agent chart values: https://charts.rancher.com/server-charts/prime/suse-observability/suse-observability-agent-1.2.45.tgz
- Helm command documentation: https://helm.sh/docs/helm/helm_install/ and https://helm.sh/docs/helm/helm_repo_add/
- Kubernetes kubectl reference: https://kubernetes.io/docs/reference/kubectl/

## Issues Found
- The description claimed the post connects the Rancher UI, but the tutorial installs SUSE Observability and its agent rather than the Rancher UI extension. Updated the description to refer to connecting a monitored cluster.
- The prerequisites used outdated or incomplete requirements. Updated them to reference supported Rancher/Kubernetes versions, Helm 3.13.1+, a required license key, and sizing-profile resources.
- The server `values.yaml` used legacy/deprecated chart keys and omitted required current settings such as `global.suseObservability.adminPassword` and `global.suseObservability.sizing.profile`. Replaced it with the current `global.suseObservability` structure.
- The ingress values used an old ingress class annotation and host path shape that does not match the current chart values. Updated the snippet to use `ingressClassName`, chart-level `path`, and current annotations.
- The storage overrides used old per-component keys for Elasticsearch, Kafka, and ZooKeeper. Replaced them with the supported `global.storageClass` guidance and sizing-profile defaults.
- The install command used `helm install` only. Updated it to `helm upgrade --install`, matching SUSE's documented install pattern and making the command reusable.
- The verification log command targeted `deployment/suse-observability-server`, but current split-server deployments use `suse-observability-api`. Updated the log command.
- The agent repository URL was invalid; the agent chart is in the main SUSE Observability Helm repository. Updated the repo and chart reference.
- The agent `stackstate.url` pointed to `/receiver/solarwinds`, but the current agent chart expects the SUSE Observability base URL and appends its own ingest paths. Updated it to the base URL.
- The agent values included `nodeAgent.enabled`, which is not a current top-level agent chart value, and omitted `checksAgent.enabled`. Removed the invalid key and added the checks agent.
- The UI access instructions referred to default admin credentials. Updated them to use the configured `adminPassword`.
- The data verification navigation used outdated wording. Updated it to the current Kubernetes menu and Clusters flow.

## Review Notes
The current SUSE docs recommend installing the Kubernetes StackPack in the SUSE Observability UI and using the generated agent command. The post now keeps a direct Helm example, but notes that the StackPack instance should be created first and that the cluster name/API key must match it.
