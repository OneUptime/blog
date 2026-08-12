# Why Kyverno `verifyImages` Blocks Signed Images

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kyverno, Cosign, Image Verification, Kubernetes, Supply Chain Security

Description: Troubleshoot Kyverno `verifyImages` denials by tracing the exact digest, registry access, signature repository, and attestor identity used during admission.

---

A green `cosign verify` on an engineer's laptop does not prove Kyverno will admit the Pod. Kyverno may resolve a different digest, run with different registry credentials and CA roots, look in another signature repository, or enforce a narrower identity than the local command.

Debug the admission decision as four linked questions: did the rule match, which immutable subject did Kyverno verify, could its controller retrieve the signature, and did that signature satisfy the configured attestor?

## Check the Kyverno policy generation first

Current Kyverno 1.18 documentation marks `ClusterPolicy`-the legacy policy type that contains `verifyImages` rules-as deprecated, while `ImageValidatingPolicy` is stable. If you already operate `verifyImages`, use documentation for your installed version and plan migration separately. Do not mix fields from `ImageValidatingPolicy` into a legacy `ClusterPolicy` while troubleshooting.

Record versions:

```bash
kubectl get deploy -n kyverno -o wide
kubectl get clusterpolicy check-images -o yaml
cosign version
```

Read the installed CRD schema with `kubectl explain`; web examples may target another release.

## 1. Prove the rule matched the image

Inspect `imageReferences`, `skipImageReferences`, `imageExtractors`, resource kinds, namespace selectors, preconditions, and auto-generation behavior. A pattern for `registry.example.com/team/*` does not match a mirror hostname or an image injected from another registry.

Relevant image locations include:

- `spec.containers`;
- `spec.initContainers`;
- `spec.ephemeralContainers`;
- sidecars inserted by another mutating webhook;
- image or OCI-artifact fields declared through `imageExtractors` for custom resources.

Read the admission error, Kyverno admission-controller logs, and Kubernetes Events. Use PolicyReports for admitted or existing resources; an Enforce-blocked resource is not persisted as a failed PolicyReport entry. A skipped rule, an evaluation error, and a failed signature are different outcomes.

## 2. Trace digest mutation

`verifyImages.mutateDigest` defaults to `true`. Kyverno resolves a tag and mutates the admitted image reference to include its digest. `verifyDigest` also defaults to `true`, requiring a digest for the final verification state. Kyverno documents that image-verification rules execute in mutation first, after other Kyverno mutation rules, and again in validation to enforce required verification and digest checks.

Resolve the tag from a context with access to the same registry:

```bash
IMAGE_TAG=registry.example.com/team/api:1.8.0
DIGEST=$(crane digest "$IMAGE_TAG")
IMAGE_DIGEST="registry.example.com/team/api@$DIGEST"

cosign verify \
  --key=release.pub \
  "$IMAGE_DIGEST"
```

Compare that digest with:

- the digest signed by the release pipeline;
- the digest shown in Kyverno's denial;
- an OCI index versus a platform child manifest;
- the destination digest after mirroring;
- the tag after any registry-rewrite mutation.

If the tag moved after signing, Kyverno correctly verifies the new target and rejects it. Fix the release reference; do not disable digest checking. Prefer deploying the digest emitted by the build.

An external sidecar injector may run in another webhook. Mutating webhook ordering and reinvocation can affect which images Kyverno processes during mutation-phase verification; its validating webhook then checks the final mutated object. Inspect the actual rejected admission object and test the complete mutation chain in a canary namespace.

## 3. Test registry access as Kyverno

The Kyverno admission controller-not your laptop-must resolve the subject and retrieve signatures and other OCI artifacts. Check DNS, network policy, proxy settings, registry TLS trust, authorization, and repository scope from a debug context that matches the controller's network path and runtime configuration; sharing only its namespace does not guarantee the same access.

Current Kyverno documentation supports policy-specific `imageRegistryCredentials`, global helpers, and Pod `imagePullSecrets`. Starting with Kyverno 1.18, it can use Pod pull secrets automatically, but every controller that evaluates images needs RBAC to read those Secrets.

A legacy policy can name credentials:

```yaml
verifyImages:
  - imageReferences:
      - "registry.example.com/team/*"
    imageRegistryCredentials:
      secrets:
        - "production/registry-pull-secret"
```

The `namespace/name` form is documented for 1.18+. Older releases require Secrets in the Kyverno namespace. Confirm against the installed version.

Configured credentials must cover every private repository Kyverno reads, including the image repository and any separate signature repository. If the signer used `COSIGN_REPOSITORY`, set the policy's documented `repository` override consistently and grant access there.

For an internal registry CA, add trust to the Kyverno controller runtime according to the Kyverno deployment and platform documentation. Never set insecure registry behavior merely because a CA was omitted.

## 4. Reproduce the exact attestor

A signature can be valid under one key or identity and invalid under another. Copy the policy's trust requirement into a manual verification by digest.

For a public key:

```bash
cosign verify --key=release.pub "$IMAGE_DIGEST"
```

For a keyless attestor with literal, non-wildcard `subject` and `issuer` values, verify those exact values:

```bash
cosign verify \
  --certificate-identity="$POLICY_SUBJECT" \
  --certificate-oidc-issuer="$POLICY_ISSUER" \
  "$IMAGE_DIGEST"
```

If the policy uses wildcard `subject` or `issuer` values, translate each glob to a bounded Cosign regular expression and use the corresponding regexp flag. For `subjectRegExp` or `issuerRegExp`, use Cosign's `--certificate-identity-regexp` or `--certificate-oidc-issuer-regexp`; reproduce any configured `additionalExtensions` with the corresponding `--certificate-github-workflow-*` flags.

GitHub workflow path, repository, and ref changes can change the certificate identity. Do not set `subjectRegExp` or Cosign's identity regexp to `.*`. Update policy only after confirming the new release identity is intended and protected.

Kyverno fails a rule when required signatures are absent or none match its attestors. For each attestor set, prove enough entries succeed to meet `count`; if `count` is omitted, all entries must succeed. One matching entry does not satisfy `count: 2`, and `count` alone does not guarantee distinct signatures or authorities if entries overlap.

## Distinguish verification failure from dependency failure

Two controls have different purposes:

- `verifyImages[].failureAction` determines Audit versus Enforce behavior for policy violations.
- `spec.webhookConfiguration.failurePolicy` determines behavior for processing errors or unavailable dependencies, including documented offline-registry behavior. The older top-level `spec.failurePolicy` field is deprecated.

Do not change both at once during diagnosis. Capture the precise error first. Kyverno requires `mutateDigest: false` when `failureAction: Audit`; with that required setting, a temporary Audit rollout can observe violations while `verifyDigest` remains enabled. Silently ignoring registry failures is a separate availability decision and can admit images that were never verified.

## Minimal known-good comparison

Use a disposable repository and a narrowly scoped policy. Sign one digest, verify it locally, and deploy that digest. Then vary one dimension at a time:

1. tag versus digest;
2. public versus private registry;
3. same versus separate signature repository;
4. public key versus keyless attestor;
5. direct Pod versus Deployment-generated Pod;
6. no sidecar versus injected sidecar.

This matrix exposes the failing boundary without weakening production policy.

## Troubleshooting checklist

- [ ] Match troubleshooting instructions to the installed Kyverno CRDs and version.
- [ ] Confirm the rule matches every relevant container location.
- [ ] Extract the exact digest from the denial and compare it with the signed digest.
- [ ] Distinguish an index digest from platform child digests.
- [ ] Check tag movement and registry-rewrite mutations.
- [ ] Test DNS, TLS CA, authentication, and authorization from Kyverno's runtime.
- [ ] Grant RBAC for referenced Pod or namespaced image-pull Secrets.
- [ ] Configure the same separate signature repository used by the signer.
- [ ] Reproduce the exact key or keyless subject/issuer manually.
- [ ] Keep policy violations separate from webhook/dependency errors.

## Official Documentation

- [Kyverno `verifyImages` overview](https://kyverno.io/docs/policy-types/cluster-policy/verify-images/overview/)
- [Kyverno Sigstore image verification](https://kyverno.io/docs/policy-types/cluster-policy/verify-images/sigstore/)
- [Kyverno policy-type status and deprecation schedule](https://kyverno.io/docs/policy-types/overview/)
- [Kyverno ImageValidatingPolicy](https://kyverno.io/docs/policy-types/image-validating-policy/)
- [Cosign verification command](https://github.com/sigstore/cosign/blob/main/doc/cosign_verify.md)
- [Kubernetes dynamic admission control](https://kubernetes.io/docs/reference/access-authn-authz/extensible-admission-controllers/)

## Conclusion

Kyverno usually blocks a signed image because it verified a different digest, could not retrieve the signature as the controller identity, or enforced a different attestor policy. Trace matching, mutation, registry access, and identity in that order. Keep digest and trust checks enabled, and fix the exact boundary that diverges from the successful local verification.
