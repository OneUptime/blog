# Validation Summary: How to Automate Calico FIPS Mode

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico and the Tigera operator
- Kubernetes and kubectl
- Linux FIPS mode on RHEL and Ubuntu
- Ansible
- Terraform AWS launch templates
- Flux CD Kustomizations
- GitHub Actions

## Sources Consulted
- Calico FIPS mode documentation: https://docs.tigera.io/calico/latest/operations/fips
- Calico Installation API reference: https://docs.tigera.io/calico/latest/reference/installation/api
- Kubernetes kubectl debug reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/
- Kubernetes node debugging documentation: https://kubernetes.io/docs/tasks/debug/debug-cluster/kubectl-node-debug/
- Red Hat RHEL FIPS mode documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/security_hardening/switching-rhel-to-fips-mode_security-hardening
- Ubuntu FIPS enablement documentation: https://ubuntu.com/security/certifications/docs/fips-enablement
- Ubuntu Pro Client FIPS documentation: https://documentation.ubuntu.com/pro-client/en/latest/howtoguides/enable_fips/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Kustomize API reference: https://fluxcd.io/flux/components/kustomize/api/v1/
- Terraform AWS provider aws_launch_template documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/launch_template
- Azure setup-kubectl action README: https://github.com/Azure/setup-kubectl
- GitHub Actions artifact documentation: https://docs.github.com/actions/guides/storing-workflow-data-as-artifacts

## Issues Found
- Calico FIPS mode is deprecated in current Calico documentation. Added a caveat in the introduction and changed the prerequisite from generic "FIPS-enabled Calico images" to a supported Calico release and image source.
- The original Ansible check used `fips-mode-setup --check` for all OS families, which is not the Ubuntu Pro workflow and made the Ubuntu condition unreliable. Replaced the idempotency check with `/proc/sys/crypto/fips_enabled`, updated Ubuntu to `pro enable fips-updates --assume-yes`, and flushed handlers before verification so the reboot can happen before the final check.
- The Terraform user data example showed commented-out shell commands instead of executable user data. Replaced it with a minimal executable bash snippet that enables FIPS only when needed.
- The Terraform comment said IMDSv2 is required for FIPS compliance. Changed this to describe IMDSv2 as a node hardening baseline, because FIPS compliance is about validated cryptographic modules and approved algorithms, not EC2 metadata token enforcement.
- The Calico Installation `registry` field requires a trailing slash when set. Added an inline note to the GitOps example.
- The validation script used `kubectl debug` to read `/proc/sys/crypto/fips_enabled` from the debug container, not the host. Updated it to read `/host/proc/sys/crypto/fips_enabled`, matching Kubernetes node-debug behavior.
- The validation script printed failures but still exited successfully. Added a failure counter and non-zero exit behavior.
- The validation script claimed to verify FIPS images but only listed images. Changed the wording to record images as audit evidence.
- The GitHub Actions workflow used `azure/setup-kubectl@v3`, while the current documented major version is v4. Updated the action reference.
- The GitHub Actions workflow installed kubectl but did not configure cluster access. Added a kubeconfig step using a base64-encoded secret.
- The workflow piped validation output through `tee`, which could mask script failures. Added `set -o pipefail`.
- The conclusion overclaimed that automation ensures compliance. Revised it to say automation reduces misconfiguration risk and monitors FIPS-related configuration.

## Review Notes
Calico FIPS support is version-sensitive and deprecated, so future reviews should re-check whether the feature still exists in the targeted Calico release. The sample validation records deployed image references, but a production audit should also verify image provenance, digests, and vendor documentation for the specific Calico distribution in use.
