# Validation Summary: How to Roll Back Istio Helm Release

## Status
validated

## Post Type
Tutorial / operations guide

## Technologies Covered
- Istio
- Helm
- Kubernetes
- kubectl
- istioctl

## Sources Consulted
- Helm command reference: `helm rollback` - https://helm.sh/docs/helm/helm_rollback/
- Helm command reference: `helm history` - https://helm.sh/docs/helm/helm_history/
- Helm command reference: `helm get values` - https://helm.sh/docs/helm/helm_get_values/
- Helm chart best practices for CRDs - https://helm.sh/docs/chart_best_practices/custom_resource_definitions/
- Istio Install with Helm - https://istio.io/latest/docs/setup/install/helm/
- Istio Upgrade with Helm - https://istio.io/latest/docs/setup/upgrade/helm/
- Istio Canary Upgrades - https://istio.io/latest/docs/setup/upgrade/canary/
- Kubernetes kubectl label reference - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_label/
- Kubernetes kubectl command reference - https://kubernetes.io/docs/reference/kubectl/kubectl-cmds/

## Issues Found
- The post said Istio has three Helm charts. Current Istio Helm installs can include optional or mode-specific charts, so this was narrowed to a typical sidecar-mode install using base resources, Istiod, and installed gateways.
- The base rollback comment said CRDs are additive. That was too absolute, so it now says Istio CRD changes are generally backward-compatible.
- The CRD check used `.metadata.resourceVersion`, which is a Kubernetes object metadata value rather than the served CRD API versions. Changed it to inspect `.spec.versions[*].name`.
- The canary rollback example removed `istio.io/rev` and restored `istio-injection=enabled`, which does not correctly roll back a revision-based namespace to an older revision. Changed it to set `istio.io/rev` to an explicit old revision and restart workloads.
- The stuck rollback example used `helm rollback --force`, which is a Helm 3 flag but is not present in the current Helm 4 rollback reference. Updated the example to use Helm 4's `--force-replace` and noted the Helm 3 equivalent.

## Review Notes
The remaining commands are consistent with the documented Helm release workflow, Istio Helm install/upgrade guidance, and Kubernetes label/rollout command syntax. The `helm diff revision` command depends on the Helm Diff plugin, so readers need that plugin installed for that optional comparison command.
