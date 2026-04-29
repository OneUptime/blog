# Validation Summary: How to Configure K3s for FIPS 140-2 Compliance

## Status
not-technically-relevant

## Post Type
Tutorial / configuration guide

## Technologies Covered
- K3s
- RKE2
- Kubernetes
- FIPS 140-2 / FIPS 140-3
- Red Hat Enterprise Linux
- Ubuntu Pro
- etcd
- TLS configuration

## Sources Consulted
- K3s security overview: https://docs.k3s.io/security
- K3s CIS Hardening Guide: https://docs.k3s.io/security/hardening-guide
- K3s Secrets Encryption: https://docs.k3s.io/security/secrets-encryption
- K3s server CLI reference: https://docs.k3s.io/cli/server
- K3s advanced configuration: https://docs.k3s.io/advanced
- K3s environment variables reference: https://docs.k3s.io/reference/env-variables
- K3s latest release on 2026-04-29 (`v1.35.4+k3s1`): https://github.com/k3s-io/k3s/releases/tag/v1.35.4+k3s1
- RKE2 FIPS 140-2 Enablement: https://documentation.suse.com/cloudnative/rke2/latest/en/security/fips_support.html
- SUSE Edge `RKE2 vs K3s`: https://documentation.suse.com/suse-edge/3.4/html/edge/components-rke2.html
- SUSE Rancher Manager Kubernetes distributions overview: https://documentation.suse.com/external-tree/en-us/cloudnative/rancher-manager/v2.11/en/integrations/kubernetes-distributions.html
- Red Hat Enterprise Linux 9 Security hardening: https://access.redhat.com/documentation/en-us/red_hat_enterprise_linux/9/pdf/security_hardening/red_hat_enterprise_linux-9-security_hardening-en-us.pdf
- Ubuntu Pro Client FIPS enablement: https://documentation.ubuntu.com/pro-client/en/v29/howtoguides/enable_fips.html
- Ubuntu 22.04 FIPS documentation: https://ubuntu.com/security/certifications/docs/2204/fips
- Ubuntu FIPS overview: https://documentation.ubuntu.com/security/compliance/fips/fips-overview/
- NIST CMVP overview: https://csrc.nist.gov/Projects/Cryptographic-Module-Validation-Program
- NIST FIPS 140-2 publication: https://csrc.nist.gov/pubs/fips/140-2/upd2/final

## Issues Found
- The core premise is unsupported by the current official K3s documentation. Current SUSE and Rancher documentation explicitly document FIPS 140-2 enablement for `RKE2`, while the K3s documentation covers hardening and secrets encryption but does not document a K3s-specific FIPS enablement path.
- The Step 2 binary instructions are misleading. They point to standard K3s release assets such as `k3s` and `k3s-arm64` and describe them as FIPS binaries, but the official K3s release artifacts and installation docs do not identify any FIPS-specific K3s binary or release channel.
- The claim that Rancher Government provides FIPS-validated K3s builds is not supported by the authoritative product documentation reviewed during validation. The official Rancher/SUSE materials reviewed here assign FIPS 140-2 compliance guidance to `RKE2`, not `K3s`.
- The Ubuntu section mixes standards. Ubuntu's current documentation says Ubuntu 22.04 is certified against FIPS 140-3, while Ubuntu 20.04 is the release with active FIPS 140-2 module listings. That conflicts with the post's unqualified `Ubuntu 20.04/22.04` guidance under a `FIPS 140-2` title.
- The post overstates what host FIPS mode proves. Red Hat's documentation explicitly states that switching a system to FIPS mode does not by itself guarantee compliance with the FIPS 140 standard.
- Several later sections mix general Kubernetes hardening with FIPS claims. TLS cipher restrictions, secrets encryption, audit logging, and network policies can be sensible security controls, but they do not establish that K3s is using validated FIPS cryptographic modules.
- The container image section is also misleading. Using a UBI base image alone is not sufficient to claim FIPS compliance for workloads; vendor documentation ties FIPS behavior to validated modules and host/runtime behavior, not simply to the image name.
- Because the unsupported premise affects the title, installation method, compliance claims, and verification steps, the post is not fixable with targeted corrections. It would require a full rewrite, most likely into either an `RKE2` FIPS article or a narrower K3s hardening article for FIPS-enabled hosts.

## Review Notes
This post is technical, but it should not remain published as a K3s FIPS 140-2 guide in its current form. No edits were made to `README.md` because the issues are structural rather than isolated command or syntax mistakes.
