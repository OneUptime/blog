# Validation Summary: How to Configure Certificate Rotation Policies in Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (talosctl)
- Kubernetes (PKI, API server, kubelet, controller manager, scheduler)
- etcd (peer and client TLS)
- TLS / x509 certificates
- Prometheus (alerting rules)
- enix/x509-certificate-exporter
- cert-manager (Helm chart)
- yq / openssl

## Sources Consulted
- Talos cert management guide: https://docs.siderolabs.com/talos/v1.7/security/cert-management
- Talos v1.10 CLI reference: https://docs.siderolabs.com/talos/v1.10/reference/cli
- Talos controllers/resources reference: https://docs.siderolabs.com/talos/v1.9/learn-more/controllers-resources
- Talos API reference (resource specs): https://docs.siderolabs.com/talos/v1.9/reference/api
- Talos constants (paths) package: https://pkg.go.dev/github.com/siderolabs/talos/pkg/machinery/constants
- Talos CA rotation guide: https://www.talos.dev/v1.7/advanced/ca-rotation/
- cert-manager Helm install docs: https://cert-manager.io/docs/installation/helm/

## Issues Found
1. **Invalid resource name `talosctl get certificates`** — This is not a documented Talos COSI resource. Replaced with `talosctl get KubernetesDynamicCerts`, which is the canonical, documented way to inspect Kubernetes certificates issued by Talos.
2. **Invalid file path `/system/secrets/kubernetes/certs/ca/tls.crt`** — Not present in Talos's upstream constants package. Replaced with the documented resource-based approach: `talosctl get kubernetesrootsecrets -o yaml | yq '.spec.issuingCA.crt' | base64 -d | openssl x509 ...`.
3. **Unsupported claim about "70-80% of lifetime" rotation threshold** — Not documented in official Talos sources. Removed the percentage qualifier and left a general statement that rotation happens before expiration.
4. **Invalid Talos CA inspection command** — The original `talosctl get certificates ... | grep -B5 -A5 "talos"` does not work for the same reason as #1. Replaced with `talosctl get osrootsecrets -o yaml | yq '.spec.issuingCA.crt' | base64 -d | openssl x509 -noout -dates -subject`.
5. **`talosctl gen config --roles os:reader --output-types talosconfig`** — The `--roles` flag does not exist on `talosctl gen config`. The correct command for generating a per-user client talosconfig with specific roles is `talosctl config new --roles os:reader <output-file>`. Replaced accordingly.
6. **Deprecated cert-manager Helm flag `--set installCRDs=true`** — Deprecated in cert-manager v1.15.0. Replaced with the current `--set crds.enabled=true`.
7. **Overly broad statement "Component certificates are typically 1 year"** — Tightened to specify client certificates (kubeconfig / talosconfig) which is what Talos documents.

## Review Notes
- `talosctl etcd status`, `--mode no-reboot`, `--mode staged`, `--from-controlplane-config` on `gen secrets`, `--wait-timeout` on `talosctl health`, and the `enix/x509-certificate-exporter` image were all verified as valid.
- The Prometheus alert rules and cert-manager Helm install snippet are otherwise current and correct.
- The general explanation of the Talos certificate landscape (Talos API certs, Kubernetes PKI, etcd certs, service-account keys) is accurate.
- The post's manual rotation section relies on running `talosctl apply-config` to re-issue secrets; users following these procedures in production should still cross-check the current Talos release notes for any breaking changes to `gen secrets` / `apply-config` semantics.
