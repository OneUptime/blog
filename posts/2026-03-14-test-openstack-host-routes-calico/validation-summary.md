# Validation Summary: How to Test OpenStack Host Routes with Calico in Production-Like Environments

## Status
validated

## Post Type
Tutorial / operational testing guide

## Technologies Covered
- OpenStack / OpenStackClient
- Calico for OpenStack
- BIRD BGP
- Linux `ip route`
- Bash scripting

## Sources Consulted
- OpenStackClient server command documentation: https://docs.openstack.org/python-openstackclient/latest/cli/command-objects/server.html
- OpenStackClient compute service command documentation: https://docs.openstack.org/python-openstackclient/latest/cli/command-objects/compute-service.html
- Calico for OpenStack overview: https://docs.tigera.io/calico/latest/getting-started/openstack/overview
- Calico `calicoctl node status` documentation: https://docs.tigera.io/calico/latest/reference/calicoctl/node/status
- Calico WorkloadEndpoint resource documentation: https://docs.tigera.io/calico/latest/reference/resources/workloadendpoint
- RFC 4271, Border Gateway Protocol 4: https://www.rfc-editor.org/rfc/rfc4271
- Local `ip-route(8)` manual and `ip route help`

## Issues Found
- `openstack server create --project calico-test` is not part of the documented `server create` syntax. I removed the unsupported option and clarified that the OpenStack CLI credentials should be scoped to the test project.
- `openstack server wait <server>` is not a documented OpenStackClient server subcommand. I changed VM creation commands to use `openstack server create --wait`, which is documented for waiting until build completion.
- VM deletion examples used a fixed sleep after `openstack server delete`. I changed them to `openstack server delete --wait`, which is documented for waiting until deletion completes.
- Compute node loops used all compute service hosts, which can include non-`nova-compute` services on controller hosts. I added `--service nova-compute` to target compute nodes specifically.
- Route checks used `ip route show ${VM_IP}`, which does not precisely validate a VM host route. I changed route checks to `ip route show exact ${VM_IP}/32`, matching the Linux `ip route` selector syntax for exact host-route checks.

## Review Notes
- The article assumes IPv4 VM addresses and BIRD-backed Calico routing. That is consistent with the examples, but IPv6 or non-BIRD deployments would need adjusted commands.
- `ip route show proto bird` depends on the host having the BIRD route protocol name available to iproute2; this is common in Calico/BIRD deployments but can vary by distribution.
