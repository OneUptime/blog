# Validation Summary: How to Configure OpenStack Neutron API Integration with Calico

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- OpenStack Neutron
- Project Calico for OpenStack
- networking-calico
- Calico DHCP agent
- Felix and BIRD
- etcd
- OpenStackClient CLI

## Sources Consulted
- Calico OpenStack overview: https://docs.tigera.io/calico/latest/getting-started/openstack/overview
- Calico OpenStack system configuration: https://docs.tigera.io/calico/latest/networking/openstack/configuration
- Calico OpenStack Ubuntu installation: https://docs.tigera.io/calico/latest/getting-started/openstack/installation/ubuntu
- Calico interpretation of Neutron API calls: https://docs.tigera.io/calico/latest/networking/openstack/neutron-api
- networking-calico DHCP agent documentation: https://static.opendev.org/docs/networking-calico/1.3.1/dhcp-agent.html
- networking-calico source entry points and DHCP agent behavior: https://github.com/projectcalico/calico/tree/master/networking-calico
- python-openstackclient network agent command reference: https://docs.openstack.org/python-openstackclient/3.7.0/command-objects/network-agent.html
- python-openstackclient security group rule command reference: https://docs.openstack.org/python-openstackclient/newton/command-objects/security-group-rule.html

## Issues Found
- The prerequisites listed "etcd cluster or Kubernetes API" as the Calico datastore. Calico's OpenStack integration documentation describes etcd for the OpenStack driver and DHCP agent, so this was changed to etcd v3.
- The installation section only showed `pip install networking-calico`. Package-based Calico OpenStack installs use Calico packages such as `calico-control`, so the package path was added without removing the source-install option.
- The Neutron configuration snippet set `dhcp_agents_per_network = 0` and omitted the documented `service_plugins = qos` setting. The DHCP scheduler setting was removed and QoS service plugin configuration was added.
- The DHCP section configured the standard `neutron-dhcp-agent` with incorrect Calico driver class names and enabled isolated metadata. Calico uses the separate `calico-dhcp-agent`, overrides the required interface driver internally, and uses Nova metadata rather than Neutron metadata proxying. The section was corrected to install/start `calico-dhcp-agent`, disable `neutron-dhcp-agent`, and pass `neutron.conf` when running manually.
- The security group section claimed translation to Calico network policies. Calico's OpenStack documentation describes preserving Neutron security group semantics, and the implementation syncs policy/profile data for Felix. The wording and verification command were adjusted.
- The API extension section described "Calico-specific" Neutron API extensions. Calico supports standard Neutron extensions and provides the router extension itself when used as the core plugin. The section now verifies standard security-group, router, and QoS extensions.
- The verification script used `openstack network agent list --agent-type dhcp` for Calico DHCP. The Calico DHCP agent is not the standard Neutron DHCP agent, so this was changed to checking the `calico-dhcp-agent` service.

## Review Notes
The corrected post remains version-sensitive. Calico OpenStack packaging and service names can vary by distribution and deployment tooling, so production operators should still align the commands with their chosen OpenStack distribution.
