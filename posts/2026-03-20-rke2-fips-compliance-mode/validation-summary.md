# Validation Summary: How to Configure RKE2 FIPS Compliance Mode - Mode

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- RKE2
- Kubernetes control plane TLS configuration
- Kubernetes kubelet TLS configuration
- FIPS 140-2 / FIPS mode
- Ubuntu Pro FIPS
- RHEL FIPS mode
- RKE2 CIS hardening profile

## Sources Consulted
- RKE2 FIPS 140-2 Enablement: https://docs.rke2.io/security/fips_support
- RKE2 Installation Methods: https://docs.rke2.io/install/methods
- RKE2 Configuration Options: https://docs.rke2.io/install/configuration
- RKE2 Server Configuration Reference: https://docs.rke2.io/reference/server_config
- RKE2 Secrets Encryption: https://docs.rke2.io/security/secrets_encryption
- RKE2 CIS Hardening Guide: https://docs.rke2.io/security/hardening_guide
- RKE2 About Hardened Images: https://docs.rke2.io/security/about_hardened_images
- Rancher RKE2 v1.30.2+rke2r1 GitHub release assets: https://github.com/rancher/rke2/releases/tag/v1.30.2%2Brke2r1
- Kubernetes kube-apiserver reference: https://kubernetes.io/docs/reference/command-line-tools-reference/kube-apiserver/
- Kubernetes kube-controller-manager reference: https://kubernetes.io/docs/reference/command-line-tools-reference/kube-controller-manager/
- Kubernetes kube-scheduler reference: https://kubernetes.io/docs/reference/command-line-tools-reference/kube-scheduler/
- Kubernetes kubelet reference: https://kubernetes.io/docs/reference/command-line-tools-reference/kubelet/
- Kubernetes KubeletConfiguration API: https://kubernetes.io/docs/reference/config-api/kubelet-config.v1beta1/
- Ubuntu Pro FIPS management guide: https://documentation.ubuntu.com/pro-client/en/latest/howtoguides/enable_fips/
- Red Hat Enterprise Linux 9 FIPS mode documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/security_hardening/switching-rhel-to-fips-mode_security-hardening

## Issues Found
- The post described a separate RKE2 FIPS binary and linked to `rke2.linux-amd64-fips` for `v1.30.2+rke2r1`; that asset does not exist in the official release. Updated the installation section to use the standard official RKE2 release assets, which RKE2 documents as built with FIPS-validated cryptographic libraries.
- The Ubuntu command used `ua enable fips`. Canonical's current guidance recommends `pro enable fips-updates`, with `fips` retained only for strict certified package streams on supported older releases. Updated the command and added the documented `/proc/sys/crypto/fips_enabled` verification.
- The post overstated RKE2 as using only FIPS-approved modules without noting the bundled CNI limitation. Updated the introduction to state that only the default Canal CNI is rebuilt for FIPS compliance.
- The TLS configuration omitted `kube-scheduler` while claiming to disable non-FIPS algorithms for Kubernetes components. Added `kube-scheduler-arg` TLS minimum version and cipher suite settings.
- The verification command assumed `/usr/local/bin/rke2` and grepped only for `fips`. RPM installs place files under `/usr`, and RKE2 version output commonly reports GoBoring/BoringCrypto. Updated the command to use `rke2 --version | grep -Ei "boringcrypto|fips"`.
- The TLS verification comment claimed a single `openssl s_client` command proves only FIPS-approved ciphers are enabled. Reworded it to say the command checks negotiation with a configured FIPS-approved cipher.
- The CIS profile example used `profile: cis-1.23`, which RKE2 now lists as deprecated for current versions. Updated it to the generic `profile: cis`.
- The CIS profile section appeared after the startup step and did not mention RKE2's CIS host-level requirements. Added wording that the profile should be configured before first start and after satisfying those prerequisites.
- The checklist claimed etcd encryption with AES-256-GCM. RKE2 secrets-at-rest encryption uses the FIPS-compatible `aescbc` provider, not AES-GCM. Updated the checklist wording accordingly.
- The checklist claimed all container images use FIPS-validated Go builds. RKE2 documents FIPS-compatible hardened system images with architecture and add-on caveats, so the checklist now requires reviewing RKE2 system images and third-party add-ons for FIPS-compatible crypto.

## Review Notes
The `kubelet-arg` TLS settings remain valid in RKE2, especially for older RKE2 minor versions. For RKE2 v1.32 and newer, RKE2 recommends kubelet configuration drop-ins for kubelet settings, so a future update could expand Step 3 with that variant if the post becomes version-specific.
