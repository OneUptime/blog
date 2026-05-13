# Validation Summary: How to Migrate Existing Workloads to Calico on OpenStack Ubuntu

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Calico for OpenStack
- OpenStack Neutron
- OpenStack Nova
- OpenStack CLI
- Ubuntu package-based installation
- Open vSwitch
- etcd v3
- BGP / BIRD

## Sources Consulted
- Tigera Calico for OpenStack overview: https://docs.tigera.io/calico/latest/getting-started/openstack/overview
- Tigera Calico OpenStack system requirements: https://docs.tigera.io/calico/latest/getting-started/openstack/requirements
- Tigera Calico OpenStack Ubuntu installation: https://docs.tigera.io/calico/latest/getting-started/openstack/installation/ubuntu
- Tigera Calico OpenStack configuration reference: https://docs.tigera.io/calico/latest/networking/openstack/configuration
- Tigera Calico OpenStack Neutron API behavior: https://docs.tigera.io/calico/latest/networking/openstack/neutron-api
- Tigera Calico OpenStack live migration documentation: https://docs.tigera.io/calico/latest/networking/openstack/live-migration
- OpenStackClient server image command documentation: https://files.openstack.org/docs/python-openstackclient/2025.2/cli/command-objects/server-image.html
- OpenStackClient subnet command documentation: https://docs.openstack.org/python-openstackclient/pike/cli/command-objects/subnet.html
- Open vSwitch ovs-vsctl man page: https://www.openvswitch.org/support/dist-docs/ovs-vsctl.8.pdf

## Issues Found
- The post implied existing OVS-backed VM objects could simply be restarted after switching Neutron to Calico. Calico's Ubuntu install documentation warns that incompatible OpenStack state must be removed, so the post now describes snapshotting/backing up workloads, deleting incompatible state, and rebuilding workloads from snapshots.
- The live migration statement was inaccurate and reversed the migration direction. Calico supports live migration for VMs already running on Calico, but live migration is not a supported way to convert an OVS-backed VM to Calico without downtime.
- The Calico control-node package name was incorrect. Replaced `python3-networking-calico` with the documented Calico PPA setup and `calico-control` package.
- The compute-node package list was incomplete and included `calico-felix` directly. Updated it to install the documented dependencies, `calico-dhcp-agent`, and `calico-compute`.
- The Felix configuration used `EtcdEndpoints`, which does not match the documented OpenStack Ubuntu example. Updated it to use `EtcdAddr = <etcd-ip>:2379` and `EndpointStatusPathPrefix = none`.
- The Neutron configuration omitted documented settings for `[calico] etcd_host` and `service_plugins = qos`. Added those settings with `crudini` to avoid brittle INI editing.
- The prerequisites omitted required etcd and BGP routing preparation. Added those requirements.
- The snapshot command did not wait for image creation and did not quote the server ID variable. Added `--wait` and quoting.
- The OVS bridge cleanup was too destructive. Added `--if-exists` and clarified that `br-ex` should only be deleted when it is not used for host connectivity.
- The final VM restart step was incorrect after deleting incompatible state. Replaced it with an `openstack server create` example that rebuilds a workload from a snapshot on the recreated Calico network.

## Review Notes
The corrected guide is still intentionally high-level. A production migration should also document exact router/subnet/network deletion commands for the operator's environment, route reflector configuration, DNS/metadata validation, security group review, and rollback criteria.
