# Validation Summary: How to Document OpenStack Service IPs with Calico for Operations Teams

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenStack Networking/Neutron
- OpenStackClient CLI
- Calico for OpenStack
- Calico workload endpoints, BGP routing, and Felix policy programming
- Linux routing and iptables diagnostics

## Sources Consulted
- Calico for OpenStack overview: https://docs.tigera.io/calico/latest/getting-started/openstack/overview
- Calico interpretation of Neutron API calls: https://docs.tigera.io/calico/latest/networking/openstack/neutron-api
- Calico IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico calicoctl get reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico calicoctl ipam show reference: https://docs.tigera.io/calico-enterprise/latest/reference/clis/calicoctl/ipam/show/
- Calico calicoctl ipam release reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/release
- OpenStackClient server command reference: https://docs.openstack.org/python-openstackclient/latest/cli/command-objects/server.html
- OpenStackClient port command reference: https://docs.openstack.org/python-openstackclient/latest/cli/command-objects/port.html
- OpenStackClient IP availability command reference: https://docs.openstack.org/python-openstackclient/latest/cli/command-objects/ip-availability.html
- OpenStack Neutron IP availability metrics: https://docs.openstack.org/ocata/networking-guide/ops-ip-availability.html

## Issues Found
- The post treated OpenStack service IP pools as Calico IPAM pools and used `calicoctl ipam show` as the primary utilization source. In Calico for OpenStack, Neutron networks, subnets, and ports remain the OpenStack source of IP allocation, while Calico programs workload connectivity and policy. Updated the examples to use `openstack ip availability show <service-network>` and Neutron subnet/port commands for service pool documentation and monitoring.
- The pool reference table used a Calico `Node Selector` column with values such as `service-host=true`, which is not the right way to describe OpenStack service address pools. Replaced it with OpenStack network, subnet CIDR, and allocation pool fields.
- The stale allocation check parsed `calicoctl ipam show --show-blocks` with `grep -c "allocated"`, but the documented output reports `IPS IN USE` and block usage rather than lines containing `allocated`. Replaced that check with a Neutron service-port review using `openstack port list --network <service-network> --long`.
- The cleanup procedure recommended `calicoctl ipam release --ip=<stale-ip>` for OpenStack service addresses. Replaced it with `openstack port delete <stale-port-id>` after confirming the service port is stale.
- The unreachable-service troubleshooting step described `calicoctl node status` as checking Felix. Updated it to describe the command as a Calico BGP peer-status check.
- The policy troubleshooting steps used Calico global network policy commands where OpenStack service-port security groups are the more accurate operational check. Updated them to inspect the service port and security group rules.

## Review Notes
The guide is now technically aligned with OpenStack/Neutron as the service IP allocation source and Calico as the dataplane/policy implementation layer. The examples still use placeholders such as `<service-network>` and `<service-ip>`, so operators should replace them with environment-specific network names, subnet names, and alerting logic.
