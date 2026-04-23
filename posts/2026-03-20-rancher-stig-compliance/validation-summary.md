# Validation Summary: How to Configure STIG Compliance in Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- RKE2
- Kubernetes API server configuration
- Kubernetes kubelet configuration
- Kubernetes audit logging and audit policies
- Kubernetes NetworkPolicy
- Kubernetes RBAC
- Rancher CIS scans
- OpenSCAP

## Sources Consulted
- RKE2 CIS Hardening Guide - https://docs.rke2.io/security/hardening_guide
- RKE2 Secrets Encryption - https://docs.rke2.io/security/secrets_encryption
- Kubernetes Admission Controllers - https://kubernetes.io/docs/reference/access-authn-authz/admission-controllers/
- Kubernetes kube-apiserver reference - https://kubernetes.io/docs/reference/command-line-tools-reference/kube-apiserver/
- Kubernetes Auditing - https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/
- Kubernetes Kubelet authentication/authorization - https://kubernetes.io/docs/reference/access-authn-authz/kubelet-authn-authz/
- Kubernetes kubelet reference - https://kubernetes.io/docs/reference/command-line-tools-reference/kubelet/
- Kubernetes Network Policies - https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Rancher CIS scans configuration reference - https://ranchermanager.docs.rancher.com/v2.11/integrations-in-rancher/cis-scans/configuration-reference
- Rancher RKE2 hardening guide - https://ranchermanager.docs.rancher.com/v2.10/reference-guides/rancher-security/hardening-guides/rke2-hardening-guide

## Issues Found
- The prerequisite `Rancher v2.6+` was outdated. I changed it to require a currently supported Rancher release because the original version guidance was stale.
- The API server example omitted RKE2's `profile`-based hardening and used `PodSecurityAdmission`, which is not the current admission plugin name. I added `profile: "cis"` with a version caveat, removed the invalid plugin reference, and kept `NodeRestriction`, which is the relevant extra admission controller for hardening.
- The audit logging configuration was incomplete and used generic Kubernetes paths that do not match RKE2's documented layout. I added `audit-policy-file`, switched the log and policy file paths to RKE2 paths, and added the required `rke2-server.service` restart command.
- The encryption-at-rest section used a generic `encryption-provider-config` workflow instead of RKE2's built-in secrets encryption, and the original `sudo cat > /etc/kubernetes/encryption-config.yaml` example would fail because shell redirection happens before `sudo`. I replaced this with RKE2-native AES-CBC guidance and verification commands.
- The audit policy comments did not match the rules, and the original `RequestResponse` level on secret writes would log secret payloads. I corrected the comments and changed secret/configmap write logging to `Metadata`.
- The kubelet comment for `streaming-connection-idle-timeout=5m` was incorrect because that value limits idle time rather than disabling the timeout. I corrected the wording and clarified the `event-qps` comment.
- The network policy example applied a default-deny policy to every namespace, which could break system namespaces and block DNS or required east-west traffic. I limited the example to application namespaces and noted that explicit allow policies are required.
- The CIS scan example hardcoded `rke2-cis-1.6-profile-hardened`, which is only appropriate for older RKE2/Kubernetes combinations, and Rancher does not ship a STIG-specific scan profile. I changed the example to list installed `ClusterScanProfile` resources and use the hardened RKE2 profile that matches the cluster version. I also removed the invalid `oscap-docker kubernetes stig scan` comment.

## Review Notes
- Rancher CIS scans are a baseline control check, not a STIG validator. The post's conclusion is correct that manual STIG review is still required.
- On Rancher-provisioned custom clusters running Kubernetes v1.25+, Rancher's restricted PSA template may also need to be applied at the cluster spec level in addition to node-level RKE2 settings.
- Several kubelet flags shown here are still valid through `kubelet-arg`, but upstream Kubernetes now prefers the kubelet config file for many of these settings.
