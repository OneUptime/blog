# Validation Summary: How to Troubleshoot Installation Issues with Calico on Bare Metal with Binaries

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Calico
- Kubernetes
- Container Network Interface (CNI)
- calicoctl
- systemd and journalctl
- Linux file permissions and executable binaries

## Sources Consulted
- Calico documentation: Calico the hard way - https://docs.tigera.io/calico/latest/getting-started/kubernetes/hardway/overview
- Calico documentation: Install CNI plugin - https://docs.tigera.io/calico/latest/getting-started/kubernetes/hardway/install-cni-plugin
- Calico documentation: Configure the Calico CNI plugins - https://docs.tigera.io/calico/latest/reference/configure-cni-plugins
- Calico documentation: Component logs - https://docs.tigera.io/calico/latest/operations/troubleshoot/component-logs
- Calico documentation: Configure calicoctl for the Kubernetes API datastore - https://docs.tigera.io/calico/latest/operations/calicoctl/configure/kdd
- Calico documentation: calicoctl ipam - https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/overview
- Calico documentation: Configuring calico/node - https://docs.tigera.io/calico/latest/reference/configure-calico-node
- Kubernetes documentation: Debug Running Pods - https://kubernetes.io/docs/tasks/debug/debug-application/debug-running-pod
- CNI specification - https://www.cni.dev/docs/spec/
- systemd documentation: systemctl - https://www.freedesktop.org/software/systemd/man/latest/systemctl.html
- systemd documentation: journalctl - https://www.freedesktop.org/software/systemd/man/latest/journalctl.html

## Issues Found
- The post said invalid CNI JSON causes pod creation to fail silently. Kubernetes and runtime troubleshooting surfaces these failures through pod events, kubelet logs, and runtime logs, so this was changed to say pod sandbox creation fails with visible CNI errors.
- The CNI log statement implied the log file is unconditional. Calico documents `/var/log/calico/cni/cni.log` as the default file log path and notes file logging can be configured, so the statement was changed to "By default."
- The `calicoctl` datastore checks only set `KUBECONFIG`. Calico defaults to the Kubernetes datastore in current releases, but official examples explicitly include `DATASTORE_TYPE=kubernetes` when specifying a kubeconfig, so the commands were updated to include it.
- The datastore failure explanation was too narrow because failures can come from datastore selection, kubeconfig path, authentication, or RBAC, not only the `calico-node` service account. The note was broadened accordingly.

## Review Notes
The post does not pin a Calico version. The reviewed commands are consistent with current Calico documentation, but binary-install paths and service unit names can vary by installation method.
