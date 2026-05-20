# Validation Summary: How to Use argocd cluster Commands for Cluster Management

## Status
validated

## Post Type
Tutorial / CLI guide

## Technologies Covered
- Argo CD
- Argo CD CLI
- Kubernetes
- ApplicationSet
- Amazon EKS
- Google Kubernetes Engine
- Azure Kubernetes Service
- Bash and jq

## Sources Consulted
- Argo CD command reference: `argocd cluster add` - https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_cluster_add/
- Argo CD command reference: `argocd cluster list` - https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_cluster_list/
- Argo CD command reference: `argocd cluster get` - https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_cluster_get/
- Argo CD command reference: `argocd cluster set` - https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_cluster_set/
- Argo CD command reference: `argocd cluster rm` - https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_cluster_rm/
- Argo CD command reference: `argocd cluster rotate-auth` - https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_cluster_rotate-auth/
- Argo CD operator manual: Cluster Management - https://argo-cd.readthedocs.io/en/latest/operator-manual/cluster-management/
- Argo CD operator manual: Declarative Setup / Clusters - https://argo-cd.readthedocs.io/en/latest/operator-manual/declarative-setup/#clusters
- Argo CD operator manual: Security / External Cluster Credentials - https://argo-cd.readthedocs.io/en/latest/operator-manual/security/#external-cluster-credentials
- AWS CLI command reference: `eks update-kubeconfig` - https://docs.aws.amazon.com/cli/latest/reference/eks/update-kubeconfig.html

## Issues Found
- The `argocd cluster rotate-auth` example used a kubeconfig context name. The command takes a registered cluster server or name, so the example now uses `staging-cluster`.
- The removal section said `argocd cluster rm` also cleans up the ServiceAccount in the target cluster. Official documentation describes it as removing the cluster entry/credentials from Argo CD; manual revocation of RBAC artifacts is a separate step, so the comment was corrected.
- The EKS example passed the cluster ARN as the `CONTEXT` argument. For the standard Argo CD CLI flow, the context is supplied separately and EKS auth is enabled with `--aws-cluster-name`; the example now creates a stable kubeconfig context alias and uses `--aws-cluster-name`.
- The troubleshooting section checked `clusterrolebinding argocd-manager-role`, but the default binding created by `argocd cluster add` is `argocd-manager-role-binding`. The command was corrected.
- The troubleshooting token-secret check relied on grepping for an `argocd-manager` token secret, which is unreliable across Kubernetes service account token behavior. It now checks the registered cluster status through Argo CD.
- The certificate troubleshooting section used `argocd cert add-tls`, which manages repository TLS certificates, not Kubernetes cluster CA trust. The guidance now points to the kubeconfig CA data and declarative cluster secret `tlsClientConfig.caData`.

## Review Notes
- The post remains a valid technical guide after the corrections.
- The sample scripts assume GNU-compatible `column -N` and require `jq`; that is acceptable for the shown Bash examples but may need adjustment on systems with a different `column` implementation.
