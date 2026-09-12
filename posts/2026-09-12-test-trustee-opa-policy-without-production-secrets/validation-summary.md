# Validation Summary: Test Trustee OPA Policies Without Releasing Production Secrets

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Confidential Containers
- Trustee Attestation Service (AS)
- Trustee Key Broker Service (KBS)
- Open Policy Agent (OPA)
- Rego v1
- Kubernetes
- Remote attestation and EAR appraisal tokens
- Reference Value Provider Service (RVPS)

## Sources Consulted
- [OPA policy testing documentation](https://www.openpolicyagent.org/docs/policy-testing)
- [OPA CLI reference](https://www.openpolicyagent.org/docs/cli)
- [OPA policy language documentation](https://www.openpolicyagent.org/docs/policy-language)
- [Confidential Containers Trustee policy overview](https://confidentialcontainers.org/docs/attestation/policies/)
- [Pinned Trustee Attestation Service policy interface](https://github.com/confidential-containers/trustee/blob/512fed65642015b849f38fb13bfdec7806639987/attestation-service/docs/policy.md)
- [Pinned Trustee KBS default resource policy](https://github.com/confidential-containers/trustee/blob/512fed65642015b849f38fb13bfdec7806639987/kbs/sample_policies/default.rego)
- [Pinned Trustee KBS request handler](https://github.com/confidential-containers/trustee/blob/512fed65642015b849f38fb13bfdec7806639987/kbs/src/api_server.rs)
- [Pinned Trustee example EAR token](https://github.com/confidential-containers/trustee/blob/512fed65642015b849f38fb13bfdec7806639987/attestation-service/docs/example.token.json)
- [Pinned Trustee default CPU appraisal policy](https://github.com/confidential-containers/trustee/blob/512fed65642015b849f38fb13bfdec7806639987/attestation-service/src/ear_token/ear_default_policy_cpu.rego)

## Issues Found
- The production guidance called `fixture-approved` a fixture hash even though the post correctly introduced it as a fixture identifier. Changed “fixture hash” to “fixture identifier” and clarified that the production value is the approved measured Init-Data digest.

## Review Notes
- Extracted both Rego examples and verified them with OPA 1.20.2. `opa check --strict` succeeded, and `opa test --fail-on-empty -v` passed all five tests.
- The Trustee-specific statements and claim paths were checked against the pinned commit used by the post. The pinned KBS request handler queries `data.policy.allow`, supplies request metadata as policy data and verified token claims as input, and denies undefined or nonboolean results.
- `query_reference_value` is a Trustee policy-engine extension, so the post correctly avoids claiming that stock OPA can exercise its RVPS integration.
