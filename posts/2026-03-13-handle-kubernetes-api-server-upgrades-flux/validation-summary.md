# Validation Summary: How to Handle Kubernetes API Server Upgrades with Flux

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes
- Kubernetes API server upgrades
- kubeadm
- Flux CD v2
- Flux CLI
- HelmReleases and Kustomizations
- Pluto
- etcd snapshots
- Amazon EKS
- Google Kubernetes Engine

## Sources Consulted
- Kubernetes kubeadm upgrade documentation: https://kubernetes.io/docs/tasks/administer-cluster/kubeadm/kubeadm-upgrade/
- Kubernetes API health endpoints documentation: https://kubernetes.io/docs/reference/using-api/health-checks/
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- Kubernetes Deprecated API Migration Guide: https://kubernetes.io/docs/reference/using-api/deprecation-guide/
- Flux CLI reference: https://fluxcd.io/flux/cmd/flux/
- Flux `get all` CLI reference: https://fluxcd.io/flux/cmd/flux_get_all/
- Flux `get kustomizations` CLI reference: https://fluxcd.io/flux/cmd/flux_get_kustomizations/
- Flux upgrade documentation: https://fluxcd.io/flux/installation/upgrade/
- Flux release documentation: https://fluxcd.io/flux/releases/
- Pluto installation documentation: https://pluto.docs.fairwinds.com/installation/
- Pluto quickstart documentation: https://pluto.docs.fairwinds.com/quickstart/
- Pluto advanced usage documentation: https://pluto.docs.fairwinds.com/advanced/
- AWS EKS `update-cluster-version` CLI reference: https://docs.aws.amazon.com/cli/latest/reference/eks/update-cluster-version.html
- Google Cloud `gcloud container clusters upgrade` CLI reference: https://cloud.google.com/sdk/gcloud/reference/container/clusters/upgrade
- FairwindsOps Pluto GitHub releases: https://github.com/FairwindsOps/pluto/releases

## Issues Found
- The post said any deprecated API version in Git manifests would fail after upgrade. This is only true for APIs removed in the target Kubernetes version, so the wording now distinguishes deprecated APIs from removed APIs.
- The Pluto CLI direct download URL did not match the actual GitHub release asset naming. It now uses a `PLUTO_VERSION` variable and the correct `pluto_<version>_linux_amd64.tar.gz` asset pattern.
- The Pluto in-cluster scan comment incorrectly described `detect-all-in-cluster` as checking Kustomize manifests. It now describes checking in-cluster resources and Helm release manifests.
- The Ingress example marked `ingressClassName` as required in `networking.k8s.io/v1`. It is not universally required, so the comment now says to use it when no default IngressClass is configured.
- The Flux suspension comment claimed all Flux sources and reconcilers were suspended, but the commands only suspend Kustomizations and HelmReleases. The comment now matches the commands.
- The API server health check used `kubectl get componentstatuses`, which relies on the deprecated ComponentStatus API. It now uses the Kubernetes API server `/readyz?verbose` endpoint through `kubectl get --raw`.
- The Flux update example pinned `v2.3.0`, which is outdated relative to current Flux releases and unnecessary for a general guide. It now exports the latest version supported by the installed Flux CLI.
- The convergence wait command used `flux get kustomization infrastructure --watch`, while current Flux CLI documentation exposes `flux get kustomizations` as the status command. It now uses `kubectl wait` against the Flux Kustomization Ready condition.
- The final verification used `grep "False"` over Flux output. It now uses Flux's documented `--status-selector ready=false` filter after showing all resources.

## Review Notes
The kubeadm, EKS, GKE, Flux suspend/resume/reconcile, Pluto detection, Ingress v1 backend, and etcd snapshot examples are broadly consistent with the referenced documentation. The guide intentionally uses Kubernetes v1.30 examples; future reviews should update pinned example versions and the Pluto release version if the post is refreshed.
