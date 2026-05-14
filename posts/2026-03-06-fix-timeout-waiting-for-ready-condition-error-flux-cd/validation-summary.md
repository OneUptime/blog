# Validation Summary: How to Fix 'timeout waiting for ready condition' Error in Flux CD

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Flux CD Kustomization
- Flux CD HelmRelease
- Flux CLI
- Kubernetes Deployments
- Kubernetes probes
- Kubernetes image pull secrets
- Kubernetes resource requests and limits
- Kubernetes PersistentVolumeClaims and StorageClasses
- kubectl

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Kustomization CRD schema: https://raw.githubusercontent.com/fluxcd/kustomize-controller/main/config/crd/bases/kustomize.toolkit.fluxcd.io_kustomizations.yaml
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux CLI `reconcile kustomization` documentation: https://fluxcd.io/flux/cmd/flux_reconcile_kustomization/
- Flux CLI `create kustomization` documentation: https://fluxcd.io/flux/cmd/flux_create_kustomization/
- Kubernetes liveness, readiness, and startup probe documentation: https://kubernetes.io/docs/concepts/configuration/liveness-readiness-startup-probes/
- Kubernetes Deployment rolling update documentation: https://kubernetes.io/docs/tasks/run-application/update-deployment-rolling/
- Kubernetes Persistent Volumes documentation: https://kubernetes.io/docs/concepts/storage/persistent-volumes/
- Kubernetes resource management documentation: https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/
- Kubernetes kubectl rollout documentation: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/
- Kubernetes image pull secret documentation: https://kubernetes.io/docs/concepts/containers/images/

## Issues Found
- The post stated that Flux CD Kustomizations have a default timeout of 5 minutes. Current Flux Kustomization CRD schema documents `.spec.timeout` as defaulting to the Kustomization `.spec.interval`, so this was changed to describe the current default accurately.
- The Kustomization timeout example comment said it increased the timeout from a default 5 minutes. This was changed to say the timeout is being set explicitly.
- The troubleshooting command comment described `flux reconcile kustomization <name> --with-source --timeout=15m` as forcing reconciliation with an extended timeout. The Flux CLI `--timeout` flag controls how long the CLI waits for the operation, not the Kustomization controller's configured `.spec.timeout`, so the wording was corrected.

## Review Notes
The Flux and Kubernetes manifests use current API versions and valid fields. The HelmRelease example correctly uses `helm.toolkit.fluxcd.io/v2` with `.spec.install.timeout` and `.spec.upgrade.timeout`; these fields default to the global HelmRelease timeout when omitted. The Kustomization `dependsOn` example is valid, and the database Kustomization's `healthChecks` entry is what makes the dependency wait for the StatefulSet to become healthy.
