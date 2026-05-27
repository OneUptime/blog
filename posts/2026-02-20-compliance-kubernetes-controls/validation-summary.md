# Validation Summary: How to Implement Compliance Controls in Kubernetes

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes audit logging
- Kubernetes RBAC
- Kubernetes Pod Security Admission and Pod Security Standards
- Kubernetes NetworkPolicy
- Kubernetes encryption at rest for Secrets
- Sigstore Cosign image signing and verification
- SOC 2, PCI DSS, and HIPAA compliance controls

## Sources Consulted
- Kubernetes Auditing documentation: https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/
- Kubernetes kube-apiserver Audit Configuration API reference: https://kubernetes.io/docs/reference/config-api/apiserver-audit.v1/
- Kubernetes RBAC documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes Pod Security Admission documentation: https://kubernetes.io/docs/concepts/security/pod-security-admission/
- Kubernetes Pod Security Standards documentation: https://kubernetes.io/docs/concepts/security/pod-security-standards/
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes NetworkPolicy API reference: https://kubernetes.io/docs/reference/kubernetes-api/networking/network-policy-v1/
- Kubernetes Namespaces documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/namespaces/
- Kubernetes Encrypting Confidential Data at Rest documentation: https://kubernetes.io/docs/tasks/administer-cluster/encrypt-data/
- Kubernetes kube-apiserver Configuration API reference: https://kubernetes.io/docs/reference/config-api/apiserver-config.v1/
- Sigstore Cosign documentation: https://docs.sigstore.dev/cosign/
- Sigstore Cosign signing with containers documentation: https://docs.sigstore.dev/cosign/signing/signing_with_containers/
- Sigstore Cosign signing with self-managed keys documentation: https://docs.sigstore.dev/cosign/key_management/signing_with_self-managed_keys/

## Issues Found
- The audit policy comment said it logged all authentication failures. The rule logs TokenReview create requests, but audit policy rules do not filter specifically for failed authentication responses. Changed the comment to "Log token review requests at the Metadata level."
- The Pod Security example was labeled `pod-security-policy.yaml`, which could be confused with the removed PodSecurityPolicy API. Changed the comment to `pod-security-standards.yaml` because the example uses Pod Security Admission namespace labels.
- The Pod Security namespace labels used `warn: restricted`, but the comment said "Warn on baseline violations." Changed the comment to "Warn on restricted profile violations" to match the YAML.
- The API gateway NetworkPolicy used separate `namespaceSelector` and `podSelector` entries under `from`, which means either the namespace selector or the pod selector could match. Changed them into a single peer and used the built-in namespace label `kubernetes.io/metadata.name` so the rule allows only matching API gateway pods in the API gateway namespace.
- The compliance flow and Cosign comments implied Cosign alone rejects unsigned images at deployment time. Changed the flow to say "Rejected by Image Policy" and clarified that admission policies can require verified images before they run.

## Review Notes
- The Kubernetes examples use current stable API versions: `audit.k8s.io/v1`, `rbac.authorization.k8s.io/v1`, `networking.k8s.io/v1`, `apps/v1`, and `apiserver.config.k8s.io/v1`.
- The encryption-at-rest example is syntactically aligned with Kubernetes `EncryptionConfiguration`; production use should include secure key storage, key rotation, and rewriting existing Secrets after enabling encryption.
- The Cosign commands are valid for self-managed key workflows, but production clusters need an admission controller or policy engine to enforce signature verification during deployment.
