# Validation Summary: How to Install ArgoCD on Rancher Managed Clusters

## Status
validated

## Post Type
Tutorial / installation guide

## Technologies Covered
- Argo CD
- Argo CD CLI
- Argo CD Application and ApplicationSet custom resources
- Rancher Manager
- Rancher CLI
- Kubernetes
- Kubernetes ServiceAccounts and RBAC

## Sources Consulted
- Argo CD installation and getting started documentation: https://github.com/argoproj/argo-cd/blob/master/docs/getting_started.md
- Argo CD `argocd cluster add` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_cluster_add/
- Argo CD declarative cluster secret documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/declarative-setup/#clusters
- Argo CD Application specification reference: https://argo-cd.readthedocs.io/en/release-3.0/user-guide/application-specification/
- Argo CD ApplicationSet cluster generator documentation: https://argo-cd.readthedocs.io/en/release-2.12/operator-manual/applicationset/Generators-Cluster/
- Rancher CLI documentation: https://ranchermanager.docs.rancher.com/reference-guides/cli-with-rancher/rancher-cli
- Rancher cluster access documentation: https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/manage-clusters/access-clusters
- Kubernetes ServiceAccount administration documentation: https://kubernetes.io/docs/reference/access-authn-authz/service-accounts-admin/
- Kubernetes `kubectl create token` reference: https://kubernetes.io/docs/reference/kubectl/kubectl-cmds/#token

## Issues Found
- The Rancher proxy `argocd cluster add` example used `--server` as if it selected the target Kubernetes API server. In the Argo CD CLI, `--server` is an inherited flag for the Argo CD API server address. Changed the example to add a kubeconfig context whose cluster server already uses the Rancher proxy URL.
- The declarative Argo CD cluster secret mixed a direct downstream API server URL with a generic service account token. Updated it to show the Rancher proxy URL with a Rancher bearer token and Rancher CA placeholder, matching the surrounding Rancher proxy workflow.
- The ApplicationSet cluster generator selector attempted to exclude the local cluster with `key: name`. Cluster generator selectors match labels on Argo CD cluster secrets, not generated parameters. Changed the selector to match `argocd.argoproj.io/secret-type: cluster`, which selects registered remote cluster secrets and excludes the default local cluster.
- The troubleshooting section described ServiceAccount tokens as long-lived access. Kubernetes now recommends TokenRequest-based short-lived tokens, and long-lived token Secrets require deliberate creation. Reworded the statement to require an appropriate rotation process.

## Review Notes
- The remaining Argo CD install, initial admin secret, Application manifest, cluster secret structure, Rancher CLI login/kubeconfig usage, and Kubernetes RBAC commands are consistent with current official documentation.
- The guide intentionally uses broad `cluster-admin` permissions for simplicity. A production hardening follow-up should scope Argo CD target-cluster RBAC to the namespaces and resource types it must manage.
