# Validation Summary: How to Migrate Existing Workloads to Calico on OpenStack DevStack

## Status
validated

## Post Type
Technical migration guide

## Technologies Covered
- Calico Open Source
- OpenStack DevStack
- networking-calico
- OpenStack Neutron
- OpenStackClient
- etcd
- Felix
- BIRD

## Sources Consulted
- Calico DevStack installation documentation: https://docs.tigera.io/calico/latest/getting-started/openstack/installation/devstack
- Calico for OpenStack overview: https://docs.tigera.io/calico/latest/getting-started/openstack/overview
- DevStack plugin syntax: https://docs.openstack.org/devstack/latest/plugins.html
- networking-calico DevStack plugin source: https://github.com/projectcalico/calico/tree/master/networking-calico/devstack
- OpenStackClient server command documentation: https://docs.openstack.org/python-openstackclient/latest/cli/command-objects/server.html
- OpenStackClient server image command documentation: https://docs.openstack.org/python-openstackclient/2023.2/cli/command-objects/server-image.html
- Calico calicoctl get documentation: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico calicoctl node status documentation: https://docs.tigera.io/calico/latest/reference/calicoctl/node/status

## Issues Found
- The introduction described the DevStack change as a CNI switch. Calico's OpenStack integration uses the networking-calico Neutron driver, Felix, BIRD, etcd, and the Calico DHCP agent, not Kubernetes CNI. Updated the wording to describe the Neutron/OpenStack integration accurately.
- The clean migration snippet set `Q_PLUGIN=calico`, pinned `networking-calico` to `stable/yoga`, and enabled `calico-etcd`, `calico-felix`, and `calico-bird`. Current Calico DevStack documentation uses an `enable_plugin networking-calico` line without that branch pin, and the plugin source enables/configures the required services itself, including DevStack's `etcd3`, `calico-dhcp`, and `calico-bird`. Updated the snippet accordingly.
- The original in-place migration procedure manually stopped OVS, deleted `br-int`, installed packages, set only `core_plugin`, and restarted Neutron. That is not a supported DevStack migration path and is incomplete for networking-calico because the DevStack plugin also configures agent handling, etcd settings, Calico DHCP, BIRD, Felix configuration, and other integration details. Replaced it with a snapshot-and-recreate workflow for preserving VM data.
- The conclusion claimed the manual in-place approach achieved the same result as the plugin-driven DevStack setup. Updated it to recommend clean re-stack or snapshot/recreate workflows.

## Review Notes
- DevStack is intended for development and testing, so a clean re-stack remains the most reliable migration path. For production OpenStack, operators should use the Calico OpenStack installation and upgrade procedures for their distribution rather than DevStack workflows.
- The current Calico documentation still references `github.com/projectcalico/networking-calico` for the DevStack plugin, while the active source is also visible in the main `projectcalico/calico` repository under `networking-calico`. The post now follows the documented plugin line and avoids an unverified stable branch pin.
