# Validation Summary: How to Operationalize Calicoctl Installation

## Status
validated

## Post Type
Technical operations guide

## Technologies Covered
- Calico Open Source
- calicoctl
- Kubernetes API datastore
- Kubernetes RBAC
- Bash scripting
- Linux file permissions and audit logging

## Sources Consulted
- Calico documentation: Install calicoctl - https://docs.tigera.io/calico/latest/operations/calicoctl/install
- Calico documentation: Configure calicoctl - https://docs.tigera.io/calico/latest/operations/calicoctl/configure/overview
- Calico documentation: Configure calicoctl to connect to the Kubernetes API datastore - https://docs.tigera.io/calico/latest/operations/calicoctl/configure/kdd
- Calico documentation: calicoctl get command reference - https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico documentation: calicoctl version command reference - https://docs.tigera.io/calico/latest/reference/calicoctl/version
- Calico documentation: calicoctl node and ipam command references - https://docs.tigera.io/calico/latest/reference/calicoctl/node/ and https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/
- Calico documentation: FelixConfiguration resource - https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Kubernetes documentation: RBAC Authorization - https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes documentation: Auditing - https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/

## Issues Found
- The upgrade verification command used `calicoctl get nodes -o name`. The official `calicoctl get` output formats are `yaml`, `json`, `ps`, `wide`, `custom-columns`, `go-template`, and `go-template-file`; `name` is a kubectl-style output format, not a documented calicoctl output format. Changed the command to `calicoctl get nodes > /dev/null 2>&1`.
- The operational wrapper set `CALICOCTL_BIN="/usr/local/bin/calicoctl"` while the install instructions replace `/usr/local/bin/calicoctl` with the wrapper. That would cause the wrapper to execute itself recursively. Changed it to `CALICOCTL_BIN="/usr/local/bin/calicoctl.bin"`.
- The wrapper installation example installed the wrapper as mode `755`, which bypassed the earlier `calico-ops` group execution restriction, and did not create a writable audit log for group-authorized users. Updated the install commands to keep both the renamed binary and wrapper owned by `root:calico-ops` with mode `750`, and to create `/var/log/calicoctl-audit.log` as group-writable by `calico-ops`.

## Review Notes
- The Calico documentation now recommends installing the Calico API server and using `kubectl` for most Kubernetes API resource operations in newer releases, while `calicoctl` remains required for subcommands such as `node`, `ipam`, `convert`, and `version`. The post's operational focus on `calicoctl` remains valid because it includes those administrative workflows.
- The example version `v3.27.0` is older than the current Calico documentation examples, but it is only an example argument. The post correctly encourages managed upgrades and should be paired with the official guidance to install a `calicoctl` version that matches the Calico cluster version.
