# Validation Summary: Troubleshooting Errors in calicoctl node diags

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Calico
- calicoctl
- Kubernetes
- Linux networking tools
- Bash

## Sources Consulted
- Calico Open Source documentation: `calicoctl node diags` command reference, https://docs.tigera.io/calico/latest/reference/calicoctl/node/diags
- Calico Open Source documentation: `calicoctl node status` command reference, https://docs.tigera.io/calico/latest/reference/calicoctl/node/status
- Calico Open Source documentation: Troubleshooting and diagnostics, https://docs.tigera.io/calico/latest/operations/troubleshoot/troubleshooting
- Calico source: `calicoctl` node diagnostics implementation, https://github.com/projectcalico/calico/blob/master/calicoctl/calicoctl/commands/node/diags.go
- Kubernetes documentation: `kubectl exec` command reference, https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes documentation: `kubectl logs` command reference, https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- GNU Coreutils documentation: `timeout` invocation, https://www.gnu.org/software/coreutils/manual/html_node/timeout-invocation.html

## Issues Found
- The post used `sudo calicoctl node diags --output-dir=/var/tmp/`, but official Calico documentation only lists `--log-dir` for `calicoctl node diags`. The source implementation creates its bundle under the process temporary directory. Changed the guidance to set `TMPDIR=/var/tmp` for the command process.
- The post assumed bundles are named `/tmp/calico-diags-*.tar.gz`. Calico saves bundles as `/tmp/calico*/diags-<timestamp>.tar.gz`. Updated cleanup and verification commands to find the actual bundle path.
- The post checked for diagnostic filenames such as `iptables`, `ip-route`, `ip-addr`, and `bgp-status`, but Calico writes files such as `ipv4_route`, `ipv6_route`, `ipv4_addr`, `ipv6_addr`, `ipv4_tables`, `ipv6_tables`, and `ipsets`. Updated the expected-file check and manual fallback script to match the current implementation.
- The post checked for `iptables` instead of `iptables-save` and omitted other utilities used by the command, such as `nft` and `tar`. Updated the utility check to better match the diagnostic command.
- The Kubernetes examples hard-coded `calico-system`. Calico commonly uses that namespace in operator installs, but namespace can vary. Updated the examples to use `<namespace>`.

## Review Notes
The `timeout 300 sudo calicoctl node diags` example is syntactically valid on systems with GNU Coreutils. On macOS or other systems without GNU `timeout`, users may need an equivalent command or package.
