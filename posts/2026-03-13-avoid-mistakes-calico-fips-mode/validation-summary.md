# Validation Summary: How to Avoid Common Mistakes with Calico FIPS Mode

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico Open Source FIPS mode
- Tigera Operator Installation and ImageSet resources
- Kubernetes kubectl commands
- Kubernetes node debugging
- Felix-to-Typha TLS/mTLS
- Linux/RHEL FIPS mode

## Sources Consulted
- Calico documentation: FIPS mode - https://docs.tigera.io/calico/latest/operations/fips
- Calico documentation: Installation API reference - https://docs.tigera.io/calico/latest/reference/installation/api
- Calico documentation: Install images by registry digest / ImageSet - https://docs.tigera.io/calico/latest/operations/image-options/imageset
- Calico documentation: Secure Calico component communications - https://docs.tigera.io/calico/latest/network-policy/comms/crypto-auth
- Calico documentation: Configuring Typha - https://docs.tigera.io/calico/latest/reference/typha/configuration
- Calico documentation: Configuring Felix - https://docs.tigera.io/calico/latest/reference/felix/configuration
- Calico documentation: Manage TLS certificates used by Calico - https://docs.tigera.io/calico/latest/operations/certificate-management
- Kubernetes documentation: kubectl debug - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/
- Kubernetes documentation: Debugging Kubernetes nodes with kubectl - https://kubernetes.io/docs/tasks/debug/debug-cluster/kubectl-node-debug/
- Red Hat documentation: Switching RHEL to FIPS mode - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/security_hardening/switching-rhel-to-fips-mode_security-hardening

## Issues Found
- The post did not mention that current Calico documentation marks FIPS mode as deprecated and planned for removal. Added that caveat to the prerequisites.
- The image section claimed standard Calico images are not compiled with BoringCrypto. Current Calico docs describe FIPS mode as using the Tigera Cryptographic Module and state that `fipsMode` uses images and features backed by FIPS 140-2 validated modules. Reworded the section around accidental overrides through custom registries, image paths, image prefixes, or ImageSets.
- The image inspection command queried `pods ds/calico-node` and used the pod container path instead of the DaemonSet pod template path. Updated it to query `ds calico-node` with `.spec.template.spec.containers`.
- The image verification command relied on grepping `calico-node -version` for `fips`, which is not documented as an authoritative verification method. Replaced it with Installation status and ImageSet digest checks.
- The node FIPS debug command read `/proc/sys/crypto/fips_enabled` from inside the debug container. Kubernetes node debug pods mount the host filesystem at `/host`, so the command now reads `/host/proc/sys/crypto/fips_enabled`.
- The ImageSet upgrade section implied a distinct FIPS ImageSet naming convention. Calico's ImageSet name format is version based, such as `calico-v3.32.0`, so the text now focuses on approved digests for the target Calico version.
- The Felix-Typha mTLS section used `typhaAffinity`, which only controls Typha scheduling affinity and is deprecated in favor of `typhaDeployment`; it does not enable mTLS. Replaced the patch with verification of operator FIPS mode and manifest-based Typha/Felix TLS environment settings.
- The post claimed operator installs may communicate Felix-to-Typha in plaintext if mTLS is not configured. Current Calico documentation states operator-based installations automatically configure mutual TLS for Felix-to-Typha connections. Updated the section to preserve the compliance warning for manifest-based or heavily customized deployments.

## Review Notes
- The RHEL `fips-mode-setup --enable` example is valid for RHEL-family systems, but other Kubernetes node operating systems use different FIPS enablement workflows.
- Calico FIPS support has platform and feature restrictions, including Linux x86_64 host requirements and unsupported features such as WireGuard and BGP passwords.
