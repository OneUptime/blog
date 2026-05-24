# Validation Summary: How to Fix Terraform Kubernetes Unauthorized Errors

## Status
validated

## Post Type
Troubleshooting guide / Tutorial

## Technologies Covered
- Terraform (HashiCorp)
- Terraform Kubernetes provider
- Kubernetes RBAC (ClusterRole, ClusterRoleBinding, Role, RoleBinding)
- Amazon EKS (and aws-auth ConfigMap)
- Google GKE (with `google_client_config` and `gcloud`)
- Azure AKS (with Azure AD integration)
- kubectl CLI (`auth whoami`, `auth can-i`, `create token`)
- AWS CLI (`aws eks get-token`)
- Kubernetes service accounts and token authentication
- client-go exec credential plugins (`client.authentication.k8s.io/v1beta1`)

## Sources Consulted
- Terraform Kubernetes provider docs: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs
- Terraform AWS provider docs (aws_eks_cluster_auth, aws_eks_cluster): https://registry.terraform.io/providers/hashicorp/aws/latest/docs
- AWS EKS auth docs (token expiration, aws-auth ConfigMap): https://docs.aws.amazon.com/eks/latest/userguide/cluster-auth.html
- AWS CLI `aws eks get-token` reference: https://awscli.amazonaws.com/v2/documentation/api/latest/reference/eks/get-token.html
- Kubernetes client-go credential plugin reference: https://kubernetes.io/docs/reference/access-authn-authz/authentication/#client-go-credential-plugins
- Kubernetes RBAC docs: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- `kubectl create token` docs (GA in 1.25): https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#create-token
- `kubectl auth whoami` (added in 1.26): https://kubernetes.io/docs/reference/access-authn-authz/authentication/#self-subject-review
- GKE authentication docs: https://cloud.google.com/kubernetes-engine/docs/how-to/cluster-access-for-kubectl
- AKS `az aks get-credentials` docs: https://learn.microsoft.com/en-us/cli/azure/aks
- `kubernetes_config_map_v1_data` resource: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/config_map_v1_data

## Issues Found
No technical issues found.

All technical claims, code examples, and CLI commands are accurate:
- `aws_eks_cluster_auth` token's ~15-minute lifetime is correct.
- The recommended `exec` block with `client.authentication.k8s.io/v1beta1` and `aws eks get-token` is the canonical pattern (v1beta1 remains supported by the AWS CLI and current Kubernetes versions).
- The `kubernetes_config_map_v1_data` resource and its `force = true` attribute are correctly used for adopting the existing `aws-auth` ConfigMap.
- ClusterRole/ClusterRoleBinding/Role/RoleBinding HCL syntax matches the current provider schema.
- The legacy service-account-secret method is correctly framed as for pre-1.24 clusters, and the `kubectl create token` example with `--duration` is correct for 1.24+.
- `kubectl auth whoami` (1.26+) and `kubectl auth can-i --list` invocations are accurate.
- The AKS `--admin` flag explanation is correct (it returns cluster-admin credentials and bypasses Azure AD).

## Review Notes
- The post does not mention EKS Access Entries, which AWS introduced in late 2023 as a modern alternative to the `aws-auth` ConfigMap. The ConfigMap approach is still fully supported and remains widely deployed, so this is not an error — just a future enhancement opportunity.
- The `kubectl create token ... --duration=8760h` example will be capped by the API server's configured maximum token expiration (default 24h via `--service-account-max-token-expiration`). The flag is syntactically valid; users may simply receive a shorter token than requested depending on cluster configuration. Worth noting but not incorrect.
- The ClusterRole rule includes `"extensions"` in `api_groups`. The `extensions` group is largely vestigial in modern Kubernetes (most resources moved to `apps`, `networking.k8s.io`, etc., by 1.16), but including it does no harm.
- The EKS and GKE provider snippets reference `data.aws_eks_cluster.cluster.*` and `data.google_container_cluster.cluster.*` without showing those data source declarations. This is a common brevity convention in blog snippets and not a technical error.
