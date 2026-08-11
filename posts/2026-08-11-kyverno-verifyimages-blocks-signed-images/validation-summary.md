# Validation Summary: Why Kyverno `verifyImages` Blocks Signed Images: Digest Mutation, Credentials, and Identity Checks

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Kyverno 1.18 legacy `ClusterPolicy` and `verifyImages` rules
- Kyverno `ImageValidatingPolicy`
- Sigstore Cosign image signing and verification
- OCI container registries, image indexes, manifests, digests, and signature repositories
- Kubernetes admission webhooks, reinvocation, PolicyReports, Secrets, and RBAC
- `kubectl` and `crane`

## Sources Consulted
- Kyverno policy types overview and deprecation schedule — https://kyverno.io/docs/policy-types/overview/
- Kyverno `verifyImages` overview — https://kyverno.io/docs/policy-types/cluster-policy/verify-images/overview/
- Kyverno Sigstore image verification — https://kyverno.io/docs/policy-types/cluster-policy/verify-images/sigstore/
- Kyverno `ImageValidatingPolicy` — https://kyverno.io/docs/policy-types/image-validating-policy/
- Kyverno legacy policy settings — https://kyverno.io/docs/policy-types/cluster-policy/policy-settings/
- Kyverno Policy Reports — https://kyverno.io/docs/guides/reports/
- Kyverno configuration and controller flags — https://kyverno.io/docs/installation/customization/
- Kyverno 1.18 release announcement — https://kyverno.io/blog/2026/04/24/announcing-kyverno-release-1.18/
- Kyverno v1.18.2 image-verification API source — https://github.com/kyverno/kyverno/blob/v1.18.2/api/kyverno/v1/image_verification_types.go
- Cosign `verify` command reference — https://github.com/sigstore/cosign/blob/main/doc/cosign_verify.md
- Sigstore signature-verification guide — https://docs.sigstore.dev/cosign/verifying/verify/
- `crane digest` command reference — https://github.com/google/go-containerregistry/blob/main/cmd/crane/doc/crane_digest.md
- Kubernetes dynamic admission control — https://kubernetes.io/docs/reference/access-authn-authz/extensible-admission-controllers/

## Issues Found
1. **PolicyReports were presented as a source for blocked admission failures**: Enforce-blocked resources are never persisted, so their failed evaluations do not become failed PolicyReport entries. The post now directs readers to the admission error, admission-controller logs, and Kubernetes Events for denials, and limits PolicyReport advice to admitted or existing resources.
2. **Custom-resource image fields were grouped with Pod-spec fields and did not mention the required declaration**: Legacy Kyverno does not automatically discover arbitrary custom-resource image fields. The post now identifies them as separate image or OCI-artifact locations declared through `imageExtractors` and adds that field to the matching checklist.
3. **External webhook ordering was imprecisely described as changing which final images Kyverno sees**: Kubernetes validating webhooks see the final post-mutation object, while ordering and reinvocation affect Kyverno's earlier mutation-phase verification. The post now distinguishes those phases.
4. **Registry troubleshooting treated namespace placement as equivalent to the controller runtime and implied one Secret had to cover every location**: NetworkPolicy selectors, proxy environment, mounted CA roots, workload identity, and credentials can differ between Pods in the same namespace, and public or separately credentialed repositories do not require one common Secret. The post now requires a debug context matching the admission controller's network path and runtime configuration, describes Kyverno as retrieving signatures and OCI artifacts rather than assuming a specific referrers transport, and requires configured credentials to cover each private repository Kyverno reads.
5. **The keyless Cosign command was described as reproducing every Kyverno identity rule**: Cosign's `--certificate-identity` and `--certificate-oidc-issuer` flags match literal values; Kyverno also supports glob values, regular-expression fields, and `additionalExtensions`. The post now scopes the command to literal values and explains how to reproduce glob, regexp, and GitHub workflow extension checks with the corresponding Cosign flags.
6. **The `attestors.count` explanation incorrectly required every entry and implied distinct authorities**: `count` requires that many entries to match; when omitted, all entries must match. Overlapping entries can be satisfied without proving distinct signatures or authorities. The post now states both rules explicitly.
7. **The failure-policy field was not identified precisely**: The preferred current legacy-policy field is `spec.webhookConfiguration.failurePolicy`; top-level `spec.failurePolicy` is deprecated. The post now names the current field and retains the distinction between policy violations and processing or dependency errors.
8. **The suggested Audit rollout omitted a schema constraint**: Kyverno 1.18.2 rejects a `verifyImages` rule using `failureAction: Audit` with the default `mutateDigest: true`. The post now states that Audit requires `mutateDigest: false` and notes that `verifyDigest` can remain enabled.

## Review Notes
- Kyverno 1.18 documentation marks legacy `ClusterPolicy` as deprecated and `ImageValidatingPolicy` as stable. The post correctly advises matching guidance to installed CRDs and planning migration separately.
- The `mutateDigest`, `verifyDigest`, and `required` defaults; Kyverno mutation/validation sequencing; namespaced registry Secret support; automatic Pod `imagePullSecrets`; RBAC requirements; separate signature repository behavior; custom CA guidance; and offline-registry failure behavior were verified against Kyverno 1.18 documentation and source.
- The `kubectl`, `crane digest`, public-key Cosign, and literal keyless Cosign commands are syntactically current. All six documentation links in the post resolve to the intended official resources.
