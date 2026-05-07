# Validation Summary: How to Run CIS Benchmark Scans in Rancher

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rancher Manager
- Rancher CIS Benchmark (`rancher-cis-benchmark`)
- Kubernetes
- Helm
- `kubectl`
- RKE2
- Pod Security Admission / Pod Security Standards

## Sources Consulted
- Rancher CIS scan docs: https://ranchermanager.docs.rancher.com/v2.10/how-to-guides/advanced-user-guides/cis-scan-guides/run-a-scan
- Rancher scheduled scan docs: https://ranchermanager.docs.rancher.com/v2.10/how-to-guides/advanced-user-guides/cis-scan-guides/run-a-scan-periodically-on-a-schedule
- Rancher report docs: https://ranchermanager.docs.rancher.com/v2.11/how-to-guides/advanced-user-guides/cis-scan-guides/view-reports
- Rancher alerting docs: https://ranchermanager.docs.rancher.com/v2.10/how-to-guides/advanced-user-guides/cis-scan-guides/enable-alerting-for-rancher-cis-benchmark
- Rancher compliance docs for current version scope: https://ranchermanager.docs.rancher.com/integrations-in-rancher/compliance-scans
- Rancher CIS configuration reference: https://ranchermanager.docs.rancher.com/v2.11/integrations-in-rancher/cis-scans/configuration-reference
- Official Rancher CIS operator chart metadata and CRDs: https://github.com/rancher/cis-operator
- Rancher charts index: https://charts.rancher.io/index.yaml
- Kubernetes Pod Security Admission docs: https://kubernetes.io/docs/concepts/security/pod-security-admission/
- Kubernetes Pod Security Standards docs: https://kubernetes.io/docs/concepts/security/pod-security-standards/
- Kubernetes PodSecurityPolicy removal notice: https://kubernetes.io/docs/concepts/security/pod-security-policy/
- RKE2 hardening guide: https://docs.rke2.io/security/hardening_guide
- RKE2 CIS self-assessment guides: https://docs.rke2.io/security/cis_self_assessment123 and https://docs.rke2.io/security/cis_self_assessment124

## Issues Found
- The post claimed the `rancher-cis-benchmark` flow applied to Rancher `v2.5 or later`. I narrowed the scope to Rancher `v2.10` and `v2.11`, and noted that Rancher `v2.12+` documents this feature as `rancher-compliance`.
- The direct Helm install command was incomplete. The Rancher chart expects the separate `rancher-cis-benchmark-crd` chart to be installed first when using Helm directly, so I added the CRD install step and pinned the commands to a compatible chart version variable.
- The UI navigation and scan creation steps did not match the official Rancher workflow. I updated them to the documented `Cluster Management` / `Explore` / `CIS Benchmark > Scan` flow.
- The example `scanProfileName: cis-1.6-profile` was version-specific and not valid for current `rancher-cis-benchmark` chart releases. I changed the scan examples to rely on the default profile selection, which the operator supports when `scanProfileName` is omitted.
- The post said only RKE, RKE2, or K3s clusters were relevant and treated the app as already installed in prerequisites. I corrected the prerequisites to reflect supported-profile-based usage and removed the contradictory preinstalled-app implication.
- The scan duration claim was replaced with the documented one-scan-at-a-time behavior because the timing statement was not supported by the official docs.
- The remediation for `--protect-kernel-defaults` used the wrong RKE2 configuration shape and included an extra sysctl setting not present in the RKE2 hardening guide. I changed it to RKE2’s documented top-level `protect-kernel-defaults` setting and the documented sysctl values.
- The post recommended `PodSecurityPolicy`, which is removed in Kubernetes `v1.25+`. I replaced it with Pod Security Admission / Pod Security Standards guidance using namespace labels.
- The custom scan profile example used `benchmarkVersion: cis-1.6`, which does not match current built-in benchmark names for the Rancher CIS chart releases reviewed. I updated it to a valid built-in benchmark example and aligned the skipped tests with the official configuration reference example.
- The report export section claimed CSV or PDF download and showed a `kubectl` command that only dumped CR objects, not the structured report payload. I corrected the UI export format to CSV and changed the CLI example to extract `spec.reportJSON`.
- The alerting section used an undocumented manual `PrometheusRule` example with an incorrect metric name. I replaced it with Rancher’s documented flow: enable chart alerting and configure `scanAlertRule` on scheduled scans.

## Review Notes
- Rancher’s newer documentation uses `Compliance` scans and the `rancher-compliance` app instead of `rancher-cis-benchmark`. The post is now technically scoped to the older-but-still-documented `rancher-cis-benchmark` workflow rather than Rancher’s latest naming.
- Built-in benchmark and profile names vary by Rancher/chart release and Kubernetes version, so using the default scan profile is safer than hard-coding an older profile name in a general guide.
