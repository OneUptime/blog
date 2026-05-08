# Validation Summary: How to  Calico on OpenStack Upgrades - Validate

## Status
validated

## Post Type
Validation guide

## Technologies Covered
- Calico for OpenStack
- Calico Felix
- Tigera Operator and TigeraStatus
- OpenStack Neutron
- OpenStackClient
- Kubernetes kubectl
- Ansible

## Sources Consulted
- Calico OpenStack configuration documentation: https://docs.tigera.io/calico/latest/networking/openstack/configuration
- Calico OpenStack overview: https://docs.tigera.io/calico/latest/getting-started/openstack/overview
- Calico OpenStack upgrade documentation: https://docs.tigera.io/calico/latest/operations/upgrading/openstack-upgrade
- Calico OpenStack floating IP documentation: https://docs.tigera.io/calico/latest/networking/openstack/floating-ips
- Calico TigeraStatus reference: https://docs.tigera.io/calico-enterprise/latest/reference/installation/tigerastatus
- Calico troubleshooting commands: https://docs.tigera.io/calico/latest/operations/troubleshoot/commands
- OpenStackClient network agent command documentation: https://docs.openstack.org/python-openstackclient/latest/cli/command-objects/network-agent.html
- OpenStack floating IP user guide: https://docs.openstack.org/ocata/user-guide/cli-manage-ip-addresses.html

## Issues Found
- The post treated the Calico ML2 mechanism driver as compatible with floating IP validation. Updated the text to state that floating IP validation applies when Calico is configured as the Neutron core plugin (`core_plugin = calico`), because the Calico OpenStack documentation says floating IPs are only supported in core plugin mode.
- The validation command used `openstack network agent list --agent-type calico`, but OpenStackClient documents the supported `--agent-type` values and does not list `calico`; Calico's OpenStack documentation describes Felix as the compute-host agent. Replaced the check with an Ansible command that runs `calico-felix --version` on compute nodes, matching the Calico OpenStack upgrade documentation.
- The conclusion referred to "Neutron agent health" for Calico validation. Updated it to refer to Felix version checks and floating IP routing only when Calico is configured as the Neutron core plugin.

## Review Notes
The `kubectl get tigerastatus`, `kubectl get pods -n calico-system`, `openstack server list`, and `openstack floating ip list` commands are valid, but `tigerastatus` applies to Tigera Operator-managed Kubernetes installations. OpenStack inventory group names vary, so the `compute_nodes` Ansible group may need to match the operator's inventory.
