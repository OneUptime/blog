# Validation Summary: How to Harden a Talos Linux Cluster for Production

## Status
validated

## Post Type
Tutorial / Hardening checklist guide

## Technologies Covered
- Talos Linux (machine config, RBAC, ingress firewall, disk encryption, KubeSpan)
- Kubernetes (API server, controller manager, scheduler, etcd flags)
- Pod Security Admission
- Kubernetes audit logging
- Kubernetes NetworkPolicy, LimitRange, ResourceQuota
- LUKS2 disk encryption, TPM key sealing
- Prometheus / kube-prometheus-stack, PrometheusRule alerts
- AWS EC2 security groups (CLI)
- OpenSSL CSR generation
- talosctl, kubectl, helm

## Sources Consulted
- Talos Linux RBAC docs — https://docs.siderolabs.com/talos/v1.9/security/rbac
- Talos Ingress Firewall — https://docs.siderolabs.com/talos/v1.9/networking/ingress-firewall/
- Talos v1alpha1 config reference — https://docs.siderolabs.com/talos/v1.7/reference/configuration/v1alpha1/config/
- Talos KubeSpan — https://www.talos.dev/v1.11/talos-guides/network/kubespan/
- kube-apiserver command-line reference — https://kubernetes.io/docs/reference/command-line-tools-reference/kube-apiserver/
- Kubernetes certificate rotation — https://kubernetes.io/docs/tasks/tls/certificate-rotation/
- Pod Security Admission configuration — https://kubernetes.io/docs/tasks/configure-pod-container/enforce-standards-admission-controller/
- kube-state-metrics pod metrics — https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/pod-metrics.md
- kube-state-metrics v2.0 release notes — https://kubernetes.io/blog/2021/04/13/kube-state-metrics-v-2-0/

## Issues Found

1. **Section 2 — iptables firewall approach was unworkable on Talos.** The post wrote shell commands to `/var/etc/iptables/rules.sh` via `machine.files` and tried to load a non-existent `iptables` kernel module. Talos is immutable, has no shell, and never executes user-supplied scripts on boot, so this would silently do nothing. Replaced the block with Talos' built-in ingress firewall (Talos 1.6+) using `NetworkDefaultActionConfig` and `NetworkRuleConfig` documents, plus a sentence pointing the reader at the right primitive and away from the iptables dead end. Also removed the bogus `kernel.modules: - name: iptables` entry.

2. **Section 6 — `rotate-certificates` is not a valid kube-controller-manager flag.** `--rotate-certificates` is a kubelet flag (and even there it is being deprecated in favor of the kubelet config file's `rotateCertificates: true`). The controller-manager's role in kubelet cert rotation is via `--cluster-signing-cert-file` / `--cluster-signing-key-file`, not a `rotate-certificates` switch. Removed the line and its misleading comment.

3. **Section 6 — Misleading comment on `service-account-lookup`.** The flag was annotated as "Disable service account token auto-mount," which is wrong — it controls whether the API server validates that the ServiceAccount referenced by a token still exists in etcd. Auto-mount is a per-ServiceAccount/Pod field (`automountServiceAccountToken`), unrelated to this flag. Updated the comment to describe what the flag actually does.

4. **Section 10 — `PrivilegedContainerRunning` alert used a removed kube-state-metrics metric.** `kube_pod_spec_containers_security_context_privileged` was dropped in the kube-state-metrics v1.9 → v2.0 transition; on any modern KSM this expression returns nothing forever, so the alert never fires. Replaced it with a `PodSecurityViolation` alert built on `apiserver_admission_controller_admission_duration_seconds_count{name="PodSecurity",rejected="true"}`, which exists by default on the kube-apiserver once Pod Security Admission is enabled (which the post already configures in Section 4), so the alert is internally consistent with the rest of the guide.

## Review Notes

- The Talos client certificate role list (`os:admin`, `os:reader`, `os:etcd:backup`) is correct but incomplete — `os:operator` also exists. Not worth changing in the post; the three shown are the most common roles for the personas described.
- The `PodSecurityConfiguration` snippet in Section 4 is valid as-written *because* it lives under Talos' `cluster.apiServer.admissionControl[].configuration`, where Talos wraps it in the outer `AdmissionConfiguration` automatically. A reader trying to use the same YAML standalone (outside Talos) would need to wrap it manually.
- Static `passphrase` LUKS keys (Section 3) work but are weaker than `tpm`, `nodeID`, or `kms` for production. The post already shows the TPM variant as an upgrade path, which is reasonable guidance.
- The `kubespan.allowDownPeerBypass: false` setting (Section 9) is the stricter choice — traffic to a peer that's not reachable via WireGuard will be dropped rather than falling back to plaintext. Worth being aware of operationally; the post's framing is correct.
- The verification script uses `grep` against `talosctl get machineconfig -o yaml` output, which works but is fragile if field names ever shift; a `talosctl get` against a specific resource type (e.g., `machineconfig`) is fine for a sanity check but should not be the only verification in a real environment.
