# Validation Summary: NeuVector vs Sysdig: Container Security Comparison

## Status
validated

## Post Type
Comparison guide / Reference

## Technologies Covered
- NeuVector (SUSE / Rancher container security platform)
- Sysdig Secure / Sysdig Monitor
- Falco (CNCF runtime security engine)
- Kubernetes
- eBPF
- sysdig-cli-scanner

## Sources Consulted
- NeuVector CRD policy docs: https://open-docs.neuvector.com/policy/usingcrd/
- NeuVector GitHub repo (LICENSE / Apache 2.0): https://github.com/neuvector/neuvector
- Falco upstream rules: https://github.com/falcosecurity/rules/blob/main/rules/falco_rules.yaml
- Falco CNCF graduation announcement (Feb 29 2024): https://www.cncf.io/announcements/2024/02/29/cloud-native-computing-foundation-announces-falco-graduation/
- Sysdig CLI Scanner docs: https://docs.sysdig.com/en/sysdig-secure/install-agent-components/install-vulnerability-cli-scanner/running-in-vm-mode/
- CNCF Sandbox project list: https://www.cncf.io/sandbox-projects/
- SUSE OZT/CNCF announcement: https://www.suse.com/news/SUSETransformsCloudNativeSecurity/

## Issues Found

1. **NvSecurityRule CRD schema was incorrect.** The example had `selector` directly under `spec`, but the NeuVector CRD requires `selector` to be nested under `spec.target` and to include a `criteria` array (key/op/value). Fixed the YAML to use the correct `spec.target.selector` structure with a `criteria` block, the standard `nv.<service>.<namespace>` naming convention, and added `policymode: Protect` so the deny actions take effect.

2. **"CNCF-backed open-source tooling" bullet was misleading.** NeuVector itself is not on the CNCF Sandbox/Incubating/Graduated rosters — what SUSE donated was the related Open Zero Trust (OZT) effort, and NeuVector appears in the CNCF Landscape only as a member-listed product. Replaced the bullet with "A fully open-source platform under Apache 2.0 is preferred", which is verifiable and accurate.

## Review Notes

- The Falco rule example uses the older title-cased name `Terminal Shell in Container`; the upstream rule is `Terminal shell in container` (lowercase). This only matters if the user is overriding the upstream rule by name. The condition itself, including the `container_entrypoint` macro, is still valid in current Falco rules. Upstream also adds `and not user_expected_terminal_shell_in_container_conditions` as an exclusion — leaving it out is functional but will cause more false positives. Left as-is since the example is illustrative.
- NeuVector compliance coverage in the table lists "CIS, PCI, GDPR" — NeuVector also supports HIPAA and NIST templates, but the listed set is not wrong, just non-exhaustive. Left as-is.
- Cost figures for Sysdig are intentionally directional ("tens of thousands to hundreds of thousands") and consistent with publicly reported per-node subscription pricing.
