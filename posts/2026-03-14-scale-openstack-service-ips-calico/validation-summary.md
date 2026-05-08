# Validation Summary: How to Scale OpenStack Service IPs with Calico

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenStack Neutron
- OpenStackClient CLI
- Calico for OpenStack
- Calico BGP configuration
- Calico GlobalNetworkPolicy
- BIRD routing

## Sources Consulted
- Calico OpenStack service IPs documentation: https://docs.tigera.io/calico/latest/networking/openstack/service-ips
- Calico OpenStack floating IPs documentation: https://docs.tigera.io/calico/latest/networking/openstack/floating-ips
- Calico for OpenStack overview: https://docs.tigera.io/calico/latest/getting-started/openstack/overview
- Calico OpenStack endpoint labels and operator policy: https://docs.tigera.io/calico/latest/networking/openstack/labels
- Calico BGPConfiguration resource reference: https://docs.tigera.io/calico/latest/reference/resources/bgpconfig
- Calico IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico `calicoctl ipam show` reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show
- OpenStackClient floating IP command reference: https://docs.openstack.org/python-openstackclient/latest/cli/command-objects/floating-ip.html
- OpenStackClient subnet command reference: https://docs.openstack.org/python-openstackclient/latest/cli/command-objects/subnet.html
- OpenStackClient port command reference: https://docs.openstack.org/python-openstackclient/latest/cli/command-objects/port.html
- OpenStackClient network command reference: https://docs.openstack.org/python-openstackclient/latest/cli/command-objects/network.html

## Issues Found
- The post treated OpenStack service IP allocation as a Calico `IPPool` workflow. Calico's OpenStack documentation describes service IPs as standard Neutron floating IPs or additional fixed IPs, so the service pool example was changed to OpenStack network, subnet, floating IP, and port commands.
- The original `IPPool` YAML used `encapsulation: None`, which is not a valid field for the `projectcalico.org/v3` `IPPool` resource. Removing the Calico `IPPool` example also removed this invalid configuration.
- The original monitoring script used `calicoctl ipam show` as if it were the source of truth for OpenStack service IP allocation. The script now checks OpenStack floating IPs and Neutron ports on the service subnet.
- The route aggregation section claimed that `prefixAdvertisements` advertises an aggregate route to reduce route table size. Calico documents `prefixAdvertisements` as per-prefix advertisement properties such as communities, so the text now describes it as BGP tagging and route-policy input rather than automatic aggregation.
- The policy example used arbitrary labels such as `service-name`, `service-consumer`, and `role`. Calico for OpenStack documents OpenStack-derived endpoint labels, so the policy now uses `projectcalico.org/openstack-project-name` selectors and includes an explicit `order`.
- The verification and troubleshooting commands referenced Calico IPAM pools instead of Neutron service allocations. They now use OpenStack subnet, floating IP, port, and local route checks.

## Review Notes
The corrected examples remain generic and use placeholder values such as `<target-vm-port-id>` and `<target-vm-network>`. In a real deployment, provider network creation may also require cloud-specific provider-network options, and BGP summarization should be planned with the route-reflector and upstream router topology.
