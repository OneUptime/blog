# Fix CoCo Attestation After Kernel, Firmware, or Guest Image Upgrades

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Confidential Containers, Kata Containers, Security, Kubernetes, Troubleshooting

Description: Diagnose attestation failures after CoCo upgrades and update reference values without accepting an unverified guest or weakening secret release.

---

An upgrade can leave a confidential pod healthy enough to boot while Trustee refuses its image key. That is often the expected consequence of changing measured software. It can also indicate stale verification collateral, incompatible claim formats, or an actual trust failure. Updating every reference value to whatever the failing machine reports conceals those differences.

Treat the upgrade as a change to an approved release bundle: guest artifacts, launch configuration, attestation policy, and reference values. The steps below apply to upstream Confidential Containers (CoCo); cloud vTPM boot flows have different claim names and measurement chains.

## Identify Which Decision Changed

Trustee separates cryptographic evidence verification, Attestation Service appraisal, and KBS resource authorization. A valid hardware signature does not mean the measured guest is approved. Conversely, an approved guest can still be denied access to the requested resource. The distinction is documented in the [Trustee architecture](https://confidentialcontainers.org/docs/attestation/architecture/).

Save a bounded diagnostic record from a disposable canary: component versions, UTC failure time, requested resource path, verifier error category, and the attestation token produced by the service if one exists. Keep the record access controlled because tokens and evidence can include identifying information.

Compare the last successful and first failing attempts at the same stage. If the verifier cannot validate an endorsement chain, refreshing a launch digest will not help. If the EAR token exists but its CPU status is contraindicated, inspect the individual trust claims. If the CPU is affirming but KBS denies access, examine resource path and workload identity restrictions.

## Map Artifacts to the Actual Claims

Inspect the CPU policy from the Trustee release you deploy. The [current default CPU policy](https://github.com/confidential-containers/trustee/blob/512fed65642015b849f38fb13bfdec7806639987/attestation-service/src/ear_token/ear_default_policy_cpu.rego) uses separate checks for executable measurements, platform security versions, and configuration.

| Changed input | What to investigate |
| --- | --- |
| SNP firmware, guest kernel, or initrd | SNP launch measurement and direct-boot inputs |
| SNP host firmware or microcode | Reported TCB fields and endorsement availability |
| TDX guest kernel, initrd, or command line | RTMR values and supported event-log checks |
| TDX virtual firmware | MRTD and the launch recipe |
| Agent policy or Init-Data | Measured configuration hash and KBS identity rule |
| Trustee version | Policy semantics, field names, and reference value types |

For example, the pinned policy looks up `snp_launch_measurement` and SNP TCB reference names separately. Its TDX paths compare `rtmr_1`, `rtmr_2`, and `mr_td`. Do not apply these names blindly to Azure vTPM evidence, which follows distinct branches.

A debug command-line switch or changed vCPU layout can also affect measurements. Record resolved launch settings, not just the source ConfigMap. Operator reconciliation and node drift can make those different.

## Rebuild Expectations from Trusted Inputs

Archive the exact firmware, kernel, initrd, root filesystem, command line, CPU settings, and build provenance. A file checksum helps identify an artifact but is not necessarily its hardware launch measurement. SNP includes launch state; TDX separates initial measurement from later register extensions.

For official artifacts, examine the [CoCo reference-values project](https://github.com/confidential-containers/reference-values). It verifies upstream artifact attestations and generates values using pinned measurement plugins. Its currently supported target set must match your release and platform. A published TDX manifest is not a substitute for a custom SNP guest calculation.

For a custom release, run the measurement tooling for its boot flow on trusted build inputs. Independently boot that release on a controlled canary and compare verified evidence with the prediction. If they disagree, investigate the launch recipe before accepting the observed digest.

This comparison is the useful approval boundary: a known build explains the new value. The fact that an untrusted host presented a value does not make it a reference value.

## Stage Reference Values Carefully

The current KBS client supports inspecting an individual reference value through its authenticated administration interface:

```bash
kbs-client --url https://kbs-staging.example.com \
  config --admin-token-file ./staging-admin.token \
  get-reference-value --id snp_launch_measurement > reference-value-before.json
```

For a simple list-valued measurement, the documented provisioning form is:

```bash
kbs-client --url https://kbs-staging.example.com \
  config --admin-token-file ./staging-admin.token \
  set-sample-reference-value snp_launch_measurement "$APPROVED_MEASUREMENT"
```

Use an already reviewed value for `APPROVED_MEASUREMENT`. Configure the client's TLS trust for your deployment. Older clients have different administration options, so use documentation matching the installed binary.

The [reference-values guide](https://confidentialcontainers.org/docs/attestation/reference-values/) distinguishes list, scalar, integer, and boolean values. A string `"false"` and boolean `false` are different policy inputs. Do not assume a single-value update appends an old/new allowlist; use the RVPS manifest workflow for complex values and verify the resulting set.

## Roll Out and Retire Old Trust

Test the new bundle against a staging KBS containing only canary secrets. Require the approved release to succeed and changed kernel, wrong Init-Data, debug-enabled, and wrong-resource cases to fail. Test the old release too if a temporary overlap is intentional.

Plan overlap explicitly. Broad independent allowlists for several measurements can accidentally accept combinations that were never built together. Where components must remain paired, represent approved combinations in policy or a release-specific reference structure.

Promote the reviewed policy and reference bundle before scheduling the corresponding production canary. Observe appraisal and resource-denial rates by release. Finish by removing retired values and checking that the old release can no longer obtain fresh secrets. Removing a reference value does not erase secrets already released or automatically invalidate every cached token; account for token lifetimes and rotate resources when required.

## Conclusion

An attestation failure after an upgrade is a comparison problem before it is a configuration problem. Locate the failing decision, derive measurements from approved artifacts, stage the new reference bundle, and retire old trust deliberately. Recovery should preserve the evidence behind the decision to release a secret.

## Official Documentation

- [Trustee architecture](https://confidentialcontainers.org/docs/attestation/architecture/)
- [Trustee reference values](https://confidentialcontainers.org/docs/attestation/reference-values/)
- [Pinned Trustee CPU appraisal policy](https://github.com/confidential-containers/trustee/blob/512fed65642015b849f38fb13bfdec7806639987/attestation-service/src/ear_token/ear_default_policy_cpu.rego)
- [CoCo official reference values tooling](https://github.com/confidential-containers/reference-values)
- [Trustee TCB claims](https://github.com/confidential-containers/trustee/blob/512fed65642015b849f38fb13bfdec7806639987/attestation-service/docs/tcb_claims.md)
