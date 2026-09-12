# Validation Summary: Fix CoCo Attestation After Kernel, Firmware, or Guest Image Upgrades

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered

- Confidential Containers (CoCo)
- Trustee, including the Key Broker Service (KBS), Attestation Service, and Reference Value Provider Service (RVPS)
- Kata Containers
- AMD SEV-SNP attestation
- Intel TDX attestation
- Entity Attestation Result (EAR) tokens
- Kubernetes

## Sources Consulted

- [Trustee architecture](https://confidentialcontainers.org/docs/attestation/architecture/)
- [Trustee reference values guide](https://confidentialcontainers.org/docs/attestation/reference-values/)
- [KBS Client Tool documentation](https://confidentialcontainers.org/docs/attestation/client-tool/)
- [Pinned Trustee default CPU appraisal policy](https://github.com/confidential-containers/trustee/blob/512fed65642015b849f38fb13bfdec7806639987/attestation-service/src/ear_token/ear_default_policy_cpu.rego)
- [Pinned Trustee TCB claims documentation](https://github.com/confidential-containers/trustee/blob/512fed65642015b849f38fb13bfdec7806639987/attestation-service/docs/tcb_claims.md)
- [CoCo official reference-values tooling](https://github.com/confidential-containers/reference-values)

## Issues Found

- The inspection example used a nonexistent singular `get-reference-value --id` command. Changed it to the documented `get-reference-values` command, which retrieves the registered reference-value set through the authenticated administration interface.
- The post referred to an "RVPS manifest workflow" for complex values, while the official guide names this path the RVPS Tool. Changed the wording to "RVPS Tool workflow" to match the documented interface.

## Review Notes

- The post correctly pins the default CPU appraisal policy when discussing exact reference-value names. Those names and policy semantics are version-specific and should be rechecked when Trustee is upgraded.
- The `--admin-token-file` examples match the current KBS client documentation. Older Trustee releases may instead document private-key-based administration, as the post notes.
