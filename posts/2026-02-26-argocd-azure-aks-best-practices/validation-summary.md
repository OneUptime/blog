# Validation Summary: How to Use ArgoCD with Azure AKS Best Practices

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD
- GitOps
- Kubernetes
- Azure Kubernetes Service (AKS)
- Microsoft Entra ID / Azure Active Directory
- Azure Container Registry (ACR)
- Azure Workload Identity
- Azure Key Vault
- External Secrets Operator
- Azure Load Balancer
- Application Gateway Ingress Controller
- Azure Monitor
- Helm

## Sources Consulted
- Argo CD releases: https://github.com/argoproj/argo-cd/releases
- Argo CD Helm chart values: https://github.com/argoproj/argo-helm/blob/main/charts/argo-cd/values.yaml
- Argo CD declarative setup and Helm OCI repository configuration: https://argo-cd.readthedocs.io/en/latest/operator-manual/declarative-setup/
- Argo CD private repositories with Azure Workload Identity: https://argo-cd.readthedocs.io/en/release-3.1/user-guide/private-repositories/
- Argo CD ingress documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/ingress/
- Azure CLI AKS command reference: https://learn.microsoft.com/en-us/cli/azure/aks
- AKS Workload Identity documentation: https://learn.microsoft.com/en-us/azure/aks/workload-identity-deploy-cluster
- AKS internal load balancer documentation: https://learn.microsoft.com/en-us/azure/aks/internal-lb
- Application Gateway Ingress Controller annotations: https://learn.microsoft.com/en-us/azure/application-gateway/ingress-controller-annotations
- External Secrets Operator Azure Key Vault provider: https://external-secrets.io/v0.20.3/provider/azure-key-vault/

## Issues Found
- The Argo CD image tag used `v2.10.0`, which is outdated for a 2026 production best-practices guide. Updated it to `v3.4.1`, the current release shown in the official Argo CD releases.
- The ACR Helm OCI repository Secret used `url: myacr.azurecr.io` and empty password-based credentials while recommending managed identity. Updated the URL to include the pushed chart path and changed the Secret to use Argo CD's `useAzureWorkloadIdentity: "true"` field.
- The Azure Workload Identity example labeled the ServiceAccount instead of the repo-server pod. Updated the example to use Argo CD Helm values with `repoServer.podLabels` and `repoServer.serviceAccount.annotations`.
- The External Secrets Operator examples used `external-secrets.io/v1beta1`. Updated the examples to the current `external-secrets.io/v1` API.
- The Key Vault access command did not state that `az keyvault set-policy` applies to Key Vaults using the access policy permission model. Clarified the command comment.
- The AGIC HTTPS backend example did not include a trusted root certificate annotation for a TLS backend. Added `appgw.ingress.kubernetes.io/appgw-trusted-root-certificate`.
- The dedicated Argo CD node pool was described as a system node pool even though it is for workload placement. Changed it to a dedicated user node pool and added `--mode User`.
- The Azure Blob backup CronJob used the Azure CLI image but called `kubectl` without ensuring it was installed. Added `az aks install-cli` before the `kubectl` commands.

## Review Notes
The remaining examples are representative production patterns rather than complete end-to-end manifests. Operators should still adapt RBAC, network policy, Key Vault authorization model, ingress TLS mode, and backup authentication to their own AKS environment.
