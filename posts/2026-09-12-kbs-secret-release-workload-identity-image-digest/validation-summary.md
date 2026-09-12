# Validation Summary: Bind KBS Secret Release to Workload Identity and an Image Digest

## Status
validated

## Post Type
Technical security guide

## Technologies Covered
- Confidential Containers (CoCo)
- Kata Containers and Kata agent policy
- Trustee Key Broker Service (KBS) and Attestation Service (AS)
- AMD SEV-SNP and Intel TDX attestation
- Kubernetes Pods and image digests
- Init-Data
- Open Policy Agent Rego
- `genpolicy`

## Sources Consulted
- [Confidential Containers: Init-Data](https://confidentialcontainers.org/docs/features/initdata/)
- [Confidential Containers: Policing a Sandbox](https://confidentialcontainers.org/blog/2024/08/15/policing-a-sandbox/)
- [Kata Containers genpolicy guide at the cited commit](https://github.com/kata-containers/kata-containers/blob/0e9bff34d71dbaa14e3f57eef49ebc61c920b8ae/src/tools/genpolicy/README.md)
- [Kata Containers genpolicy CLI source at the cited commit](https://github.com/kata-containers/kata-containers/blob/0e9bff34d71dbaa14e3f57eef49ebc61c920b8ae/src/tools/genpolicy/src/utils.rs)
- [Trustee Attestation Service policy documentation at the cited commit](https://github.com/confidential-containers/trustee/blob/512fed65642015b849f38fb13bfdec7806639987/attestation-service/docs/policy.md)
- [Trustee default CPU EAR policy at the cited commit](https://github.com/confidential-containers/trustee/blob/512fed65642015b849f38fb13bfdec7806639987/attestation-service/src/ear_token/ear_default_policy_cpu.rego)
- [Trustee KBS sample resource policies](https://github.com/confidential-containers/trustee/tree/512fed65642015b849f38fb13bfdec7806639987/kbs/sample_policies)
- [Trustee KBS attestation protocol](https://github.com/confidential-containers/trustee/blob/512fed65642015b849f38fb13bfdec7806639987/kbs/docs/kbs_attestation_protocol.md)

## Issues Found
No technical issues found.

## Review Notes
The post correctly treats the generated agent policy as version-specific and requiring review. The EAR claim layout and `ear.trustee.identifiers` extension are also release-specific, and the post appropriately instructs readers to inspect the representation and schema emitted by their deployed verifier. The cited Trustee AS policy interface is marked as developing, so future Trustee releases may require updates to the policy example.
