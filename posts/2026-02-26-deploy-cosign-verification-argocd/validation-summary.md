# Validation Summary: How to Deploy Cosign Verification Policies with ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Kubernetes admission control
- Kyverno ClusterPolicy image verification
- OPA Gatekeeper external data
- Ratify
- Sigstore Cosign
- GitHub Actions OIDC

## Sources Consulted
- Kyverno verifyImages Sigstore documentation: https://kyverno.io/docs/policy-types/cluster-policy/verify-images/sigstore/
- Kyverno validate/failureAction documentation: https://kyverno.io/docs/policy-types/cluster-policy/validate/
- Gatekeeper external data documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/externaldata/
- Ratify Cosign verifier documentation: https://ratify.dev/docs/plugins/verifier/cosign/
- Ratify manual quick start for Gatekeeper: https://ratify.dev/docs/quickstarts/quickstart-manual
- Ratify Helm chart metadata: https://artifacthub.io/packages/helm/ratify/ratify
- Sigstore Cosign signing and attestation documentation: https://docs.sigstore.dev/cosign/signing/signing_with_containers/
- Sigstore CI quickstart: https://docs.sigstore.dev/quickstart/quickstart-ci/
- GitHub Actions OIDC documentation: https://docs.github.com/en/actions/reference/openid-connect-reference
- Argo CD Application specification: https://argo-cd.readthedocs.io/en/latest/user-guide/application-specification/

## Issues Found
- Kyverno examples used deprecated top-level `spec.validationFailureAction` and `spec.webhookTimeoutSeconds`. Updated examples to use `spec.webhookConfiguration.timeoutSeconds` and per-`verifyImages` `failureAction`.
- Kyverno rollout examples used deprecated top-level enforcement fields and a `validate.message` snippet that does not apply to `verifyImages` warning behavior. Updated the rollout snippets to use per-rule `failureAction` and `spec.emitWarning: true` for admission warnings.
- The Gatekeeper section used the archived `sigstore/cosign-gatekeeper-provider` project and a hand-written provider Deployment. Replaced it with a Ratify-based Gatekeeper provider example, which is the maintained path documented for Cosign verification with Gatekeeper.
- The CI example used `sigstore/cosign-installer@v3`. Updated it to the current `v4.0.0` action version shown in Sigstore CI documentation.
- The SBOM attestation command used `--type spdxjson` while the Kyverno policy expected the predicate type `https://spdx.dev/Document`. Updated the command to use the same predicate type as the policy.
- The GitHub Actions keyless signing example omitted the required OIDC permission. Added a note that the signing job must grant `id-token: write`.
- The production key-storage note implied public verification keys should be treated as secrets. Clarified that Cosign private keys should stay out of the cluster and that public verification keys can be GitOps-managed or distributed through the platform's trust-material mechanism.

## Review Notes
The Kyverno and Ratify examples remain templates and still require real registry scopes, public keys, Gatekeeper installation with external data enabled, and the Ratify default ConstraintTemplate/constraint to be deployed in a working cluster.
