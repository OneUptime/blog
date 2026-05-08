# Validation Summary: How to Test OpenStack Labels with Calico in Production-Like Environments

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenStack
- OpenStackClient CLI
- OpenStack security groups
- Calico for OpenStack
- Calico WorkloadEndpoint labels
- Calico GlobalNetworkPolicy
- calicoctl
- Bash
- Python JSON parsing

## Sources Consulted
- Calico OpenStack endpoint labels and operator policy: https://docs.tigera.io/calico/latest/networking/openstack/labels
- Calico GlobalNetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico WorkloadEndpoint resource reference: https://docs.tigera.io/calico/latest/reference/resources/workloadendpoint
- Calico network policy behavior and default deny notes: https://docs.tigera.io/calico/latest/network-policy/get-started/calico-policy/calico-network-policy
- Calico network policy for OpenStack: https://docs.tigera.io/calico/latest/network-policy/get-started/calico-policy/network-policy-openstack
- calicoctl get reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- OpenStackClient server command reference: https://docs.openstack.org/python-openstackclient/latest/cli/command-objects/server.html
- OpenStackClient security group command reference: https://docs.openstack.org/python-openstackclient/latest/cli/command-objects/security-group.html
- OpenStackClient security group rule command reference: https://docs.openstack.org/python-openstackclient/ussuri/cli/command-objects/security-group-rule.html

## Issues Found
- The post claimed that arbitrary OpenStack server metadata properties such as `calico-label-role` and `calico-label-environment` are propagated to Calico workload endpoint labels. Official Calico OpenStack documentation describes predefined labels for project, network, namespace, and security groups instead. I changed the examples to use documented security group labels such as `sg-name.projectcalico.org/openstack-web-pci`.
- The setup commands used `openstack server create --project label-test`, but current OpenStackClient server create documentation does not list a `--project` option. I changed the instructions to require credentials scoped to the `label-test` project and removed `--project` from server creation commands.
- The original positive connectivity test could fail even when policy was correct if nothing was listening on TCP port 5432. I added a simple Python HTTP listener on the database VM before running `nc`.
- The original label-change test used `openstack server set --property ...` to change labels, which does not update Calico OpenStack endpoint labels as described by official docs. I changed the test to remove and add OpenStack security groups, which updates the security group labels Calico documents for OpenStack endpoints.
- The original label-change script used `WEB_STAGING_IP` and `DB_PCI_IP` without defining them in that script. I added the variable assignments before the connectivity check.
- The OpenStack security group layer could have blocked the positive Calico policy test. I added security group rules for TCP 5432 so the examples test Calico policy behavior rather than failing at the OpenStack security group layer.

## Review Notes
The examples now rely on Calico's documented OpenStack endpoint labels. Project name labels require Neutron to have sufficient Keystone privileges; if a deployment does not expose project name labels, operators should use the documented project ID labels instead.
