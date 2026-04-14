# Validation Summary: How to Deploy Dapr with Helm on Kubernetes

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Helm (Kubernetes package manager)
- Kubernetes
- Argo CD (GitOps)

## Sources Consulted
- Dapr Helm chart values.yaml: https://github.com/dapr/dapr/blob/master/charts/dapr/values.yaml
- Dapr Helm chart README: https://github.com/dapr/dapr/blob/master/charts/dapr/README.md
- Dapr Kubernetes deployment docs: https://docs.dapr.io/operations/hosting/kubernetes/kubernetes-deploy/
- Dapr release/support policy: https://docs.dapr.io/operations/support/support-release-policy/
- Dapr sidecar injector chart values: https://github.com/dapr/dapr/blob/master/charts/dapr/charts/dapr_sidecar_injector/values.yaml
- Dapr Dashboard chart: https://github.com/dapr/dashboard
- Helm CLI docs (helm search repo): https://helm.sh/docs/helm/helm_search_repo/
- Argo CD Helm source docs: https://argo-cd.readthedocs.io/en/stable/user-guide/helm/

## Issues Found

1. **Invalid Helm flag `--dap 5`**: `helm search repo dapr --dap 5` used a non-existent `--dap` flag. Fixed to `helm search repo dapr --versions | head -5`.

2. **Incorrect placement Raft config key**: `dapr_placement.raft.logStorePath` is not a valid Helm value. The correct key is `dapr_placement.cluster.logStorePath` with a default path of `/var/run/dapr/raft-log`. Also removed the unnecessary custom volumeMounts/volumes since the chart manages placement storage internally.

3. **Fabricated `defaultContainerConfig` Helm value**: `dapr_sidecar_injector.defaultContainerConfig` does not exist in the Dapr Helm chart. Replaced with the actual supported values: `sidecarRunAsNonRoot` and `sidecarReadOnlyRootFilesystem`.

4. **Missing CRD in cleanup command**: The uninstall CRD cleanup was missing `httpendpoints.dapr.io`. Added it to the `kubectl delete crd` command.

5. **Incorrect `global.imagePullPolicy` default**: The configuration table claimed the default is `Always`, but the actual default is `IfNotPresent`. Fixed the table.

6. **Invalid ArgoCD valueFiles reference**: The ArgoCD Application manifest used `valueFiles: [dapr-values.yaml]` with a Helm repo source, which doesn't work because valueFiles can only reference files inside the chart package. Replaced with inline `values` block, which is the correct approach for Helm repo sources.

7. **Outdated Kubernetes version requirement**: Changed "Kubernetes 1.22+" (which is EOL) to reference Dapr's version skew policy, which aligns with the 3 most recent supported Kubernetes minor versions.

## Review Notes
- The `dapr_scheduler` component and its HA configuration are included, which is correct for Dapr 1.14+. The scheduler was introduced as a control plane component in Dapr 1.14.
- The ArgoCD example targets version `1.14.0` specifically. Users should update this to their desired version. A note about using ArgoCD multi-source applications for external values files could be a useful future addition.
- The Dapr Dashboard is correctly shown as a separate Helm chart installation, which is accurate.
