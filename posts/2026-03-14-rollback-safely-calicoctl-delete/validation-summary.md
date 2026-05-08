# Validation Summary: How to Roll Back Safely After Using calicoctl delete

## Status
validated

## Post Type
Tutorial / operational guide

## Technologies Covered
- Calico Open Source
- calicoctl
- Kubernetes
- Bash scripting
- Calico IPPool, GlobalNetworkPolicy, BGPConfiguration, and node status operations

## Sources Consulted
- Calico calicoctl user reference: https://docs.tigera.io/calico/latest/reference/calicoctl/overview
- Calico calicoctl delete reference: https://docs.tigera.io/calico/latest/reference/calicoctl/delete
- Calico calicoctl get reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico calicoctl apply reference: https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- Calico calicoctl replace reference: https://docs.tigera.io/calico/latest/reference/calicoctl/replace
- Calico calicoctl configuration for Kubernetes datastore: https://docs.tigera.io/calico/latest/operations/calicoctl/configure/kdd
- Calico install calicoctl guide: https://docs.tigera.io/calico/latest/operations/calicoctl/install
- Calico IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico troubleshooting and diagnostics guide: https://docs.tigera.io/calico/latest/operations/troubleshoot/troubleshooting

## Issues Found
- The prerequisites said "calicoctl v3.27 or later", which could imply that any newer calicoctl version is appropriate. Calico documentation says calicoctl should match the Calico version running on the cluster, so the prerequisite now states that requirement while preserving the v3.27-or-later scope of the guide.
- The verification comment said `calicoctl node status` checks that all Calico nodes are healthy. Calico documentation uses this command to inspect BGP status from a host running Calico, and install documentation notes some node subcommands do not work from a local machine. The comment now says to check BGP status from each Calico node.
- The troubleshooting section described a `"resource already exists"` restore case and recommended `calicoctl replace` instead of `calicoctl apply`. Calico documentation defines `apply` as create-or-replace, so the note now explains that `apply` replaces the existing spec and `replace` is appropriate when you want the operation to require an existing resource.

## Review Notes
The backup and recovery scripts are syntactically valid Bash and use documented `calicoctl get`, `delete`, `apply`, and `replace` behavior. The guide assumes the Kubernetes datastore and a working kubeconfig or equivalent calicoctl configuration, which is consistent with the examples.
