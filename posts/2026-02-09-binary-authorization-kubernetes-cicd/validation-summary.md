# Validation Summary: How to Use Binary Authorization Policies for Kubernetes Deployments in CI/CD

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Kubernetes admission control
- Kyverno ClusterPolicy and image verification
- Sigstore Cosign signatures and attestations
- GitHub Actions
- OPA Gatekeeper external data
- GitLab CI
- Notary Project Notation
- Ratify
- Prometheus-style Kyverno metrics

## Sources Consulted
- Kyverno installation documentation: https://kyverno.io/docs/installation/installation/
- Kyverno verifyImages overview: https://kyverno.io/docs/policy-types/cluster-policy/verify-images/overview/
- Kyverno Sigstore image and attestation verification: https://kyverno.io/docs/policy-types/cluster-policy/verify-images/sigstore/
- Kyverno validate rule failureAction documentation: https://kyverno.io/docs/policy-types/cluster-policy/validate/
- Sigstore Cosign quickstart and container signing documentation: https://docs.sigstore.dev/quickstart/quickstart-cosign/ and https://docs.sigstore.dev/cosign/signing/signing_with_containers/
- Sigstore Cosign verification documentation: https://docs.sigstore.dev/cosign/verifying/verify/
- OPA Gatekeeper external data documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/externaldata/
- OPA Gatekeeper ConstraintTemplate documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/constrainttemplates/
- Ratify verifier documentation: https://ratify.dev/docs/1.1/reference/verifier/
- Notary Project / Notation repository and usage references: https://github.com/notaryproject/notation
- GitHub Marketplace action pages for actions/checkout and docker/login-action: https://github.com/marketplace/actions/checkout and https://github.com/marketplace/actions/docker-login

## Issues Found
- Kyverno Helm installation used the old `replicaCount` value. Updated it to current per-controller replica settings.
- Kyverno policies used deprecated top-level `spec.validationFailureAction` for image verification. Moved enforcement to current per-rule/per-verifyImages `failureAction` fields.
- The Cosign attestation example incorrectly wrapped the predicate in a JSON object containing `predicateType` and `predicate`. Updated the examples to pass the predicate file directly and set the predicate type with `--type`.
- The GitHub Actions workflow used older action versions and omitted noninteractive `--yes` for Cosign signing in CI. Updated action versions and Cosign commands.
- A Kyverno `verifyImages` rule combined image signature verification and attestation verification in the same rule. Split it into separate signature and attestation rules and added attestors for the attestation check.
- The attestation condition examples used wildcard matching where exact predicate values were shown. Updated the conditions to match the sample predicate exactly.
- The "block unsigned images" Kyverno validate rule actually restricted registries, not signatures, and used a list-level image expression. Renamed the rule/message and changed it to `foreach` over container image fields.
- The Gatekeeper example referenced static inventory data for signatures, which is not how Gatekeeper verifies registry signatures. Updated the install to enable external data and rewrote the Rego to call a Cosign external data provider.
- The GitLab CI example treated key material as a file path and omitted attestation type flags. Updated it to use `env://` keys, noninteractive signing, and explicit attestation verification type.
- The Notary v2/Ratify section used outdated `notaryv2` naming and old Ratify fields. Updated it to Notary Project/Notation terminology, current Notation version, trust policy setup, and Ratify `notation` verifier configuration.

## Review Notes
The examples remain illustrative and still require environment-specific registry credentials, signing keys or KMS configuration, trust stores, and provider deployment details. For production use, keyless signing, KMS-backed keys, digest-based deployments, and staged rollout of enforcing policies should be considered.
