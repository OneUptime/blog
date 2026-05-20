# Validation Summary: How to Right-Size ArgoCD Components for Your Workload

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD
- Kubernetes Deployments and StatefulSets
- Kubernetes resource requests and limits
- Kubernetes Vertical Pod Autoscaler
- Kubernetes HorizontalPodAutoscaler
- Prometheus metrics
- Redis HA
- Helm and Kustomize manifest generation

## Sources Consulted
- Argo CD High Availability documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/high_availability/
- Argo CD Metrics documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/metrics/
- Argo CD `argocd-cmd-params-cm` parameters: https://argo-cd.readthedocs.io/en/stable/operator-manual/argocd-cmd-params-cm-yaml/
- Argo CD `argocd app list` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_list/
- Argo CD standard install manifest: https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
- Argo CD HA install manifest: https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/ha/install.yaml
- Kubernetes Vertical Pod Autoscaling documentation: https://kubernetes.io/docs/concepts/workloads/autoscaling/vertical-pod-autoscale/
- Kubernetes Horizontal Pod Autoscaling documentation: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/

## Issues Found
- The sizing YAML snippets looked like complete Kubernetes manifests but omitted required `apps/v1` fields such as selectors. Added a note that they are strategic merge patches for existing Argo CD manifests.
- The small and medium controller snippets used `Deployment` for `argocd-application-controller`. The standard Argo CD install uses a `StatefulSet`, so these snippets were corrected to `StatefulSet`.
- The Redis HA patch targeted `argocd-redis-ha`, but the official HA manifest uses the StatefulSet name `argocd-redis-ha-server`. Updated the name.
- The VPA target referenced the application controller as a `Deployment`. Updated it to target the standard `StatefulSet`.
- The repo-server parallelism snippet lacked the target ConfigMap metadata. Added `apiVersion`, `kind`, `metadata.name`, and namespace for `argocd-cmd-params-cm`.
- The monitoring section described `argocd_app_reconcile` as queue depth. Argo CD documents it as a reconciliation-duration histogram, so the wording was corrected.
- The metrics examples used `kubectl exec` against controller and repo-server pods with `curl`, which is unreliable because those images do not guarantee curl availability and the controller is not a Deployment in the standard install. Replaced those examples with port-forwarding to documented metrics services/endpoints.
- The repo-server metric grep used the incomplete metric prefix `argocd_git_request_duration`. Updated it to the documented `argocd_git_request_duration_seconds`.
- The text described high repo-server Git request latency as manifest-generation latency. Updated it to refer specifically to slow Git access.

## Review Notes
The resource sizing tiers and per-resource allocation formula are operational guidance, not official Argo CD limits. Actual requirements depend on the number of clusters, managed resources, repository size, manifest generation tools, Kubernetes API latency, reconciliation frequency, and available cache behavior.
