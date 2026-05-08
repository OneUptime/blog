# Validation Summary: How to Verify Pod Networking with Calico on OpenStack DevStack

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico for OpenStack
- OpenStack DevStack
- networking-calico DevStack plugin
- python-openstackclient CLI
- calicoctl
- Linux process and service verification

## Sources Consulted
- Calico for OpenStack overview: https://docs.tigera.io/calico/latest/getting-started/openstack/overview
- Calico DevStack installation guide: https://docs.tigera.io/calico/latest/getting-started/openstack/installation/devstack
- Calico calicoctl command and resource aliases: https://docs.tigera.io/calico/latest/reference/calicoctl/overview
- Calico `calicoctl node status` reference: https://docs.tigera.io/calico/latest/reference/calicoctl/node/status
- Calico FelixConfiguration resource reference: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico WorkloadEndpoint resource reference: https://docs.tigera.io/calico/latest/reference/resources/workloadendpoint
- OpenStack DevStack systemd documentation: https://docs.openstack.org/devstack/latest/systemd.html
- OpenStackClient `server` command reference: https://docs.openstack.org/python-openstackclient/latest/cli/command-objects/server.html
- OpenStackClient `console log show` reference: https://docs.openstack.org/python-openstackclient/latest/cli/command-objects/console-log.html
- OpenStackClient `console url show` reference: https://docs.openstack.org/python-openstackclient/latest/cli/command-objects/console-url.html
- OpenStackClient security group and rule references: https://docs.openstack.org/python-openstackclient/latest/cli/command-objects/security-group.html and https://docs.openstack.org/python-openstackclient/latest/cli/command-objects/security-group-rule.html
- networking-calico DevStack plugin source checked locally from https://github.com/projectcalico/calico/tree/master/networking-calico

## Issues Found
- The title referred to "Pod Networking", but the post verifies OpenStack VM networking. Calico's OpenStack integration documentation describes Neutron instances/VMs and WorkloadEndpoint resources for OpenStack workloads, not Kubernetes pods. Changed the title to "How to Verify VM Networking with Calico on OpenStack DevStack".
- The service-status commands used `devstack@calico-felix`, `devstack@calico-etcd`, and `devstack@calico-bird` systemd units. Current DevStack defaults to systemd, but the networking-calico DevStack plugin sets `USE_SYSTEMD=False` and enables screen-managed services such as `calico-dhcp`, `calico-bird`, and `etcd3`. Replaced those commands with `screen` checks and a process check for Calico-related processes.
- The VM console-log command was missing the required `show` subcommand. Changed `openstack console log verify-vm` to `openstack console log show verify-vm`.
- The security group section created a restrictive security group after VM creation and only commented that it should be assigned. That could leave the default security group attached, making the TCP-blocking claim environment-dependent. Moved creation of `verify-sg` before the VM creation and added `--security-group verify-sg` to the `openstack server create` command.
- Added `--wait` to `openstack server create` so the later workload-endpoint and server-list checks run after the VM build completes.

## Review Notes
- The workspace does not have `openstack` or `calicoctl` installed, so CLI syntax was verified against official OpenStackClient and Calico documentation rather than local `--help` output.
- The `ping -c3 8.8.8.8` test depends on DevStack external routing/NAT and the surrounding host network. It is a reasonable connectivity check, but failure may indicate upstream routing rather than a Calico WorkloadEndpoint issue.
