# Validation Summary: How to Configure Image Policy Webhooks on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- Kubernetes admission control
- Kyverno (ClusterPolicy: validate, mutate, verifyImages)
- Sigstore / Cosign (keyed and keyless signing, Rekor)
- Connaisseur admission controller
- Trivy Operator (vulnerability scanning + attestations)
- Helm

## Sources Consulted
- Connaisseur Getting Started: https://sse-secure-systems.github.io/connaisseur/latest/getting_started/
- Connaisseur Getting Started (master): https://github.com/sse-secure-systems/connaisseur/blob/master/docs/getting_started.md
- Kyverno "Resolve Image to Digest" policy: https://kyverno.io/policies/other/resolve-image-to-digest/resolve-image-to-digest/
- Kyverno Verify Images Rules: https://kyverno.io/docs/policy-types/cluster-policy/verify-images/
- Kyverno Mutate Rules: https://kyverno.io/docs/writing-policies/mutate/
- Trivy + Kyverno tutorial: https://trivy.dev/docs/dev/tutorials/kubernetes/kyverno/
- Trivy Operator VulnerabilityReport CRD: https://aquasecurity.github.io/trivy-operator/
- Cosign documentation: https://docs.sigstore.dev/cosign/signing/signing_with_self-managed_keys/

## Issues Found

1. **Connaisseur installation used a non-existent helm repository.** The post added a `helm repo` at `https://sse-secure-systems.github.io/connaisseur/charts`, which is not the documented install path. The official getting-started guide installs from the cloned repo's local `helm` directory. Rewrote the install block to `git clone` the repo and run `helm install connaisseur helm ...`.

2. **Connaisseur values structure was wrong.** `validators` and `policy` were placed at the top level of the values file. Per Connaisseur's `charts/connaisseur/values.yaml` schema, these fields live under the `application:` key. Nested both sections under `application:` and re-indented the example.

3. **Kyverno tag-to-digest mutation policy used invalid nested template syntax.** The original used `{{ images.containers.{{element.name}}.registry }}` inside a `patchesJson6902` string, which Kyverno does not evaluate as nested templating. Replaced the rule with the documented `imageRegistry` context approach (`context: [{ name: resolvedRef, imageRegistry: { reference: "{{ element.image }}" } }]`) paired with `patchStrategicMerge`, matching the official `resolve-image-to-digest` policy.

4. **The "block vulnerable images" Kyverno policy was non-functional.** The rule compared `{{ images.containers.*.registry }}` against the literal string `"scanned-and-approved"` with `AnyNotIn` (and used a string instead of an array), which doesn't relate to vulnerability data at all. Replaced it with the documented attestation-based approach using `verifyImages` and the Cosign vulnerability attestation predicate type (`https://cosign.sigstore.dev/attestation/vuln/v1`) plus a `time_since` freshness check, which is the pattern shown in the Trivy/Kyverno tutorial.

## Review Notes

- Kyverno `validationFailureAction: Enforce` (capitalized) is correct for current Kyverno versions (v1.10+). Older versions accepted lowercase `enforce`/`audit`; both schemas are still tolerated as of writing.
- The `disallow-latest-tag` policy uses `images.containers.*.tag` in a `deny` block, which is valid Kyverno JMESPath. The `|| ''` fallback is technically a Kyverno-supported expression and behaves as documented for missing tags.
- The Cosign CLI commands (`generate-key-pair`, `sign --key`, `verify --key`) are correct against Cosign 2.x.
- The Trivy Operator helm install (`aqua/trivy-operator`, `trivy.ignoreUnfixed=true`) is correct.
- For a richer Trivy integration, a policy could query `vulnerabilityreports.aquasecurity.github.io` via a `context.apiCall` rather than relying on signed attestations, but the attestation flow shown is the canonical Sigstore + Kyverno pattern and is sufficient.
- The post acknowledges that the built-in `ImagePolicyWebhook` admission plugin is not covered; that omission is fine but worth flagging for readers who specifically came looking for it (Talos's `cluster.apiServer.admissionControl` config is what would wire that plugin in).
