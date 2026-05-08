# Validation Summary: How to Test OpenStack Networking with Calico in Production-Like Environments

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenStack
- OpenStackClient CLI
- OpenStack Neutron networking and security groups
- Calico for OpenStack
- Calico Felix
- iperf3
- netcat

## Sources Consulted
- OpenStackClient server command documentation: https://docs.openstack.org/python-openstackclient/latest/cli/command-objects/server.html
- OpenStackClient quota command documentation: https://docs.openstack.org/python-openstackclient/latest/cli/command-objects/quota.html
- OpenStackClient network command documentation: https://docs.openstack.org/python-openstackclient/3.4.0/command-objects/network.html
- OpenStackClient security group documentation: https://docs.openstack.org/python-openstackclient/latest/cli/command-objects/security-group.html
- OpenStackClient security group rule documentation: https://docs.openstack.org/python-openstackclient/2024.2/cli/command-objects/security-group-rule.html
- OpenStack networking-calico documentation: https://docs.openstack.org/networking-calico/1.3.1/
- Calico for OpenStack overview: https://docs.tigera.io/calico/latest/getting-started/openstack/overview
- Calico network policy for OpenStack documentation: https://docs.tigera.io/calico/latest/network-policy/get-started/calico-policy/network-policy-openstack
- Calico outgoing NAT documentation: https://docs.tigera.io/calico/latest/networking/configuring/workloads-outside-cluster

## Issues Found
- `openstack server create --project calico-net-test` was invalid. The documented `server create` command does not include a per-command `--project` option, so the post now tells readers to run server creation with credentials scoped to `calico-net-test` and removes the unsupported flag.
- The intra-network ping test would have been blocked by the `web-tier` security group because no ICMP ingress rule was created. Added an ICMP rule allowing traffic from the `web-tier` remote group.
- The connectivity and security group tests attempted to connect to HTTP and PostgreSQL-style ports without starting services on those ports. Added simple HTTP and netcat listeners so the tests validate reachability and policy enforcement rather than missing applications.
- The security group script used `WEB_VM1_IP` without defining it locally. Added variable initialization for the web and database VM fixed IPs.
- The SSH restriction test claimed to test internal SSH access but originated from the test host. Changed it to originate from `web-vm-2`, which is inside the allowed `10.0.0.0/8` source range.

## Review Notes
The guide remains environment-dependent: routed access to VM fixed IPs, server-name SSH resolution, and package availability depend on the specific OpenStack cloud image and operator network design. The Calico-specific claims about routed Layer 3 connectivity, Felix enforcement, Neutron translation, and optional outbound NAT are consistent with the consulted documentation.
