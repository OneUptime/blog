# Validation Summary: How to Secure Calico ImageSet Management

## Status
validated

## Post Type
Guide / Tutorial (security hardening reference)

## Technologies Covered
- Calico (project Calico) and the Tigera Operator
- Kubernetes (RBAC, admission control, audit logs)
- Tigera Operator `ImageSet` and `Installation` CRDs (apiGroup `operator.tigera.io`)
- `cosign` (Sigstore) for image signing/verification
- `crane` (go-containerregistry) for digest lookup
- Harbor / Artifactory private registries
- Kyverno admission policy engine
- `kubectl` and Kubernetes audit logging

## Sources Consulted
- Tigera Operator ImageSet documentation: https://docs.tigera.io/calico/latest/operations/image-options/imageset
- Tigera Operator CRD reference (Installation, ImageSet): https://docs.tigera.io/calico/latest/reference/installation/api
- Cosign CLI reference (sign / verify): https://docs.sigstore.dev/cosign/signing/signing_with_self-managed_keys/
- go-containerregistry `crane` documentation: https://github.com/google/go-containerregistry/blob/main/cmd/crane/doc/crane_digest.md
- Kyverno policy writing — match/exclude resources: https://kyverno.io/docs/writing-policies/match-exclude/
- Kyverno foreach validation rules: https://kyverno.io/docs/writing-policies/validate/#foreach
- Kubernetes RBAC documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- `kubectl create secret docker-registry`: https://kubernetes.io/docs/tasks/configure-pod-container/pull-image-private-registry/
- Kubernetes auditing reference: https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/

## Issues Found
1. **Kyverno policy match selector used a non-existent `apiGroups` field.** In Kyverno's `match.any[].resources` block, there is no `apiGroups` field — API group/version are encoded inside the `kinds` entries themselves using the `group/version/Kind` form. The original snippet would have caused the policy to fail validation. Fixed by replacing `kinds: ["ImageSet"]` + `apiGroups: ["operator.tigera.io"]` with `kinds: ["operator.tigera.io/v1/ImageSet"]`.
2. **Kyverno foreach condition would error on missing `digest` field.** `{{ element.digest }}` raises a JMESPath evaluation error when the field is absent (which is exactly the case the policy is trying to catch), causing the rule to fail open rather than deny. Replaced with `{{ element.digest || '' }}` so an absent digest is normalised to the empty string and the `Equals ""` check fires correctly.

## Review Notes
- The "INSECURE - uses mutable tag" YAML snippet has a slightly misleading comment ("operator falls back to tag"). In practice, the Tigera operator requires `digest` on every entry in `ImageSet.spec.images`; an entry without a digest is rejected by the operator's validation rather than transparently falling back to a tag. The pedagogical intent (digest required) is correct, so this was left as-is.
- `kubectl get events --field-selector reason=Updated -A | grep imageset` is case-sensitive and somewhat noisy; readers may want `grep -i imageset` in practice. Not technically wrong.
- The audit log path `/var/log/kubernetes/audit.log` is distribution-dependent — the post correctly hedges with "assuming audit log is enabled".
- Calico `v3.27.0` is a valid release; readers should substitute the version matching their installation when adapting the snippets.
- All other commands (`cosign sign/verify`, `crane digest`, `kubectl create secret docker-registry`, `kubectl patch installation`) and the RBAC resource/verb/apiGroup definitions verified against current upstream documentation.
