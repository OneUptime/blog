# Validation Summary: How to Set Up Calico FIPS Mode Step by Step

## Status
validated

## Post Type
Tutorial / step-by-step guide

## Technologies Covered
- Calico (Open Source and Enterprise) v3.26+
- Tigera Operator (operator.tigera.io/v1 Installation and ImageSet CRDs)
- Felix (projectcalico.org/v3 FelixConfiguration CRD)
- Kubernetes (kubectl, kube-apiserver TLS configuration)
- RHEL 8/9 FIPS mode (`fips-mode-setup`)
- Ubuntu Pro / Ubuntu Advantage (`ua enable fips`)
- BoringCrypto / FIPS 140-2

## Sources Consulted
- Tigera Calico FIPS documentation: https://docs.tigera.io/calico/latest/operations/fips
- Tigera Installation API reference: https://docs.tigera.io/calico/latest/reference/installation/api
- Calico v3.26.0 release notes: https://github.com/projectcalico/calico/blob/v3.26.0/release-notes/v3.26.0-release-notes.md
- BoringSSL FIPS documentation: https://github.com/google/boringssl/blob/main/crypto/fipsmodule/FIPS.md
- Red Hat FIPS mode docs (`fips-mode-setup` utility)
- Ubuntu Pro FIPS documentation (`ua enable fips`)

## Issues Found

1. **Deprecated `componentResources` field** — The example `Installation` resource set `componentResources: []`. Per the Tigera Installation API reference, `componentResources` is deprecated in favor of component-specific resource config fields directly in `Installation.Spec` (e.g., `calicoNodeDaemonSet`, `typhaDeployment`). Removed the deprecated field from the example so the snippet does not steer readers toward a deprecated API.

2. **Incorrect kubectl command in Step 2** — `kubectl get configmap kube-apiserver-config -n kube-system` referenced a configmap that does not exist in standard kubeadm/managed Kubernetes distributions. The kube-apiserver typically runs as a static pod whose manifest lives at `/etc/kubernetes/manifests/kube-apiserver.yaml` on control-plane nodes (or is exposed via the running pod spec). Replaced the bogus configmap lookup with two accurate alternatives: inspecting the static manifest file and inspecting the running pod spec.

3. **Missing FIPS-mode caveats** — The Tigera FIPS docs explicitly list features that are not allowed while FIPS mode is enabled (Application Layer API / L7 features, BGP password, WireGuard), require Linux x86_64, and warn that switching FIPS off and then back on again is unsupported. These constraints are load-bearing for anyone actually deploying FIPS in production. Added a short note immediately after the Installation example so readers see the constraints alongside the configuration that enables FIPS.

## Review Notes
- The Tigera documentation marks FIPS mode as deprecated and notes it will be removed in a future release. The post does not mention this. Future revisions should call this out so readers can plan for the eventual replacement, but it does not invalidate the current setup steps for clusters running supported versions.
- The post says "Calico Open Source (from v3.26+) support FIPS mode." This is technically supported via the `fipsMode` field in the Tigera-operator-managed Installation, but the FIPS-enabled images themselves (BoringCrypto-built) have historically been published primarily by Tigera (quay.io/tigera/*) rather than the default projectcalico/calico images. The prerequisites already point at `quay.io/tigera/*`, which is consistent.
- The Ubuntu command `ua enable fips` still works, but Ubuntu has renamed the client to `pro` (`pro enable fips`). The legacy command remains valid, so no edit was required.
- The FIPS-approved TLS cipher suites listed in Step 2 are valid TLS 1.2 FIPS-compatible suites. TLS 1.3 cipher suites are negotiated differently and Go's BoringCrypto historically restricted TLS 1.3; the post's TLS 1.2 list is the safer recommendation to keep.
- The `fips-mode-setup --enable` / `--check` commands, the `/proc/sys/crypto/fips_enabled` verification, and the `fipsMode: Enabled` Installation field are all accurate.
