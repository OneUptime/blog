# Validation Summary: Design Cloud-Neutral Identity Across AWS, Entra, and Google Cloud

## Status
validated

## Post Type
Architecture guide

## Technologies Covered

- OpenID Connect (OIDC), OAuth 2.0, SAML, JWTs, and token exchange
- AWS IAM, AWS Security Token Service, IRSA, and EKS Pod Identity
- Microsoft Entra ID workload identity federation, Azure RBAC, and Microsoft Entra Workload ID for AKS
- Google Cloud IAM, Security Token Service, Workload Identity Federation, and Workload Identity Federation for GKE
- Kubernetes ServiceAccounts and projected service-account tokens
- AWS SDK credential provider chains, Azure Identity credentials, and Google Cloud Application Default Credentials
- SPIFFE and SPIRE workload identity

## Sources Consulted

- [OpenID Connect Core 1.0](https://openid.net/specs/openid-connect-core-1_0.html)
- [RFC 7519: JSON Web Token](https://www.rfc-editor.org/rfc/rfc7519)
- [RFC 8693: OAuth 2.0 Token Exchange](https://datatracker.ietf.org/doc/html/rfc8693)
- [Kubernetes service accounts](https://kubernetes.io/docs/concepts/security/service-accounts/)
- [Kubernetes service-account administration](https://kubernetes.io/docs/reference/access-authn-authz/service-accounts-admin/)
- [AWS temporary credentials with OIDC](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_temp_request.html)
- [IAM roles for service accounts on EKS](https://docs.aws.amazon.com/eks/latest/userguide/iam-roles-for-service-accounts.html)
- [IRSA and EKS Pod Identity comparison](https://docs.aws.amazon.com/eks/latest/userguide/service-accounts.html)
- [How EKS Pod Identity works](https://docs.aws.amazon.com/eks/latest/userguide/pod-id-how-it-works.html)
- [AWS SDK credential provider chains](https://docs.aws.amazon.com/sdkref/latest/guide/standardized-credentials.html)
- [AWS temporary-credential permission and revocation behavior](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_temp_control-access_disable-perms.html)
- [AWS IAM role-session revocation](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_use_revoke-sessions.html)
- [Microsoft Entra workload identity federation](https://learn.microsoft.com/en-us/entra/workload-id/workload-identity-federation)
- [Microsoft Entra federated identity credential considerations](https://learn.microsoft.com/en-us/entra/workload-id/workload-identity-federation-considerations)
- [Microsoft Entra Workload ID on AKS](https://learn.microsoft.com/en-us/azure/aks/workload-identity-overview)
- [Azure Identity credential chains](https://learn.microsoft.com/en-us/dotnet/azure/sdk/authentication/credential-chains)
- [Azure role assignments](https://learn.microsoft.com/en-us/azure/role-based-access-control/role-assignments)
- [Microsoft Entra access-token lifetime and validation](https://learn.microsoft.com/en-us/entra/identity-platform/access-tokens)
- [Google Cloud Workload Identity Federation](https://cloud.google.com/iam/docs/workload-identity-federation)
- [Workload Identity Federation for GKE](https://cloud.google.com/kubernetes-engine/docs/concepts/workload-identity)
- [Google Cloud Application Default Credentials](https://cloud.google.com/docs/authentication/application-default-credentials)
- [Google Cloud IAM access-change propagation](https://cloud.google.com/iam/docs/access-change-propagation)
- [Google Cloud token types and revocability](https://cloud.google.com/docs/authentication/token-types)
- [Google Cloud Workload Identity Pool provider deletion](https://cloud.google.com/iam/docs/reference/rest/v1/projects.locations.workloadIdentityPools.providers/delete)
- [SPIFFE concepts](https://spiffe.io/docs/latest/spiffe/concepts/)
- [SPIRE mTLS use case](https://spiffe.io/docs/latest/spire-about/use-cases/)

## Issues Found

- The credential-boundary guidance recommended every provider's default credential chain and named Azure `DefaultAzureCredential` without qualification. Current Azure SDK guidance recommends selecting a deterministic credential such as `WorkloadIdentityCredential` or `ManagedIdentityCredential` for deployed production applications because an unconstrained chain can select an unintended credential. Updated the prose and adapter diagram while retaining AWS's default chain and Google Cloud ADC.
- The access-removal test treated removing federation trust and removing provider permissions as equivalent and implied that either promptly invalidates access. Trust removal normally prevents new credential issuance but does not necessarily invalidate credentials already issued, whereas native permission changes can affect existing credentials after propagation. Split those expectations and made the revocation test distinguish credential issuance from resource authorization.

## Review Notes

- The Kubernetes `ServiceAccount` and `apps/v1` `Deployment` manifest parsed successfully with `kubectl create --dry-run=client --validate=false`; the `reports` namespace must already exist, and the example image digest is intentionally a placeholder that must be replaced before deployment.
- AKS Microsoft Entra Workload ID requires the `azure.workload.identity/use: "true"` Pod label for webhook mutation; common configurations also annotate the ServiceAccount with the Entra client ID. The post correctly assigns such provider-specific details to target overlays rather than the shared manifest.
- IRSA and EKS Pod Identity are correctly distinguished. EKS Pod Identity uses the EKS Pod Identity Agent and EKS Auth `AssumeRoleForPodIdentity`, while IRSA uses the projected OIDC token with STS `AssumeRoleWithWebIdentity`.
- Workload Identity Federation for GKE supports direct IAM principal bindings and optional IAM service-account impersonation as described. Principal-by-name bindings can identify the same namespace and ServiceAccount across clusters sharing a project workload identity pool, so cluster-specific conditions or separate projects may be required when those clusters do not share a trust boundary.
- Node credential isolation remains mechanism-specific: for example, EKS Pods using `hostNetwork: true` retain IMDS access, and GKE host-network Pods generally bypass the GKE metadata server. The post appropriately requires target-specific isolation testing.
