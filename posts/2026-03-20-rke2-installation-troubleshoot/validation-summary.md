# Validation Summary: How to Troubleshoot RKE2 Installation Failures

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- RKE2
- Kubernetes
- systemd and journald
- etcd
- CNI networking
- TLS certificates
- SELinux

## Sources Consulted
- RKE2 Quick Start: https://docs.rke2.io/install/quickstart
- RKE2 Requirements: https://docs.rke2.io/install/requirements
- RKE2 Configuration Options: https://docs.rke2.io/install/configuration
- RKE2 Server Configuration Reference: https://docs.rke2.io/reference/server_config
- RKE2 Certificate Management: https://docs.rke2.io/security/certificates
- RKE2 SELinux: https://docs.rke2.io/security/selinux
- RKE2 Installation Methods: https://docs.rke2.io/install/methods
- RKE2 Uninstall: https://docs.rke2.io/install/uninstall
- Kubernetes Debug Running Pods: https://kubernetes.io/docs/tasks/debug/debug-application/debug-running-pod
- Kubernetes Node Status: https://kubernetes.io/docs/reference/node/node-status
- Kubernetes kubectl Reference: https://kubernetes.io/docs/reference/kubectl/

## Issues Found
- The firewall guidance listed 8472/UDP as a generic Flannel port and omitted etcd server-to-server ports. Updated the comment to distinguish common RKE2 ports, etcd ports, and CNI-specific VXLAN ports for Canal/Cilium and Flannel/Calico.
- The etcd cleanup command could be destructive if used on a real cluster. Clarified that removing `/var/lib/rancher/rke2/server/db/etcd` is only appropriate for failed initial bootstrap scenarios with no cluster data to preserve.
- The certificate SAN check used `server-ca.crt`, which is the CA certificate, not the API server serving certificate. Updated the command to inspect `serving-kube-apiserver.crt`.
- The certificate rotation example restarted the service after running `rke2 certificate rotate` while RKE2 was still running. Updated it to stop RKE2, rotate the `api-server` certificate, and start RKE2, matching the RKE2 certificate management workflow.
- The SELinux policy install command used a remote RPM wildcard URL that `rpm -ivh` cannot reliably expand. Replaced it with `yum install -y rke2-selinux container-selinux` and noted that tarball installs also need `selinux: true` in config.
- The uninstall command only covered tarball installs. Added the RPM uninstall path `/usr/bin/rke2-uninstall.sh`.

## Review Notes
The post is technically relevant and command-focused. Future improvements could include adding `kubectl describe pod` and `kubectl get events` to the Pending pods section, and noting that RKE2 installs `kubectl`, `crictl`, and `ctr` under `/var/lib/rancher/rke2/bin/`, which may not be on `PATH` by default.
