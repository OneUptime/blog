# Validation Summary: How to Build Helm Charts from Scratch

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Helm charts
- Kubernetes manifests
- Go template syntax in Helm
- JSON Schema for Helm values
- Artifact Hub annotations

## Sources Consulted
- Helm Charts documentation: https://helm.sh/docs/topics/charts/
- Helm Chart Tests documentation: https://helm.sh/docs/topics/chart_tests/
- Helm install command documentation: https://helm.sh/docs/helm/helm_install/
- Helm test command documentation: https://helm.sh/docs/helm/helm_test/
- Helm dependency update command documentation: https://helm.sh/docs/helm/helm_dependency_update/
- Helm repo index command documentation: https://helm.sh/docs/helm/helm_repo_index/
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- Kubernetes Horizontal Pod Autoscaling documentation: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- Kubernetes ServiceAccount documentation: https://kubernetes.io/docs/concepts/security/service-accounts/
- Kubernetes Persistent Volumes documentation: https://kubernetes.io/docs/concepts/storage/persistent-volumes/
- Artifact Hub Helm annotations documentation: https://artifacthub.io/docs/topics/annotations/helm/

## Issues Found
- The Deployment template set `serviceAccountName` from `.Values.serviceAccount` and the default values had `serviceAccount.create: true`, but the post did not include a `templates/serviceaccount.yaml` template. I added the missing ServiceAccount template so the default chart renders the referenced ServiceAccount.
- The Deployment template included a PVC-backed volume when `persistence.enabled` is true and `values.yaml` defined persistence settings, but the post did not include a PVC template. I added `templates/pvc.yaml` using the documented Kubernetes PersistentVolumeClaim fields: `storageClassName`, `accessModes`, and `resources.requests.storage`.

## Review Notes
- Helm was not installed in the local environment, so CLI behavior was verified against the official Helm command documentation rather than local `helm --help` output.
- The examples target Helm 3 chart API `v2`. Helm 4 documentation is now live, but the reviewed Helm 3 chart structure and commands remain consistent with the official docs consulted.
