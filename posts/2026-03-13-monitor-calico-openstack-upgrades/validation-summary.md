# Validation Summary: How to Monitor Calico on OpenStack Upgrades

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico
- OpenStack Neutron
- OpenStackClient CLI
- Kubernetes
- Prometheus
- OpenShift
- Bash

## Sources Consulted
- OpenStackClient network agent command documentation: https://docs.openstack.org/python-openstackclient/latest/cli/command-objects/network-agent.html
- OpenStackClient server ssh command documentation: https://docs.openstack.org/python-openstackclient/latest/cli/command-objects/server.html
- Calico for OpenStack overview: https://docs.tigera.io/calico/latest/getting-started/openstack/overview
- Calico OpenStack configuration documentation: https://docs.tigera.io/calico/latest/networking/openstack/configuration
- Calico OpenStack detailed semantics documentation: https://docs.tigera.io/calico/latest/networking/openstack/semantics
- Calico OpenStack floating IP documentation: https://docs.tigera.io/calico/latest/networking/openstack/floating-ips
- Calico Enterprise TigeraStatus documentation: https://docs.tigera.io/calico-enterprise/latest/reference/installation/tigerastatus

## Issues Found
- The post described "VM ARP resolution" as a critical Calico OpenStack signal. Calico's OpenStack integration provides routed IP connectivity and does not provide L2 adjacency between instances, so this was changed to "VM IP reachability."
- The prerequisite said Calico must be installed with the Neutron ML2 Calico plugin. Calico can run either as the Neutron Calico core plugin or as an ML2 mechanism driver, and floating IP support is documented for the core plugin path. The prerequisite was updated to reflect that distinction.
- The heartbeat command used `openstack network agent list --agent-type calico`, but the current OpenStackClient documentation does not list `calico` as a supported `--agent-type` value. The command was changed to list documented agent columns and filter Calico rows with `grep -i calico`.
- The JSON parsing example used `.alive`, but OpenStackClient table/list JSON output uses display column names such as `Alive`. The command was changed to avoid relying on an incorrect lowercase JSON key.

## Review Notes
The `openstack server ssh <test-vm> -- ping -c1 8.8.8.8` syntax is consistent with current OpenStackClient documentation allowing standard ssh arguments after `--`, but it still depends on the image login configuration, security group rules, key access, and whether the chosen VM has a route to the target address.
