# Validation Summary: How to Upgrade Calico on OpenStack Ubuntu Safely

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico for OpenStack
- Calico Felix
- Calico Neutron driver / networking-calico
- calicoctl
- etcd / etcdctl
- Ubuntu APT packages
- OpenStack Neutron and server CLI

## Sources Consulted
- Calico OpenStack upgrade documentation: https://docs.tigera.io/calico/latest/operations/upgrading/openstack-upgrade
- Calico OpenStack Ubuntu installation documentation: https://docs.tigera.io/calico/latest/getting-started/openstack/installation/ubuntu
- Calico OpenStack architecture overview: https://docs.tigera.io/calico/latest/getting-started/openstack/overview
- Calico calicoctl install documentation: https://docs.tigera.io/calico/latest/operations/calicoctl/install
- Calico calicoctl get reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico calicoctl user reference: https://docs.tigera.io/calico/latest/reference/calicoctl/overview
- Calico Felix configuration documentation: https://docs.tigera.io/calico/latest/reference/felix/configuration
- Calico WorkloadEndpoint resource documentation: https://docs.tigera.io/calico/latest/reference/resources/workloadendpoint
- etcd disaster recovery documentation: https://etcd.io/docs/v3.5/op-guide/recovery/
- etcd prefix query documentation: https://etcd.io/docs/v3.5/tutorials/how-to-get-key-by-prefix/

## Issues Found
- The original procedure upgraded the controller first. Tigera's current OpenStack upgrade documentation upgrades compute nodes before control nodes, so the compute and controller upgrade steps were reordered.
- The controller package command used `python3-networking-calico`, but the official OpenStack upgrade package set is `calico-control`, `calico-common`, and `networking-calico`; the command was corrected.
- The compute package command omitted `calico-common`, `networking-calico`, and `calico-dhcp-agent`; the command was corrected to match the official compute node package set.
- The upgrade commands did not update the Calico APT source before installing the target version; `add-apt-repository ppa:project-calico/calico-<target-minor>` was added to the compute and controller steps.
- The Felix restart description implied a policy enforcement interruption. Existing dataplane rules remain in place while Felix is restarting, so this was changed to a pause in policy updates.
- The raw etcd backup command used the etcd v2 `etcdctl ls` command. Current Calico OpenStack guidance uses etcdv3, so it was replaced with an etcd v3 snapshot command.
- The `calicoctl` download was hardcoded to v3.27.0. The command now uses a target release placeholder so `calicoctl` can match the installed Calico version, as recommended by the official docs.
- The post said workload endpoint count should match active instance count. A Calico WorkloadEndpoint represents a VM interface, so the wording was corrected to compare against expected active VM interfaces.

## Review Notes
The post is now technically valid as a concise operational guide. Operators should still adapt the placeholder values (`<target-minor>` and `<target-release>`) to the exact Calico release they are deploying and include any site-specific etcd endpoint or TLS flags required by their environment.
