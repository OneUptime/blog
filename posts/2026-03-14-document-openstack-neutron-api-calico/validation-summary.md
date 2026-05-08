# Validation Summary: How to Document OpenStack Neutron API Integration with Calico for Operations

## Status
validated

## Post Type
Operations guide

## Technologies Covered
- OpenStack Neutron
- Calico for OpenStack
- networking-calico
- Calico datastore and Felix
- calicoctl
- OpenStackClient CLI
- Bash
- etcd
- MySQL

## Sources Consulted
- Calico for OpenStack overview: https://docs.tigera.io/calico/latest/getting-started/openstack/overview
- Calico interpretation of Neutron API calls: https://docs.tigera.io/calico/latest/networking/openstack/neutron-api
- Calico OpenStack configuration: https://docs.tigera.io/calico/latest/networking/openstack/configuration
- Calico floating IPs for OpenStack: https://docs.tigera.io/calico/latest/networking/openstack/floating-ips
- Calico WorkloadEndpoint resource reference: https://docs.tigera.io/calico/latest/reference/resources/workloadendpoint
- Calico Profile resource reference: https://docs.tigera.io/calico/latest/reference/resources/profile
- Calico calicoctl get command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- OpenStackClient port command reference: https://docs.openstack.org/python-openstackclient/3.11.0/command-objects/port.html
- OpenStackClient security group command reference: https://docs.openstack.org/python-openstackclient/3.10.0/command-objects/security-group.html

## Issues Found
- The introduction said every Neutron API call translates to Calico datastore operations. Calico documents that only certain Neutron API actions are interpreted and that some calls, such as network creation, are effectively no-ops. Updated the claim to refer to supported network, subnet, instance, and security operations.
- The resource mapping described subnets as Calico IPPool allocations. Calico OpenStack documentation describes Neutron subnet data as preserved and translated into datastore data, while IPPool is a broader Calico IPAM resource. Updated the mapping to use Neutron subnet data in the Calico datastore.
- The security group mapping used Calico Profile and Profile rules. Current Calico Profile rule fields are deprecated, and current OpenStack policy documentation describes generated Calico policy data from security groups. Updated the mapping and troubleshooting command to refer to Calico policy data and NetworkPolicies.
- The floating IP mapping described only an iptables NAT rule. Calico documents floating IP support as routed to the compute host and DNAT'd to the fixed IP, with support requiring Calico as the Neutron core plugin. Updated the mapping accordingly.
- The `calicoctl get workloadendpoints --all-namespaces -o name` command used an unsupported output format for calicoctl. Replaced it with default tabular output piped through `tail -n +2 | wc -l`.
- The bash troubleshooting script had invalid nested quotes in the MySQL status command. Escaped the inner quotes and verified the corrected snippet with `bash -n`.

## Review Notes
The post is version-neutral, but Calico OpenStack behavior has important deployment-mode caveats. Floating IPs are supported only when Calico is configured as the Neutron core plugin, and log/config paths may vary in containerized OpenStack deployments.
