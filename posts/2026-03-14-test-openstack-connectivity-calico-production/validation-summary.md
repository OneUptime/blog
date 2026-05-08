# Validation Summary: How to Test OpenStack Connectivity with Calico in Production-Like Environments

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenStack
- OpenStackClient CLI
- Neutron networking
- Nova metadata service
- Calico for OpenStack
- Linux networking tools (`ssh`, `ping`, `curl`, `iperf3`)

## Sources Consulted
- OpenStackClient server command documentation: https://docs.openstack.org/python-openstackclient/latest/cli/command-objects/server.html
- OpenStackClient network command documentation: https://docs.openstack.org/python-openstackclient/latest/cli/command-objects/network.html
- OpenStackClient subnet command documentation: https://docs.openstack.org/python-openstackclient/3.10.0/command-objects/subnet.html
- OpenStackClient security group rule command documentation: https://docs.openstack.org/python-openstackclient/latest/cli/command-objects/security-group-rule.html
- Calico for OpenStack overview: https://docs.tigera.io/calico/latest/getting-started/openstack/overview
- Calico interpretation of Neutron API calls: https://docs.tigera.io/calico/latest/networking/openstack/neutron-api
- Calico OpenStack IP addressing and connectivity: https://docs.tigera.io/calico/latest/networking/openstack/connectivity
- Calico OpenStack detailed semantics: https://docs.tigera.io/calico/latest/networking/openstack/semantics
- Calico OpenStack configuration, including metadata service behavior: https://docs.tigera.io/calico/latest/networking/openstack/configuration
- Calico OpenStack deployment verification: https://docs.tigera.io/calico/latest/getting-started/openstack/installation/verification

## Issues Found
- The post described cross-network traffic as going via an OpenStack router. Calico for OpenStack provides connectivity between Neutron networks by routing at the compute nodes, regardless of Neutron router objects. Updated the setup, test heading, diagram labels, and troubleshooting text to describe Calico L3 routing instead.
- The introduction said OpenStack security groups under Calico could be enforced by iptables or eBPF. The Calico OpenStack documentation describes iptables enforcement for this integration. Updated the statement to iptables only.
- The setup used the default security group while the scripts require inbound SSH and ICMP. Added creation of a dedicated `connectivity-test-sg` with SSH and ICMP rules and attached it to the test VMs.
- The prerequisites did not mention that the test runner must be able to SSH to the VM addresses. Added that prerequisite because the test scripts execute commands over SSH.
- The metadata troubleshooting note referred to metadata proxy configuration and the metadata agent. Calico for OpenStack uses Nova metadata service without Neutron proxying. Updated the troubleshooting guidance accordingly.

## Review Notes
The OpenStack CLI syntax used for project, network, subnet, server, and security group operations matches current OpenStackClient documentation. The scripts still assume image, flavor, SSH username, key access, availability-zone host names, and workload IP reachability that vary by deployment, so operators may need to adapt those values for their environment.
