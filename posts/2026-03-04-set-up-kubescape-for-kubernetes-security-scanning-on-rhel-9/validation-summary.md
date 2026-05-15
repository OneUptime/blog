# Validation Summary: How to Set Up Kubescape for Kubernetes Security Scanning on RHEL

## Status
not-technically-relevant

## Post Type
Placeholder tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- CentOS Stream 9
- Kubernetes
- Kubescape
- systemd
- SELinux

## Sources Consulted
- Kubescape official CLI installation documentation: https://kubescape.io/docs/install-cli/
- Kubescape official getting started documentation: https://kubescape.io/docs/getting-started/
- Kubescape official scanning documentation: https://kubescape.io/docs/scanning/
- Kubescape official operator installation documentation: https://kubescape.io/docs/install-operator/

## Issues Found
- The article is placeholder content rather than a working Kubescape setup guide. It contains generic `<service>`, `<service-name>`, and `<package-name>` placeholders instead of Kubescape commands or configuration.
- The article omits the actual Kubescape installation flow. Official Kubescape documentation describes installing the CLI and running `kubescape scan`, or installing the in-cluster operator with Helm. The post does neither.
- The service-management instructions are incorrect for the described task. Kubescape CLI scanning is not configured by editing `/etc/<service>/config.conf` or managed with `systemctl enable/start/status <service-name>`.
- Because the post has no accurate, specific implementation path and is a generic template, it should be removed or replaced rather than minimally corrected.

## Review Notes
The post could be replaced with a fresh guide covering either Kubescape CLI installation and cluster scans from a RHEL 9 admin workstation, or Kubescape Operator installation in the Kubernetes cluster. Those are different workflows and should not be mixed without clearly explaining the intended deployment model.
