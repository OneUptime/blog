# Validation Summary: How to Configure RKE2 with CIS Hardened Profile

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- RKE2
- Kubernetes
- CIS Kubernetes Benchmark
- Pod Security Admission
- Kubernetes NetworkPolicy
- Kubernetes API audit logging
- Rancher Compliance scans

## Sources Consulted
- RKE2 CIS Hardening Guide: https://docs.rke2.io/security/hardening_guide
- RKE2 Server Configuration Reference: https://docs.rke2.io/reference/server_config
- RKE2 Default Pod Security Standards: https://docs.rke2.io/security/pod_security_standards
- RKE2 CIS 1.11 Self-Assessment Guide: https://docs.rke2.io/security/cis_self_assessment111
- Rancher Compliance configuration reference: https://ranchermanager.docs.rancher.com/v2.14/integrations-in-rancher/compliance-scans/configuration-reference
- Kubernetes Pod Security Admission documentation: https://kubernetes.io/docs/tasks/configure-pod-container/enforce-standards-admission-controller/
- Kubernetes audit logging documentation: https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/

## Issues Found
- The post used `profile: cis-1.23` as the primary configuration. Current RKE2 documentation lists the generic `cis` profile as the preferred current profile and marks `cis-1.23` as deprecated for newer releases. Updated the examples and conclusion to use `profile: cis`, with a note that `cis-1.23` is only for older releases that require it.
- The sysctl example manually created a partial and partly unrelated sysctl file. RKE2 documents that it installs `rke2-cis-sysctl.conf` and operators should copy that file to `/etc/sysctl.d/60-rke2-cis.conf`. Replaced the manual heredoc with the documented copy commands for RPM and tarball installs.
- The etcd user command did not reliably create the required `etcd` group. Updated the example to create the group explicitly and create the user with `-g etcd`.
- The profile behavior list overstated or misstated several details. Clarified audit logging as audit log parameter configuration plus a default policy file, changed etcd wording to process/data directory ownership, and changed network policy wording to built-in namespaces.
- The Pod Security Admission example claimed the custom file was automatically referenced and enforced `baseline`. RKE2 creates its own default PSA file in CIS mode and enforces `restricted` with specific exemptions. Updated the section to be optional, Kubernetes v1.25+, set `restricted`, and use the documented exemptions.
- Current CIS 1.11 hardening requires `service-account-extend-token-expiration=false`. Added the `kube-apiserver-arg` example and verification output.
- The Rancher scan manifest used the older `cis.cattle.io/v1` API and an old RKE2 CIS 1.6 profile name. Updated it to the current `compliance.cattle.io/v1` API and the current Rancher Compliance example profile name.
- The network policy loop applied a deny-all policy to every non-`kube-*` namespace, which could break Rancher and add-on namespaces. Replaced it with an explicit workload namespace list and a note to add required allow policies separately.
- The audit logging section did not mention that RKE2 must be restarted after changing the audit policy. Added the documented restart command.

## Review Notes
- Rancher Compliance scan profile names are chart and Rancher-version specific. Operators should verify the installed `ClusterScanProfile` names in their cluster.
- The article now targets current RKE2 behavior using the generic `cis` profile and Kubernetes v1.25+ Pod Security Admission. Older RKE2 versions may require `cis-1.23` and, for v1.24 and earlier, Pod Security Policies instead of Pod Security Admission.
