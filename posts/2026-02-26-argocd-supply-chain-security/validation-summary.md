# Validation Summary: How to Implement Supply Chain Security with ArgoCD

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Argo CD and ApplicationSet
- Kubernetes Jobs, ConfigMaps, and admission control
- Kyverno ClusterPolicy image verification and validation rules
- Sigstore cosign image signatures and attestations
- SLSA provenance
- GitHub Actions OIDC keyless signing

## Sources Consulted
- Argo CD ApplicationSet List Generator documentation: https://argo-cd.readthedocs.io/en/release-3.1/operator-manual/applicationset/Generators-List/
- Argo CD Git GnuPG source integrity documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/source-integrity-git-gpg/
- Kyverno verifyImages Sigstore documentation: https://kyverno.io/docs/policy-types/cluster-policy/verify-images/sigstore/
- Kyverno validation rule documentation: https://kyverno.io/docs/policy-types/cluster-policy/validate/
- Kyverno restrict image registries policy example: https://kyverno.io/policies/best-practices/restrict-image-registries/restrict-image-registries/
- Sigstore cosign signing containers documentation: https://docs.sigstore.dev/cosign/signing/signing_with_containers/
- Sigstore cosign verifying signatures documentation: https://docs.sigstore.dev/cosign/verifying/verify/
- Sigstore CI quickstart documentation: https://docs.sigstore.dev/quickstart/quickstart-ci/
- SLSA Build levels documentation: https://slsa.dev/spec/v1.0/levels
- SLSA provenance documentation: https://slsa.dev/spec/v1.2/build-provenance
- Helm chart indexes for Kyverno and Sigstore policy-controller: https://kyverno.github.io/kyverno/index.yaml and https://sigstore.github.io/helm-charts/index.yaml

## Issues Found
- The post described SLSA as a four-level framework with Level 4 hermetic and parameterless builds. The current SLSA Build track uses Build L0 through Build L3. Updated the description and diagram, and clarified that Argo CD can enforce controls but does not itself grant a SLSA level.
- The ApplicationSet example used old chart versions and default templating syntax. Updated the Kyverno and Sigstore policy-controller chart versions and switched the example to current Go template syntax.
- The Kyverno provenance policy used deprecated top-level `validationFailureAction` and the older attestation `type` field. Moved enforcement to `failureAction` and used `predicateType` for cosign attestations.
- The Kyverno provenance policy's trusted builder list did not match the GitHub Actions builder ID emitted by the CI example. Updated the accepted builder pattern so the example policy and generated predicate agree.
- The GitHub Actions example generated a full in-toto Statement and then passed it to `cosign attest`, which expects a predicate document. Reworked the example to generate a SLSA provenance predicate and let cosign wrap it in an in-toto attestation.
- The CI example set `COSIGN_EXPERIMENTAL` for keyless signing. Removed it because keyless signing is no longer experimental in current cosign releases.
- The image digest handling placed a full image reference in the SLSA `sha256` digest field. Removed that invalid digest field from the predicate example.
- The dependency verification text claimed Kubernetes admission policy could verify base images directly from Pod specs. Updated the text to explain that admission policies see deployed image references, while base-image lineage belongs in build provenance or SBOM attestations.
- The Argo CD GPG section used `gpg.enabled` in `argocd-cm` and legacy `signatureKeys`. Removed the invalid/stale config and updated the AppProject example to use `sourceIntegrity.git.policies`.
- The registry policies used deprecated top-level Kyverno enforcement configuration. Moved enforcement to `validate.failureAction`.
- The PreSync hook used key-based verification while the CI example used keyless signing. Updated the verification commands to use certificate identity and OIDC issuer checks for keyless signatures and attestations.

## Review Notes
Kyverno `ClusterPolicy` is still widely documented and supported, but the current Kyverno documentation labels the older ClusterPolicy policy family as deprecated in favor of newer CEL-based policy types. A future refresh could migrate these examples to Kyverno `ImageValidatingPolicy` and CEL validation policies.
