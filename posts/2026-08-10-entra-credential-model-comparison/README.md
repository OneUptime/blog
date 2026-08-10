# Choosing an Entra Credential: Secret, Certificate, or Managed Identity

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Microsoft Entra ID, Managed Identity, Workload Identity Federation, Certificate, Client Secrets, Workload Security

Description: Choose an Entra workload credential using a practical preference order: managed identity, workload federation, certificate, then client secret only as an exception.

---

For a noninteractive workload, prefer the credential that creates the least secret-handling responsibility:

1. **Managed identity** for eligible Azure-hosted workloads.
2. **Workload identity federation** when an external platform or Kubernetes environment can present a trusted OIDC token.
3. **Certificate credential** when federation is unavailable but the workload can protect a private key.
4. **Client secret** only when the stronger options do not fit.

All four can ultimately authenticate a workload to Microsoft Entra, but their trust boundaries, portability, failure modes, and operational costs differ.

## Comparison

| Model | Best fit | Stored credential in workload? | Rotation owner | Main risk |
| --- | --- | --- | --- | --- |
| Client secret | Short-lived compatibility or constrained systems | Yes, shared password | Your team | Copying, leakage, expiry, encoding |
| Certificate | Confidential client without viable federation | Yes, private key | Your team/PKI | Private-key theft and rotation |
| Managed identity | Workload running on a supported Azure resource | No accessible credential | Azure manages underlying credential | Excessive assignment or identity attachment |
| Workload identity federation | GitHub Actions, Kubernetes, or another trusted OIDC platform | No long-lived Entra secret | External IdP plus Entra trust policy | Overbroad issuer/subject trust or CI compromise |

The credential proves the client identity. It does not grant access by itself. The service principal or managed identity still needs least-privilege roles or API permissions on each resource.

## Client Secrets

A client secret is a symmetric password associated with an app registration. The confidential client sends its value to the token endpoint:

```http
client_id=<application-client-id>
&client_secret=<url-encoded-secret-value>
&scope=https%3A%2F%2Fgraph.microsoft.com%2F.default
&grant_type=client_credentials
```

Client secrets are simple and widely supported, which makes them useful for a prototype or a legacy product that supports no other client authentication. Their simplicity transfers risk to operations:

- the secret must be copied once from Entra into a protected store;
- the value is retrievable only when created, not from its Secret ID later;
- every consumer can impersonate the application;
- logs, shell history, CI variables, or images can leak it;
- raw form requests must encode it correctly; and
- expiry and rotation can cause outages.

Never put a client secret in a browser, SPA, native mobile app, or shipped desktop binary. Those are public clients and cannot keep it confidential.

If a secret is unavoidable, use the shortest practical lifetime, a central secret manager, overlapping rotation, named ownership, and alerts before expiry. Do not share one registration and secret across unrelated workloads.

## Certificate Credentials

A certificate credential replaces a shared password with proof of possession of a private key. The application signs a client assertion, and Entra validates it against public certificate material registered on the application.

Advantages include:

- the private key never needs to be sent to Entra;
- asymmetric keys resist some shared-secret handling failures;
- certificate chains and hardware-backed key stores can integrate with enterprise PKI; and
- multiple certificate credentials support overlap during rotation.

However, a private key is still a credential your team must protect. Exportable PFX files copied among hosts recreate many secret-distribution risks. Prefer a managed key store or hardware-backed key where the runtime can sign without exporting the key.

Plan:

- certificate issuance and owner;
- private-key access policy;
- assertion construction through a maintained library;
- clock synchronization;
- overlapping certificate registration;
- expiry monitoring; and
- emergency revocation.

Microsoft recommends certificates when managed identity or a secure external identity provider is not possible.

## Managed Identity

Managed identities give supported Azure resources a Microsoft Entra service principal whose underlying credential is created, protected, and rotated by Azure. No administrator or application receives that credential.

Use managed identity when Microsoft’s app-registration security conditions fit:

- the workload runs in Azure;
- it does not need to sign in users;
- it is not itself acting as a web API/resource in a token flow; and
- it does not need a multitenant application identity.

A managed identity can still call resources outside Azure, including Microsoft Graph, when those resources accept Entra tokens and the identity has permission.

There are two lifecycle models:

- **system-assigned** identity is tied to one Azure resource and deleted with it;
- **user-assigned** identity is an independent Azure resource that can attach to several supported compute resources.

Microsoft's current developer guidance recommends user-assigned identities for most scenarios because they decouple identity lifecycle and can reduce object-creation/replication pressure. System-assigned identity remains useful when a one-to-one lifecycle and automatic cleanup are desirable.

Use the managed identity's `clientId` in code when selecting among user-assigned identities. Use its `principalId`-the service principal Object ID-when assigning Azure RBAC.

Managed does not mean ungoverned. Anyone who can attach a powerful user-assigned identity to compute can use its permissions. Protect identity-assignment rights, keep roles narrow, inventory attachments, and separate identities by trust boundary.

## Workload Identity Federation

Workload identity federation lets an external workload exchange a short-lived token from a trusted identity provider for a Microsoft Entra access token. The Entra app registration or user-assigned managed identity stores a **federated identity credential**, not a secret.

The trust normally matches:

- external issuer (`iss`);
- workload subject (`sub`); and
- audience (`aud`), commonly `api://AzureADTokenExchange`.

Examples include:

```text
GitHub Actions (name-based subject):
  issuer  = https://token.actions.githubusercontent.com
  subject = repo:octo-org/orders:environment:Production

GitHub Actions (immutable subject):
  issuer  = https://token.actions.githubusercontent.com
  subject = repo:octo-org@<owner-id>/orders@<repository-id>:environment:Production

Kubernetes:
  issuer  = <cluster OIDC issuer>
  subject = system:serviceaccount:orders:deployer
```

GitHub.com repositories created after July 15, 2026 use immutable default subjects containing the owner and repository IDs. Repositories created earlier retain the name-based format unless they opt in, while repositories renamed or transferred after that date move to the immutable format. GitHub Enterprise Server does not support immutable subjects. Configure Entra with the exact `sub` value that GitHub emits for the repository.

Entra validates the external token and, on a match, issues a token for the Entra workload identity. There is no long-lived Entra client secret in CI or the cluster.

Federation shifts trust to the external issuer and its workload controls. Secure:

- who can cause the issuer to mint the matching subject;
- protected branches/environments and approval rules;
- reusable workflow and dependency pinning;
- Kubernetes service-account and namespace controls;
- issuer signing-key and discovery integrity; and
- the Entra identity's downstream permissions.

Baseline federated credentials require explicit issuer, subject, and audience matching. Microsoft documents flexible federated identity credentials as **preview**; do not use preview expression matching as though it were baseline behavior. Microsoft also currently documents a maximum of 20 federated identity credentials per application or user-assigned managed identity. Verify the current limit and supported issuer algorithms before designing at scale.

System-assigned managed identities cannot currently receive external federated identity credentials; use an app registration or supported user-assigned managed identity.

## Choose by Hosting and Trust Boundary

### Azure App Service, Function, VM, Container App, or other supported Azure compute

Start with managed identity. Choose user-assigned when identity lifecycle must survive compute replacement or be shared deliberately. Choose system-assigned when identity should disappear with one resource.

### GitHub Actions deploying to Azure

Use workload identity federation tied to the exact repository and protected environment or ref. Avoid organization-wide wildcard trust. Give the Entra identity only the deployment role and scope it needs.

### AKS or another Kubernetes cluster with a trusted OIDC issuer

Use workload federation with a narrowly scoped service-account subject. Separate service accounts and Entra identities by workload and environment.

### On-premises daemon without OIDC workload identity

Use a certificate in a protected key store. Reassess whether the execution platform can provide federation before accepting long-term private-key operations.

### Legacy appliance supporting only client ID and secret

Use a dedicated app registration, least privilege, a protected secret store, short lifetime, and tested overlap rotation. Treat it as a documented exception with a migration owner.

### Multitenant SaaS daemon

A managed identity alone does not supply a multitenant application definition. Use an app registration and an appropriate credential or federation design, plus a service principal and consent in each customer tenant.

## Migration Paths

### Secret to Certificate

Register the public certificate, deploy client-assertion authentication, verify fresh token acquisition, then remove the secret after an overlap window.

### Secret to Managed Identity

Create/attach the identity, reproduce least-privilege resource assignments for its Principal ID, switch the workload to an Azure Identity managed credential, verify, then remove app credentials and stale assignments.

### Secret to Federation

Configure a federated identity credential with exact issuer/subject/audience, harden the external platform, update the workload's token exchange, test a fresh token, then remove the secret.

Do not leave the old credential indefinitely “for rollback.” Time-box the overlap and make rollback recreate a controlled credential if truly necessary.

## Operational Checklist

- One identity per meaningful workload and environment boundary.
- Least-privilege resource assignments independent of credential type.
- No production secrets in source, images, logs, or public clients.
- Credential inventory with owners and expiry where applicable.
- Canary and fresh-token tests during rotation.
- Monitoring in service-principal or managed-identity sign-in logs.
- Alerts for unused identities, expiring credentials, and unexpected locations.
- Review of who can modify federated trust, upload certificates, add secrets, or attach managed identities.
- Explicit tenant and audience validation at every custom API.

## Official Documentation

- [Security best practices for application properties](https://learn.microsoft.com/en-us/entra/identity-platform/security-best-practices-for-app-registration)
- [Microsoft identity platform certificate credentials](https://learn.microsoft.com/en-us/entra/identity-platform/certificate-credentials)
- [Connecting from your application to resources without handling credentials](https://learn.microsoft.com/en-us/entra/identity/managed-identities-azure-resources/overview-for-developers)
- [Managed identity best practice recommendations](https://learn.microsoft.com/en-us/entra/identity/managed-identities-azure-resources/managed-identity-best-practice-recommendations)
- [Create a trust relationship between an app and an external identity provider](https://learn.microsoft.com/en-us/entra/workload-id/workload-identity-federation-create-trust)
- [Workload identity federation considerations](https://learn.microsoft.com/en-us/entra/workload-id/workload-identity-federation-considerations)

## Conclusion

Use managed identity when an eligible Azure workload needs app-only access. Use workload federation when a trusted external platform can issue a narrowly matched OIDC token. Use a protected certificate when federation is unavailable, and use client secrets only as a controlled exception. The best model removes copyable long-lived credentials while keeping the workload's permissions, attachment rights, and trust policy least-privileged.
