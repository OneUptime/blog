# Validation Summary: How to Implement CIS Kubernetes Benchmarks on Talos

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (machine configuration, talosctl)
- Kubernetes (API server, kubelet, RBAC, NetworkPolicy, EncryptionConfiguration, Pod Security Standards)
- kube-bench (aquasec/kube-bench)
- CIS Kubernetes Benchmark

## Sources Consulted
- Talos config reference: https://docs.siderolabs.com/talos/v1.8/reference/configuration/v1alpha1/config/
- Talos editing machine configuration: https://docs.siderolabs.com/talos/v1.9/configure-your-talos-cluster/system-configuration/editing-machine-configuration
- talosctl CLI reference: https://www.talos.dev/v1.8/reference/cli/
- Kubernetes Encrypting Data at Rest: https://kubernetes.io/docs/tasks/administer-cluster/encrypt-data/
- Kubernetes kube-apiserver reference: https://kubernetes.io/docs/reference/command-line-tools-reference/kube-apiserver/
- Kubernetes kubelet reference: https://kubernetes.io/docs/reference/command-line-tools-reference/kubelet/
- Kubernetes Feature Gates: https://kubernetes.io/docs/reference/command-line-tools-reference/feature-gates/
- Pod Security Standards: https://kubernetes.io/docs/concepts/security/pod-security-standards/
- kube-bench: https://github.com/aquasecurity/kube-bench
- CIS Kubernetes Benchmark v1.7 / v1.8 / v1.9 control IDs

## Issues Found
- **Incorrect talosctl command for patch-only updates**: The post used `talosctl apply-config --nodes <ip> --patch @file.yaml` to apply just a patch on a running node. `apply-config` is intended to apply a full machine configuration via `--file`; using it with only `--patch` does not perform an in-place patch and can overwrite existing config. Changed to `talosctl patch mc --nodes <ip> --patch @file.yaml`, which is the correct command for applying patches to a node's existing machine configuration.

## Review Notes
- The `readonly` field (lowercase) in `cluster.apiServer.extraVolumes` is correct as written in the post — this matches the Talos `VolumeMountConfig` schema.
- The `aescbc` encryption provider is still supported in `apiserver.config.k8s.io/v1`, but it is known to be vulnerable to padding-oracle attacks. Future revisions could prefer `aesgcm`, `secretbox`, or a KMS provider for stronger guarantees. Not changed since the example is still functional and not formally deprecated.
- The CIS benchmark IDs referenced (e.g., 1.2.1 anonymous-auth, 4.2.1 kubelet anonymous-auth, 4.2.4 read-only-port, 1.2.10 EventRateLimit) are consistent with CIS Kubernetes Benchmark v1.7 / v1.8 / v1.9 — the post does not state a target version explicitly, but the numbering is valid across those.
- The `--protect-kernel-defaults` CLI flag still works but the kubelet config-file field `protectKernelDefaults` is the preferred long-term form. The post's `extraArgs` approach remains functional on current Talos / Kubernetes releases.
- `RotateKubeletServerCertificate` is still a (beta) feature gate in current Kubernetes versions and must be enabled to get kubelet server-certificate rotation; the post is correct to set it.
- The `aquasec/kube-bench:latest` image tag is functional but pinning to a specific version is a better practice for reproducibility in CI/compliance workflows.
- kube-bench on Talos benefits from the `aquasecurity/kube-bench` job/configs that include a Talos-specific config (CIS-1.x mappings); readers may want to use `--benchmark` flag and supply Talos-aware config paths since Talos stores some files in non-standard locations (the post does note this).
