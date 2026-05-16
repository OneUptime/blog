# Validation Summary: How to Run NIST Compliance Checks on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (machine config: extraArgs, logging, install image, kubePrism)
- Kubernetes (RBAC, audit logging, network policies, Pod Security Admission)
- NIST Cybersecurity Framework (CSF 2.0) and NIST SP 800-53
- CIS Kubernetes Benchmark (via kube-bench)
- Trivy / Trivy Operator (vulnerability scanning)
- Kubescape (NSA-CISA, MITRE, CIS frameworks)
- Polaris (Fairwinds configuration auditing)
- Grafana (compliance dashboard)
- Kubernetes CronJob (continuous scanning)

## Sources Consulted
- [Kubescape — Frameworks documentation](https://kubescape.io/docs/frameworks-and-controls/frameworks/)
- [Kubescape regolibrary repository](https://github.com/kubescape/regolibrary)
- [NIST — NIST Releases Version 2.0 of Landmark Cybersecurity Framework (Feb 2024)](https://www.nist.gov/news-events/news/2024/02/nist-releases-version-20-landmark-cybersecurity-framework)
- [NIST SP 800-53 Rev. 5](https://csrc.nist.gov/pubs/sp/800/53/r5/upd1/final)
- [Kubernetes — Pod Security Admission docs (PodSecurityPolicy removed in v1.25)](https://kubernetes.io/docs/concepts/security/pod-security-admission/)
- [kube-bench (aquasecurity)](https://github.com/aquasecurity/kube-bench)
- [Trivy Operator (aquasecurity)](https://github.com/aquasecurity/trivy-operator)
- [Polaris (Fairwinds)](https://github.com/FairwindsOps/polaris)
- [Talos Linux machine configuration reference](https://www.talos.dev/latest/reference/configuration/)

## Issues Found

1. **NIST CSF described as five functions.** CSF 2.0 (released February 26, 2024) introduced a sixth function, **Govern**, alongside Identify, Protect, Detect, Respond, and Recover. Updated the "NIST Frameworks Overview" section to reference CSF 2.0 and list all six functions.

2. **Claim that Kubescape can scan against NIST SP 800-53 directly via `kubescape scan framework nist`.** The open-source Kubescape CLI has no built-in NIST framework; verified against the official Kubescape frameworks page, which lists only NSA-CISA Kubernetes Hardening, MITRE ATT&CK, and the CIS Benchmarks (`cis-v1.10.0`, `cis-v1.23-t1.0.1`, `cis-eks-t1.7.0`, `cis-aks-t1.2.0`). Running `kubescape scan framework nist` will fail. Replaced the command with `kubescape scan framework nsa` (NSA-CISA hardening overlaps substantially with NIST 800-53) and noted that direct NIST 800-53 reporting is available via the ARMO Platform (the SaaS that backs Kubescape). Rewrote the section heading and explanation accordingly. Also corrected the C-0005 description ("API server insecure port is enabled") and C-0034 description ("Automatic mapping of service account") to match the regolibrary.

3. **Same non-existent `nist` framework used in the Continuous Compliance Monitoring CronJob.** Updated the CronJob `command` to use `framework nsa` and renamed the output to `nsa-scan.json`. Also removed the `--submit` flag for consistency with the standalone CLI example, which now also does not submit.

4. **Same non-existent `nist` framework used in `generate-nist-report.sh`.** Updated the script to run `kubescape scan framework nsa` and noted in a comment that NSA-CISA overlaps NIST 800-53 / ARMO Platform provides direct NIST reports. Also switched `-o json` to the equivalent `--format json --output <path>` form which is unambiguously supported.

5. **`kubectl get podsecuritypolicies` in the report-generation script.** PodSecurityPolicy was removed in Kubernetes 1.25 (August 2022); by 2026 this command silently produces nothing (the original `2>/dev/null` masks the error). Replaced with `kubectl get namespaces -L pod-security.kubernetes.io/enforce,pod-security.kubernetes.io/audit,pod-security.kubernetes.io/warn`, which captures the modern Pod Security Admission labels actually used for enforcement.

6. **Summary referenced "direct NIST framework mapping" via Kubescape.** Updated to reflect the corrected guidance: NSA-CISA framework via Kubescape CLI, ARMO Platform for direct NIST 800-53 reporting.

## Review Notes

- The Talos machine config examples (`cluster.apiServer.extraArgs`, `machine.logging.destinations`, `machine.install.image`, `machine.features.kubePrism`) follow the documented Talos schema. The `kubePrism` default port of 7445 is correct.
- The kube-bench Job manifest is valid; `--targets node,policies` is a supported kube-bench target combination, and the `hostPath` mounts for `/var/lib/kubelet` and `/etc/kubernetes` work even on Talos because they are exposed inside the kubelet container's view.
- The Talos installer image is pinned to `v1.6.0`. As of May 2026, Talos has released several newer versions; the pinned version still works but readers may want to use a more recent release. Left as-is since the post's point is to demonstrate version pinning, not to prescribe a specific version.
- The NIST control-family mappings in the "How Talos Linux Helps" bullet list are reasonable interpretations rather than authoritative crosswalks. They are commonly cited in the security community and are not strictly "wrong", so left untouched.
- The `vulnerabilityreport` resource naming pattern (`deployment-api-server-api`) is illustrative; the actual name depends on workload type and name. This is a stylistic example, not a technical error.
- The Grafana dashboard JSON uses Prometheus metric names (`trivy_image_vulnerabilities`, `polaris_score`, `apiserver_audit_event_total`) that are illustrative of typical exporters; exact metric names vary by exporter version. Left as-is — the structure is a plausible example, not a copy-paste config.
