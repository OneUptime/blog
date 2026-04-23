# Validation Summary: How to Set Up Rancher for Government and FedRAMP

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher Manager
- RKE2
- Kubernetes API server
- Helm
- Harbor and private container registries
- Rancher Logging / logging-operator
- Rancher Compliance scans
- Microsoft AD FS / SAML
- OpenSCAP
- FedRAMP / NIST 800-53 / DISA STIG

## Sources Consulted
- RKE2 FIPS 140-2 Enablement: https://docs.rke2.io/security/fips_support
- RKE2 Secrets Encryption: https://docs.rke2.io/security/secrets_encryption
- RKE2 CIS Hardening Guide: https://docs.rke2.io/security/hardening_guide
- RKE2 Installation Methods: https://docs.rke2.io/install/methods
- RKE2 Configuration Options: https://docs.rke2.io/install/configuration
- Rancher Air-Gapped Helm CLI Install, Publish Images: https://ranchermanager.docs.rancher.com/v2.14/getting-started/installation-and-upgrade/other-installation-methods/air-gapped-helm-cli-install/publish-images
- Rancher Air-Gapped Helm CLI Install, Install Rancher: https://ranchermanager.docs.rancher.com/v2.10/getting-started/installation-and-upgrade/other-installation-methods/air-gapped-helm-cli-install/install-rancher-ha
- Rancher Configure Microsoft AD FS for Rancher: https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/authentication-permissions-and-global-configuration/configure-microsoft-ad-federation-service-saml/configure-rancher-for-ms-adfs
- Rancher Compliance Scans, Custom Benchmark: https://ranchermanager.docs.rancher.com/integrations-in-rancher/compliance-scans/custom-benchmark
- Rancher Logging Outputs and ClusterOutputs: https://ranchermanager.docs.rancher.com/v2.13/integrations-in-rancher/logging/custom-resource-configuration/outputs-and-clusteroutputs
- Logging operator syslog output reference: https://kube-logging.dev/docs/configuration/plugins/outputs/syslog/
- Kubernetes auditing: https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/
- Kubernetes `kube-apiserver` reference: https://kubernetes.io/docs/reference/command-line-tools-reference/kube-apiserver/
- FedRAMP Using Cryptographic Modules Policy: https://www.fedramp.gov/docs/using-cryptographic-modules/

## Issues Found
- The post used an undocumented `INSTALL_RKE2_FIPS=true` installer flag. I replaced it with the supported RKE2 installer and documented RKE2 configuration that keeps the FIPS-compatible defaults explicit.
- The original FIPS verification step used `rke2 --version | grep -i fips`, which is not a documented RKE2 validation method. I replaced it with a check of the configured secrets encryption state and removed the unsupported claim.
- The air-gapped workflow hard-coded Rancher `2.8.0` and used a manual retag/push loop that discarded repository paths. I replaced it with the documented `rancher-save-images.sh` and `rancher-load-images.sh` workflow plus the required private-registry Helm settings.
- The STIG section contained invalid repeated YAML keys and mismatched hardening guidance. I replaced it with a valid audit policy and an RKE2 config drop-in using `profile: cis` and supported `kube-apiserver` flags.
- The OpenSCAP section said it was running a Kubernetes STIG scan, but the command actually scanned the host RHEL SCAP content. I corrected the text to describe host OS STIG scanning and replaced the outdated Rancher `ClusterScanBenchmark` example with the documented custom benchmark ConfigMap workflow.
- The AD FS section used an outdated navigation path and incomplete claim guidance. I updated it to the documented Rancher UI path, ACS and metadata URLs, and the documented example claim URIs.
- The logging section claimed immutable audit log forwarding and used a `forward` output example that did not match the logging operator schema shown in current docs. I replaced it with a supported `ClusterOutput` and `ClusterFlow` syslog example and removed the immutability claim.
- The control summary incorrectly mapped `SC-28` to "FIPS etcd encryption". I corrected it to Kubernetes secrets encryption at rest using the `aescbc` provider.
- The introduction and conclusion overstated the requirement as universally "FIPS 140-2". I changed this to "FIPS-validated cryptography" while preserving the RKE2-specific "FIPS 140-2 enablement" wording where that matches vendor documentation.

## Review Notes
- The original post referenced Rancher `2.8.0`, which is now an archived Rancher release line. The revised post uses `<RANCHER_VERSION>` placeholders and the current stable chart repository workflow.
- RKE2 documents FIPS support only for Linux AMD64 hardened images, and only the default Canal CNI is called out as FIPS compliant.
- The revised Step 6 covers Rancher Logging cluster log forwarding. RKE2 audit logs themselves are written to `/var/lib/rancher/rke2/server/logs/audit.log`; forwarding that file to a SIEM still requires an appropriate node-level collector strategy.
