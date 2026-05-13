# Validation Summary: How to Install Calico on OpenStack DevStack Step by Step

## Status
validated

## Post Type
Tutorial / installation guide

## Technologies Covered
- Calico for OpenStack
- networking-calico DevStack plugin
- OpenStack DevStack
- OpenStackClient CLI
- Neutron networking
- Ubuntu Linux

## Sources Consulted
- Calico Open Source documentation, DevStack: https://docs.tigera.io/calico/latest/getting-started/openstack/installation/devstack
- Project Calico monorepo DevStack plugin files (`networking-calico/devstack/settings`, `networking-calico/devstack/bootstrap.sh`): https://github.com/projectcalico/calico
- OpenStack DevStack latest quick start: https://docs.openstack.org/devstack/latest/
- OpenStack DevStack Yoga quick start: https://static.openstack.org/docs/devstack/yoga/
- OpenDev `networking-calico` repository relocation notice: https://opendev.org/openstack/networking-calico
- OpenStackClient network command documentation: https://docs.openstack.org/python-openstackclient/latest/cli/command-objects/network.html
- OpenStackClient subnet command documentation: https://docs.openstack.org/python-openstackclient/latest/cli/command-objects/subnet.html
- OpenStackClient server command documentation: https://docs.openstack.org/python-openstackclient/latest/cli/command-objects/server.html

## Issues Found
- The prerequisites listed Ubuntu 20.04 and 22.04. Updated this to Ubuntu 24.04 and 22.04 to match the current DevStack documentation, which attempts to support the two latest Ubuntu LTS releases.
- The DevStack user setup missed `sudo chmod +x /opt/stack`, which current DevStack documentation recommends because Ubuntu 21.04+ can create the home directory with permissions that cause deployment issues.
- The DevStack clone step checked out `stable/yoga`, but that branch is no longer present in the DevStack repository; Yoga is now available as an unmaintained/EOM ref. Removed the checkout so the guide follows the current DevStack quick start.
- The `enable_plugin` line used the old OpenDev `networking-calico` repository with a `stable/yoga` branch. The OpenDev repository is no longer maintained there, and the current Calico DevStack plugin is exposed from the Project Calico monorepo as `enable_plugin calico https://github.com/projectcalico/calico master`.
- The `local.conf` manually enabled outdated or incorrect services such as `g-reg`, `n-crt`, `calico-etcd`, and `calico-felix`. Replaced those lines with the plugin-supported configuration because the plugin settings enable the needed Calico services, including `etcd3`, `calico-dhcp`, and `calico-bird`.
- The verification step used `calicoctl node status`, but the official Calico DevStack demonstration recommends inspecting routes with `ip route`, and the DevStack plugin does not document `calicoctl` as an installed verification tool. Replaced it with `ip route`.
- The test network commands created a regular tenant network. Calico's official DevStack instructions create a shared routed local provider network with an IPv4 subnet. Updated the commands to create a shared provider network, specify the local provider network type, set the gateway, enable DHCP, and ensure IPv4/IPv6 forwarding.
- The VM creation command used image and flavor names (`cirros`, `cirros256`) that are not guaranteed DevStack defaults. Updated the example to discover a CirrOS image and `m1.tiny` flavor before calling `openstack server create`.

## Review Notes
The post is technically valid after corrections, but the Calico/OpenStack DevStack path relies on the current Project Calico monorepo and DevStack master behavior. I did not run a full DevStack installation locally because it requires a dedicated VM and makes substantial system changes.
