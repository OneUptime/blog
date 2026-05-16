# Validation Summary: How to Implement Compliance Policies on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (machine config / extraArgs)
- Kubernetes (kube-apiserver, controller-manager, scheduler, RBAC, NetworkPolicy, audit policy, PodDisruptionBudget)
- CIS Kubernetes Benchmark
- kube-bench
- Kyverno (ClusterPolicy validation)
- Pod Security Standards
- kubectl, jq, bash

## Sources Consulted
- Talos Linux machine config reference (cluster.apiServer/controllerManager/scheduler.extraArgs): https://www.talos.dev/latest/reference/configuration/
- Kubernetes kube-apiserver command-line reference: https://kubernetes.io/docs/reference/command-line-tools-reference/kube-apiserver/
- Kubernetes RBAC: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes NetworkPolicy v1 API: https://kubernetes.io/docs/concepts/services-networking/network-policies/ and https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.30/#networkpolicyegressrule-v1-networking-k8s-io
- Kubernetes audit policy (audit.k8s.io/v1): https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/
- Kyverno ClusterPolicy / validate / pattern docs: https://kyverno.io/docs/writing-policies/validate/ and https://kyverno.io/docs/writing-policies/match-exclude/
- PodDisruptionBudget policy/v1: https://kubernetes.io/docs/tasks/run-application/configure-pdb/
- Pod Security Standards labels: https://kubernetes.io/docs/concepts/security/pod-security-admission/
- kube-bench targets (node, policies, controlplane, etcd, master, managedservices): https://github.com/aquasecurity/kube-bench
- CIS Kubernetes Benchmark (rule numbering varies by version)

## Issues Found
No technical issues found. All API versions (rbac.authorization.k8s.io/v1, networking.k8s.io/v1, audit.k8s.io/v1, kyverno.io/v1, policy/v1, batch/v1) are current and correct. The Talos machine config patch uses the correct structure (`cluster.apiServer.extraArgs`, etc.). The kube-bench targets `node,policies` are appropriate for Talos since the controlplane is not directly accessible. The Kyverno pattern syntax (`*` wildcards, `|` OR operator, `*@sha256:*` digest match) is supported. NetworkPolicy egress `to: []` correctly allows all destinations per the Kubernetes spec. The Pod Security Standards enforce label format is correct.

## Review Notes
- CIS Kubernetes Benchmark rule numbering (1.2.1, 1.2.6, 1.2.16, 1.2.22, 1.3.2, 1.4.1) shifts between benchmark versions. The numbers used are approximately correct for recent versions and the control intent is accurate, but readers should consult the specific CIS version they are auditing against.
- Talos has historically already disabled anonymous auth and bound controller-manager / scheduler to localhost by default, so several of these flags are reinforcing defaults rather than changing behavior. This is harmless.
- Setting `audit-policy-file: "/etc/kubernetes/audit-policy.yaml"` and `audit-log-path: "/var/log/audit/kube-apiserver-audit.log"` on Talos may require corresponding `extraVolumes` mounts and the audit policy file to be delivered via Talos machine config (e.g., `inlineManifests` or a file resource), because the kube-apiserver runs as a static pod with a restricted filesystem view. The post does not describe that wiring; readers implementing this should layer the `extraVolumes` configuration on top.
- Kyverno `validationFailureAction` at the top of the spec is still supported but is deprecated in newer Kyverno versions (~1.13+) in favor of per-rule `validate.failureAction`. The form shown still works in current Kyverno releases.
- kube-bench on Talos has limited visibility into host filesystem state because Talos is API-driven and the host file paths kube-bench expects often do not exist or are not mountable; expect some checks to be reported as WARN/INFO rather than PASS.
