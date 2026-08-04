# Design Cloud-Neutral Identity Across AWS, Entra, and Google Cloud

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Identity, OIDC, Workload Identity, AWS IAM, Microsoft Entra ID, Google Cloud IAM, Cloud Portability

Description: Build a stable identity and authorization model while mapping federation, principals, credentials, and cloud permissions explicitly into AWS, Microsoft Entra, and Google Cloud.

---

AWS IAM, Microsoft Entra ID, and Google Cloud IAM all answer identity and authorization questions, but their principals, policy languages, resource hierarchies, and token flows are different. A cloud-neutral identity layer should not attempt to hide those systems behind one universal policy format.

Instead, stabilize identity at well-defined boundaries: external federation, application claims, Kubernetes service-account identity, and business authorization. Map each boundary to provider-specific trust and permissions.

## Separate Four Identity Problems

Portability discussions often mix these concerns:

1. **Human authentication:** how an employee or customer signs in.
2. **Application authorization:** what a signed-in subject can do in the product.
3. **Workload authentication:** how a service obtains short-lived credentials.
4. **Cloud authorization:** which provider API operations that workload may call.

OIDC or SAML can standardize parts of sign-in and federation. OAuth access tokens can carry claims for an API. They do not standardize AWS IAM policies, Azure role assignments, or Google Cloud IAM bindings.

Keep the layers explicit:

```text
enterprise or customer IdP
       -> OIDC/SAML trust
identity broker or application
       -> canonical subject and application roles
workload identity federation
       -> short-lived cloud credential
provider IAM policy
       -> provider resource operation
```

## Define a Canonical Application Identity

Use a provider-independent internal subject key. Do not use an email address as the durable key, and do not make an AWS ARN or Entra object ID the product's primary user identifier.

A mapping table can retain external identities:

```text
principal_id: 8fd9b154-...
issuer: https://id.example.com
subject: 00u4abc...
tenant: acme
status: active
```

Validate token issuer, audience, signature, expiry, and required claims at the API boundary. Map approved claims to application roles owned by the product:

```yaml
roles:
  incident-viewer:
    actions: [incident.read, timeline.read]
  incident-commander:
    actions: [incident.read, incident.update, status.publish]
```

Provider groups can feed this mapping, but business authorization remains stable when the underlying directory changes.

## Use Federation Instead of Long-Lived Cloud Keys

All three providers support mechanisms that exchange or use an external identity for short-lived access:

- AWS STS `AssumeRoleWithWebIdentity` validates an OIDC token against an IAM role trust policy and returns temporary AWS credentials.
- Microsoft Entra federated identity credentials configure an application or user-assigned managed identity to trust a specific external issuer, subject, and audience, then exchange the assertion for an access token.
- Google Cloud Workload Identity Federation exchanges external credentials through Security Token Service and supports direct resource access or service-account impersonation.

The shared architecture is token federation. The configuration is not portable. Issuer discovery, accepted audience, subject matching, attribute mapping, role binding, session lifetime, and audit fields differ.

Create one provider adapter per target and test the exact trust restrictions. Broadly trusting an entire issuer or identity pool can turn portability work into privilege escalation.

## Keep Kubernetes ServiceAccounts Stable

Kubernetes projected service-account tokens provide an OIDC-compatible workload identity primitive. A Pod can use a stable ServiceAccount:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: object-reader
  namespace: reports
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: renderer
  namespace: reports
spec:
  selector:
    matchLabels:
      app: renderer
  template:
    metadata:
      labels:
        app: renderer
    spec:
      serviceAccountName: object-reader
      containers:
        - name: renderer
          image: registry.example.com/reports/renderer@sha256:REPLACE_ME
```

Each platform then maps `system:serviceaccount:reports:object-reader` or its projected claims to a cloud identity:

| Platform | Typical mechanism | Provider-side object |
| --- | --- | --- |
| EKS | IRSA or EKS Pod Identity | IAM role and trust/association |
| AKS | Microsoft Entra Workload ID | app or user-assigned managed identity plus federated credential |
| GKE | Workload Identity Federation for GKE | workload identity principal or IAM service-account impersonation |

The exact Kubernetes annotations or Pod mutation requirements depend on the selected mechanism. Keep them in target overlays. Keep the ServiceAccount name, namespace, and least-privilege intent in the shared workload contract.

Do not treat EKS Pod Identity as another name for IRSA. IRSA has the Pod exchange a projected OIDC token through STS `AssumeRoleWithWebIdentity`. EKS Pod Identity is EKS-only: an agent and the EKS Auth API obtain credentials for an EKS-side association, and the ServiceAccount does not carry an IAM role annotation. Both deliver temporary AWS credentials through supported SDK chains, but their trust objects, request paths, and portability differ.

## Put Cloud Permissions in Native Policy

Do not translate every permission into an invented universal JSON language. Provider IAM features differ in condition keys, deny semantics, hierarchy, resource patterns, and service actions.

Maintain a small intent record:

```yaml
workload: reports/renderer
capabilities:
  - read objects under reports/input/
  - decrypt with reports-data key
forbidden:
  - list unrelated buckets or containers
  - write source objects
```

Implement that record with an AWS IAM policy, Azure role assignments or a custom role, and Google Cloud IAM roles and conditions. Review the generated native policy. Contract tests should make allowed calls and verify denied calls in each cloud.

This keeps differences visible. For example, a built-in role may be too broad in one provider even when a similarly named role is acceptable in another.

## Stabilize the Application Credential Boundary

Applications should rely on each provider SDK's default credential chain or on a narrow internal client abstraction. Do not read static keys from custom environment variables.

For provider-specific resource calls, an adapter can encapsulate the SDK:

```text
ObjectReader.read(object_key)
  AWS adapter    -> default AWS credential chain -> S3
  Azure adapter  -> DefaultAzureCredential       -> Blob Storage
  Google adapter -> application default creds    -> Cloud Storage
```

The abstraction covers the business operation, not token acquisition internals. It also gives tests a stable seam. If the application only calls your own APIs, use a service-to-service identity protocol at that boundary and keep all cloud SDKs in the platform service.

SPIFFE can provide implementation-neutral workload identifiers and mTLS between workloads, but a SPIFFE ID does not automatically authorize a call to a cloud storage API. A federation or broker mapping is still required.

## Design Migration Without an Identity Deadlock

A cloud exit fails if the migration tooling authenticates only through the cloud being evacuated. Preserve:

- an external emergency identity provider or independently controlled break-glass path;
- target-cloud administration established before cutover;
- target-side CI/CD federation;
- access to DNS, certificate, registry, backup, and encryption systems;
- audited ownership of federation configurations;
- time synchronization and outbound access to issuer/JWKS endpoints.

Test key and secret rotation while the source is unavailable. Exporting encrypted data is not useful if only a source-managed identity can decrypt it.

## Test Identity as a Matrix

For each workload and target, verify:

1. no static cloud credential is mounted or baked into the image;
2. the expected issuer, subject, and audience are used;
3. credentials expire and renew without a restart;
4. the intended read or write succeeds;
5. a neighboring tenant or resource is denied;
6. node or instance credentials are inaccessible where isolation is required;
7. audit logs identify the workload with useful context;
8. removing the trust or role promptly removes access.

Record provider propagation delays and token caching. A revocation test can appear to fail until an already issued token expires; design emergency containment with that reality in mind.

## Official Documentation

- [Kubernetes service accounts](https://kubernetes.io/docs/concepts/security/service-accounts/)
- [AWS temporary credentials with OIDC](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_temp_request.html)
- [IAM roles for service accounts on EKS](https://docs.aws.amazon.com/eks/latest/userguide/iam-roles-for-service-accounts.html)
- [IRSA and EKS Pod Identity comparison](https://docs.aws.amazon.com/eks/latest/userguide/service-accounts.html)
- [Microsoft Entra workload identity federation](https://learn.microsoft.com/en-us/entra/workload-id/workload-identity-federation)
- [Microsoft Entra Workload ID on AKS](https://learn.microsoft.com/en-us/azure/aks/workload-identity-overview)
- [Google Cloud Workload Identity Federation](https://cloud.google.com/iam/docs/workload-identity-federation)
- [Workload Identity Federation for GKE](https://cloud.google.com/kubernetes-engine/docs/concepts/workload-identity)
- [SPIFFE identity specification](https://github.com/spiffe/spiffe/blob/main/standards/SPIFFE-ID.md)

## Conclusion

A cloud-neutral identity architecture uses common protocols and canonical subjects at boundaries while preserving native cloud authorization. Stabilize application roles and Kubernetes ServiceAccounts, exchange short-lived credentials, implement least privilege separately in each provider, and test both allowed and denied paths. Neutrality comes from replaceable mappings, not from pretending the IAM systems are the same.
