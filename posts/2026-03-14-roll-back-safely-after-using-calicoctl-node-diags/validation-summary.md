# Validation Summary: Rolling Back Safely After Using calicoctl node diags

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico
- calicoctl
- Kubernetes
- Linux routing and iptables diagnostics
- Bash

## Sources Consulted
- Calico `calicoctl node diags` reference: https://docs.tigera.io/calico/latest/reference/calicoctl/node/diags
- Calico `calicoctl node` reference: https://docs.tigera.io/calico/latest/reference/calicoctl/node/overview
- Calico `calicoctl delete` reference: https://docs.tigera.io/calico/latest/reference/calicoctl/delete
- Calico `calicoctl` user reference: https://docs.tigera.io/calico/latest/reference/calicoctl/overview
- Calico troubleshooting and diagnostics guide: https://docs.tigera.io/calico/latest/operations/troubleshoot/troubleshooting

## Issues Found
- The examples assumed diagnostic archives were saved as `/tmp/calico-diags-*.tar.gz`. Official Calico documentation shows `calicoctl node diags` writing the bundle under a temporary directory such as `/tmp/calico<random>/diags-<timestamp>.tar.gz` and printing the exact path. Updated the examples to capture the printed `Diags saved to` path and use that file.
- The comparison script used command substitution with `find` in `grep` and `sort` commands. If no matching file existed, those commands could read from stdin or behave unpredictably. Updated the script to use `find -exec` pipelines that work when zero, one, or multiple matching files are present.

## Review Notes
- The reviewed Calico documentation confirms `sudo calicoctl node diags` is the documented diagnostic collection command and that `calicoctl node` commands must run on the target node because they require host filesystem access.
- The rollback commands use valid Calico resource types and supported `calicoctl` operations. Exact resource names and backup YAML contents remain environment-specific.
