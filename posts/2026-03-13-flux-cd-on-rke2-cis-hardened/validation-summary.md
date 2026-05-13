# Validation Summary: How to Set Up Flux CD on RKE2 with CIS Hardened Profile

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- RKE2
- Kubernetes
- Pod Security Admission and Pod Security Standards
- Flux CD
- kube-bench
- GitHub bootstrap for Flux

## Sources Consulted
- RKE2 CIS Hardening Guide: https://docs.rke2.io/security/hardening_guide
- RKE2 Server Configuration Reference: https://docs.rke2.io/reference/server_config
- RKE2 Configuration Options: https://docs.rke2.io/install/configuration
- RKE2 Quick Start: https://docs.rke2.io/install/quickstart
- Flux bootstrap for GitHub: https://fluxcd.io/flux/installation/bootstrap/github/
- Flux `bootstrap github` CLI reference: https://fluxcd.io/flux/cmd/flux_bootstrap_github/
- Flux Security Documentation: https://fluxcd.io/flux/security/
- Kubernetes Pod Security Admission: https://kubernetes.io/docs/concepts/security/pod-security-admission/
- Kubernetes Pod Security Standards: https://kubernetes.io/docs/concepts/security/pod-security-standards/
- kube-bench running guide: https://aquasecurity.github.io/kube-bench/v0.9.0/running/
- kube-bench supported platform configs: https://github.com/aquasecurity/kube-bench/tree/main/cfg

## Issues Found
- The RKE2 config used `profile: cis-1.23` as the default recommendation. Current RKE2 documentation recommends the generic `profile: cis` for version-appropriate CIS hardening, with `cis-1.23` now version-scoped and deprecated for newer releases. Updated the snippet to `profile: cis`.
- The RKE2 config snippet defined `kube-apiserver-arg` twice, which is invalid as a practical YAML configuration because the later key overrides the earlier one. Consolidated API server arguments under one key and moved the audit policy path to RKE2's top-level `audit-policy-file` setting.
- The guide stated that Flux controllers require `privileged` Pod Security labels. Flux documentation states that controller deployments conform to the Restricted Pod Security Standard. Updated the namespace labels and best-practice note to use `restricted`.
- The Flux bootstrap command disabled Flux network policies with the explanation that RKE2 CIS manages them separately. RKE2 CIS applies network policies for built-in namespaces, while operators must manage additional namespaces. Removed `--network-policy=false` so Flux's default controller network policies remain enabled.
- The kube-bench Job was applied in the default namespace, but RKE2 CIS enforces restricted PSA there and kube-bench requires host PID and hostPath mounts. Added a dedicated `kube-bench` namespace labeled `privileged`, and updated the apply/log commands to use that namespace.

## Review Notes
- The RKE2-specific kube-bench benchmark `rke2-cis-1.23` exists in the current kube-bench repository, but it is appropriate for older RKE2/Kubernetes benchmark mappings. For newer RKE2 versions, use the RKE2 benchmark matching the cluster's Kubernetes minor version.
- RKE2 v1.36 and newer may use a different default ingress controller than older RKE2 releases. The `rke2-ingress-nginx` disable example is accurate only for RKE2 versions that install that add-on.
