# Validation Summary: How to Configure Calico on OpenStack DevStack for a New Cluster

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico Open Source
- OpenStack DevStack
- OpenStack Neutron
- OpenStackClient
- etcd
- BGP
- FelixConfiguration
- BGPConfiguration

## Sources Consulted
- Calico DevStack documentation: https://docs.tigera.io/calico/latest/getting-started/openstack/installation/devstack
- Calico for OpenStack overview: https://docs.tigera.io/calico/latest/getting-started/openstack/overview
- Calico OpenStack configuration documentation: https://docs.tigera.io/calico/latest/networking/openstack/configuration
- Calico FelixConfiguration resource reference: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico BGPConfiguration resource reference: https://docs.tigera.io/calico/latest/reference/resources/bgpconfig
- Calico calicoctl command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/overview
- Calico IP pool block-size documentation: https://docs.tigera.io/calico/latest/networking/ipam/change-block-size
- OpenStackClient network command reference: https://docs.openstack.org/python-openstackclient/latest/cli/command-objects/network.html
- OpenStackClient subnet command reference: https://docs.openstack.org/python-openstackclient/latest/cli/command-objects/subnet.html
- DevStack configuration documentation: https://docs.openstack.org/devstack/latest/configuration.html
- Project Calico DevStack plugin source: https://github.com/projectcalico/calico/tree/master/networking-calico/devstack

## Issues Found
- The post described Calico configuration as "etcd-backed CRDs." CRDs are Kubernetes-specific, so this was changed to Calico `calicoctl` resources stored in etcd for OpenStack deployments.
- The IP pool patch example attempted to change `cidr` and `blockSize` on `default-ipv4-ippool`. Calico documents that `blockSize` cannot be edited directly after installation, and OpenStack VM addressing is configured through Neutron subnets. This was replaced with OpenStack network and subnet creation commands.
- The persistence explanation said `calicoctl` changes do not persist across DevStack re-runs. This was corrected to explain that `calicoctl` changes are stored in etcd while DevStack service configuration is regenerated from `local.conf`.
- The `local.conf` here-doc used an unquoted delimiter, which would expand `$NEUTRON_CONF` in the caller's shell before appending the file. This was changed to `cat <<'EOF'` so DevStack can evaluate `$NEUTRON_CONF`.
- The prerequisite claimed DevStack installs `calicoctl` automatically with the Calico plugin. The current plugin source configures Calico services but does not clearly guarantee `calicoctl` installation, so the prerequisite now requires `calicoctl` to be installed and configured.
- The verification commands recreated a network and subnet instead of verifying the resources created earlier. These commands were changed to `openstack network show` and `openstack subnet show`.
- The BGP step heading implied a complete external router setup, but the snippet only configures global BGP defaults. The heading was narrowed to "Configure BGP Defaults for Testing."

## Review Notes
The post is now technically valid as a DevStack/OpenStack Calico configuration guide. A future enhancement could add a separate BGP peer example for testing with a real external router, but that would be new content rather than a correctness fix.
