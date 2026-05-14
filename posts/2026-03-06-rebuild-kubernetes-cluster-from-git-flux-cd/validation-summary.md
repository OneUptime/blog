# Validation Summary: How to Rebuild a Kubernetes Cluster from Git with Flux CD

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Flux CD
- Kubernetes
- Helm and Flux HelmRelease resources
- Flux Kustomization resources
- SOPS with age keys
- Sealed Secrets
- Terraform
- eksctl and Amazon EKS
- Google Kubernetes Engine and gcloud
- cert-manager
- ingress-nginx
- Bitnami PostgreSQL and Redis Helm deployments

## Sources Consulted
- Flux bootstrap CLI documentation: https://fluxcd.io/flux/cmd/flux_bootstrap_github/
- Flux bootstrap common options: https://fluxcd.io/flux/cmd/flux_bootstrap/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux HelmRelease API documentation: https://fluxcd.io/flux/components/helm/api/v2/
- Flux HelmRelease guide: https://fluxcd.io/flux/guides/helmreleases/
- Flux SOPS guide: https://fluxcd.io/flux/guides/mozilla-sops/
- cert-manager Helm installation documentation: https://cert-manager.io/docs/installation/helm/
- cert-manager GitOps installation notes: https://cert-manager.io/docs/installation/continuous-deployment-and-gitops/
- ingress-nginx Helm chart documentation: https://github.com/kubernetes/ingress-nginx/blob/main/charts/ingress-nginx/README.md
- Kubernetes kubectl reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- Kubernetes kubectl cp reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_cp/
- Google Cloud SDK gcloud container clusters create reference: https://cloud.google.com/sdk/gcloud/reference/container/clusters/create
- Amazon EKS eksctl cluster creation documentation: https://docs.aws.amazon.com/eks/latest/eksctl/creating-and-managing-clusters.html
- Terraform apply command reference: https://developer.hashicorp.com/terraform/cli/commands/apply

## Issues Found
- The cert-manager HelmRelease used `installCRDs: true` with a semver range that could select current cert-manager versions where the documented Helm value is `crds.enabled=true`. Changed the version lower bound to `>=1.15.0 <2.0.0` and updated the values block to `crds.enabled: true`.
- The PostgreSQL restore command targeted `deployment/postgresql`, but the Bitnami PostgreSQL chart in the example creates a StatefulSet pod for the primary database in a standard standalone install. Changed the example to pipe the local dump into `postgresql-0` with `kubectl exec -i`.
- The Redis restore example copied an RDB file and then ran `BGSAVE`, which would save the current in-memory dataset and can overwrite the restored dump file. Changed the example to shut Redis down with `NOSAVE` and delete the pod so the StatefulSet restarts it from the restored RDB.

## Review Notes
- The Flux Kustomization `apiVersion`, `dependsOn`, `wait`, `timeout`, and SOPS `decryption` fields are current and match Flux documentation.
- The Flux bootstrap GitHub flags shown are current. In actual use, the command also requires appropriate GitHub authentication, such as `GITHUB_TOKEN`.
- The HelmRelease snippets assume the referenced `HelmRepository` resources and namespaces are defined elsewhere in the repository.
- Stateful data restoration remains workload-specific; production restore procedures should account for chart release names, pod names, credentials, persistence settings, and application downtime.
