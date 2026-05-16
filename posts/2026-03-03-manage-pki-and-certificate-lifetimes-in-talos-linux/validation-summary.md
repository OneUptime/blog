# Validation Summary: How to Manage PKI and Certificate Lifetimes in Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (talosctl, machineconfig, COSI resources)
- Kubernetes (kube-apiserver, kubelet, etcd, controller-manager, scheduler)
- PKI / x509 certificates (OpenSSL)
- HashiCorp Vault (secrets storage)
- Prometheus / PrometheusRule (alerting)
- enix/x509-certificate-exporter (metrics)
- yq (YAML processing)

## Sources Consulted
- [Talos cert-management docs (v1.10)](https://docs.siderolabs.com/talos/v1.10/security/cert-management)
- [Talos CA rotation docs (v1.9)](https://docs.siderolabs.com/talos/v1.9/security/ca-rotation)
- [Talos CLI reference (v1.10)](https://docs.siderolabs.com/talos/v1.10/reference/cli)
- [Talos v1alpha1 config reference](https://docs.siderolabs.com/talos/v1.10/reference/configuration/v1alpha1/config/)
- [siderolabs/talos constants.go (source)](https://github.com/siderolabs/talos/blob/main/pkg/machinery/constants/constants.go) — confirmed `KubernetesAPIServerSecretsDir = /system/secrets/kubernetes/kube-apiserver` and `KubeletPKIDir = /var/lib/kubelet/pki`
- [Monitoring Kubernetes certificates on a Talos cluster (mteixeira)](https://mteixeira.wordpress.com/2025/12/07/monitoring-the-kubernetes-certificates-on-a-talos-cluster/) — confirmed `KubernetesDynamicCerts` resource usage
- [enix/x509-certificate-exporter README](https://github.com/enix/x509-certificate-exporter) — confirmed `--watch-kube-secrets`, `--secret-type`, default port 9793

## Issues Found

1. **Invalid COSI resource name `certificate`.** The post used `talosctl get certificate` and `talosctl get certificate -o yaml`. Talos does not have a resource named `certificate`. The correct resource for inspecting Kubernetes leaf certificates is `KubernetesDynamicCerts`. Replaced both occurrences with `talosctl get KubernetesDynamicCerts [-o yaml]`. Verified against the official Talos cert-management docs and against `siderolabs/talos` source.

2. **Incorrect API server certificate path `/etc/kubernetes/pki/apiserver.crt`.** Talos writes the kube-apiserver static-pod secrets to `/system/secrets/kubernetes/kube-apiserver/`, per the `KubernetesAPIServerSecretsDir` constant in `pkg/machinery/constants/constants.go`. The `/etc/kubernetes/pki/` directory in Talos contains the CA bundle (e.g. `ca.crt`) but not the served apiserver leaf cert that Talos generates for the static pod. Replaced four occurrences with `/system/secrets/kubernetes/kube-apiserver/apiserver.crt`.

## Review Notes

- Default lifetimes table is accurate: Talos root CAs default to 10 years, and leaf certificates default to roughly 1 year (kubelet client cert lifetime is governed by `--cluster-signing-duration`, which defaults to 365 days).
- The `/var/lib/kubelet/pki/kubelet-client-current.pem` path is correct — it's the standard Kubernetes kubelet TLS-bootstrap rotation file and matches the `KubeletPKIDir` constant in Talos.
- The yq paths `.machine.ca.crt` and `.cluster.ca.crt` correctly reflect Talos's `PEMEncodedCertificateAndKey` schema (fields `crt` and `key`).
- `talosctl apply-config --file ...` and `talosctl kubeconfig --force` are valid invocations.
- `talosctl gen secrets --output-file ...` is the correct flag (`-o` is the short form).
- The Prometheus metric `x509_cert_not_after` from `enix/x509-certificate-exporter` and the container port 9793 are correct defaults.
- Minor caveat: the comment "Force certificate regeneration by applying the config" is a bit of an overstatement — `apply-config` triggers reconciliation, which may renew leaf certs if they're close to expiry but does not unconditionally regenerate them. Left as-is since it's not strictly wrong; for a forced rotation users typically use `talosctl rotate-ca` (CAs) or a node reboot (kubelet certs).
- The post does not call out `talosctl rotate-ca`, which is the official command for the "Planned CA Rotation" and "Emergency CA Rotation" sections. The abbreviated steps shown are conceptually correct but could be tightened by pointing readers at `talosctl rotate-ca --talos --kubernetes` in a future revision.
