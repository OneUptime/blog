# Validation Summary: How to Test Network Policies with Calico on OpenStack Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico for OpenStack
- OpenStack Neutron Security Groups
- OpenStack CLI
- Ubuntu / Linux networking
- iptables / Calico dataplane inspection
- calicoctl WorkloadEndpoint inspection

## Sources Consulted
- Calico for OpenStack overview: https://docs.tigera.io/calico/latest/getting-started/openstack/overview
- Calico network policy for OpenStack: https://docs.tigera.io/calico/latest/network-policy/get-started/calico-policy/network-policy-openstack
- Calico OpenStack endpoint labels and WorkloadEndpoint representation: https://docs.tigera.io/calico/latest/networking/openstack/labels
- Calico WorkloadEndpoint resource reference: https://docs.tigera.io/calico/latest/reference/resources/workloadendpoint
- calicoctl get command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- OpenStack Nova security groups documentation: https://docs.openstack.org/nova/2026.1/user/security-groups.html
- OpenStackClient security group rule command reference: https://docs.openstack.org/python-openstackclient/3.3.0/command-objects/security-group-rule.html
- OpenStackClient server command reference: https://docs.openstack.org/python-openstackclient/xena/cli/command-objects/server.html
- Calico eBPF use cases documentation: https://docs.tigera.io/calico/latest/operations/ebpf/use-cases-ebpf

## Issues Found
- The introduction said OpenStack Security Groups are typically implemented as iptables rules by the compute agent. OpenStack documents security groups as Neutron port attributes, and Calico documents the Neutron driver translating OpenStack operations into Calico data for Felix. Updated the wording to avoid an inaccurate implementation claim.
- The post said Felix translated rules into "iptables or eBPF rules." Current Calico documentation describes eBPF as an alternate Calico dataplane, but the OpenStack documentation does not frame OpenStack Security Group verification this way. Updated the wording to "dataplane rules."
- The security group creation comment said "allows only SSH" while the commands also allowed ICMP. Updated the comment to "SSH and ICMP."
- The HTTP test added a security group rule and immediately ran curl without starting a listener on the server VM. Added a simple non-root HTTP response listener using `nc` and moved the example port from 80 to 8080 to avoid requiring privileged binding inside the VM.
- The HTTP rule deletion example searched for port 80 after the test was corrected to use 8080. Updated the lookup and curl URL to use port 8080.
- The iptables inspection command searched for the literal string `calico`, but Calico's Linux dataplane commonly uses `cali-` chain names. Updated the command to `iptables-save | grep cali-`.

## Review Notes
The commands are valid as examples, but the exact VM image, credentials, network name, and flavor must match the target OpenStack cloud. The local environment did not have the OpenStack CLI or calicoctl installed, so CLI verification used official command references rather than local `--help` output.
