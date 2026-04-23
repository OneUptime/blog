# Validation Summary: How to Configure RKE2 FIPS Compliance Mode

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- RKE2
- Kubernetes
- FIPS 140-2
- Linux FIPS mode
- Red Hat Enterprise Linux
- Ubuntu Pro
- OpenSSL
- Kubernetes TLS configuration
- Kubernetes workload manifests

## Sources Consulted
- RKE2 FIPS 140-2 Enablement documentation: https://docs.rke2.io/security/fips_support
- RKE2 FIPS Verified attestation PDF: https://docs.rke2.io/assets/files/RKE2_FIPS_Verified-3d05ed29c1a2efbaae7313b7b638e85b.pdf
- RKE2 Server Configuration Reference: https://docs.rke2.io/reference/server_config
- RKE2 Configuration Options documentation: https://docs.rke2.io/install/configuration
- RKE2 CIS Hardening Guide: https://docs.rke2.io/security/hardening_guide
- RKE2 About Hardened Images documentation: https://docs.rke2.io/security/about_hardened_images
- RKE2 stable release channel: https://update.rke2.io/v1-release/channels/stable
- RKE2 release `v1.34.6+rke2r3`: https://github.com/rancher/rke2/releases/tag/v1.34.6+rke2r3
- Kubernetes `kube-apiserver` command reference: https://kubernetes.io/docs/reference/command-line-tools-reference/kube-apiserver/
- Kubernetes `kube-controller-manager` command reference: https://kubernetes.io/docs/reference/command-line-tools-reference/kube-controller-manager/
- Kubernetes `kubelet` command reference: https://kubernetes.io/docs/reference/command-line-tools-reference/kubelet/
- Kubernetes `KubeletConfiguration` API reference: https://kubernetes.io/docs/reference/config-api/kubelet-config.v1beta1/
- Red Hat Enterprise Linux 9 FIPS mode documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/security_hardening/switching-rhel-to-fips-mode_security-hardening
- Ubuntu FIPS enablement documentation: https://ubuntu.com/security/certifications/docs/fips-enablement
- Ubuntu Pro Client FIPS documentation: https://documentation.ubuntu.com/pro-client/en/latest/howtoguides/enable_fips/
- NIST Cryptographic Algorithm Validation Program documentation: https://csrc.nist.gov/projects/cryptographic-algorithm-validation-program

## Issues Found
- The post described RKE2 FIPS builds as separate artifacts with a `-fips` suffix or `fips` channel. Current RKE2 docs and release assets do not support that install pattern, so the install section now uses the standard RKE2 install script with a supported release or the `stable` channel.
- The example pinned `v1.28.8+rke2r1`, which is outdated for a current guide. Updated the example to `v1.34.6+rke2r3`, the stable channel target verified on 2026-04-23.
- The prerequisites claimed `RKE2 v1.21+` and did not mention the current Linux AMD64/x86_64 FIPS caveat. Replaced that with a supported RKE2 release on Linux AMD64/x86_64.
- The RKE2 configuration included ChaCha20-Poly1305 cipher suites in a FIPS-only TLS list. Removed the ChaCha20 suites and left AES-GCM ECDHE suites for TLS 1.2.
- The CIS profile used `cis-1.23`, which RKE2 now marks as deprecated. Updated it to the generic `profile: cis`.
- The kubelet TLS settings were passed through `kubelet-arg`, but upstream kubelet flags for these settings are deprecated and RKE2 v1.32+ recommends kubelet configuration drop-ins. Replaced that part with a `KubeletConfiguration` drop-in example.
- The Ubuntu example used `ua enable fips`, while current Ubuntu Pro documentation uses the `pro` client and recommends `fips-updates` for timely security updates. Updated the command and retained a commented strict `fips` option where available.
- The OpenSSL MD5 checks had misleading logic and could print success text when the digest command succeeded. Reworked the checks to warn when MD5 succeeds and to show the error output when it fails.
- The binary verification command depended on `file | grep "not stripped"`, which does not verify FIPS support. Replaced it with version/architecture checks and an optional `strings` check for FIPS/BoringCrypto build strings.
- The TLS verification command used `RC4-MD5`, which many modern OpenSSL builds reject locally before testing the server. Replaced it with an OpenSSL ChaCha20-Poly1305 TLS 1.2 spot-check that better matches the removed non-FIPS Kubernetes cipher suites.
- The application manifest used `OPENSSL_FIPS=1`, which is not a correct generic way to enable FIPS in modern containers. Removed it and clarified that the app image must be built and tested for FIPS behavior on a FIPS-enabled host.
- The application manifest referenced a namespace that was not created and used `runAsNonRoot` without an explicit non-root UID/GID. Added a `Namespace` object and explicit non-root user/group settings.
- The conclusion overpromised that the whole Kubernetes cluster would use only FIPS-approved algorithms. Narrowed it to RKE2 control plane and bundled runtime components, and kept the reminder that applications must be handled separately.

## Review Notes
- The TLS examples focus on TLS 1.2 cipher suite configuration because Kubernetes documents that TLS 1.3 cipher suites are not configurable for kubelet and Go-based components have different TLS 1.3 handling.
- RKE2 documentation states that Canal, the default CNI, is rebuilt for FIPS compliance; alternate CNIs should be evaluated separately before use in a FIPS environment.
- FIPS compliance depends on the full system boundary, including host OS configuration, RKE2 release/architecture, runtime images, application cryptography, and operational evidence retained for audits.
