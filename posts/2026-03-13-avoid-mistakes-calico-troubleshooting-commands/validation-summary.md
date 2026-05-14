# Validation Summary: Common Mistakes to Avoid with Calico Troubleshooting Commands

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Calico
- calicoctl
- Kubernetes
- BGP peering
- Calico IPAM

## Sources Consulted
- Calico calicoctl user reference: https://docs.tigera.io/calico/latest/reference/calicoctl/overview
- Calico calicoctl delete reference: https://docs.tigera.io/calico/latest/reference/calicoctl/delete
- Calico calicoctl get reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico calicoctl node status reference: https://docs.tigera.io/calico/latest/reference/calicoctl/node/status
- Calico troubleshooting commands: https://docs.tigera.io/calico/latest/operations/troubleshoot/commands
- Calico install calicoctl guide: https://docs.tigera.io/calico/latest/operations/calicoctl/install
- Calico calicoctl version reference: https://docs.tigera.io/calico/latest/reference/calicoctl/version
- Calico calicoctl ipam show reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show
- Calico calicoctl ipam check reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/check
- Calico calicoctl ipam release reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/release
- Calico IP address management concepts: https://docs.tigera.io/calico/latest/networking/ipam/get-started-ip-addresses

## Issues Found
- The `calicoctl node status` example ran `calicoctl` by execing into a `calico-node` pod. Official Calico troubleshooting documentation shows `calicoctl node status` being run on the host, and current `calico/node` images should not be assumed to include `calicoctl`. I changed the example to run `sudo calicoctl node status` on each node, with an SSH loop as an environment-adjustable multi-node pattern.
- The version mismatch section said mismatches can cause parsing errors or missing fields and used `Cluster Calico Version` as the sample field name. Current Calico documentation says calicoctl and Calico versions should be the same and calls fail by default if they do not match unless `--allow-version-mismatch` is used; the documented field name is `Cluster Version`. I updated the wording and sample output accordingly.
- The conclusion described accidental `delete` or `ipam release` operations as irreversible without a backup. `calicoctl ipam release` makes an address available for reassignment and should only be used for stale endpoint cleanup, but "irreversible" was too absolute. I changed this to "disruptive and hard to recover from without a backup or a clear record of the previous state."

## Review Notes
The remaining commands and flags matched current Calico documentation. `calicoctl ipam show --show-blocks` reports pool and block usage, `calicoctl ipam check` checks IPAM data structure integrity against Kubernetes, and Calico IPAM blocks are node-associated chunks that Calico creates and destroys as needed. The `calico-system` namespace is correct for operator-based examples; manifest-based installs may use `kube-system`.
