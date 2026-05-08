# Validation Summary: How to Test OpenStack Multiple Regions with Calico

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenStack
- OpenStackClient CLI
- Calico for OpenStack
- Calico BGP and route reflectors
- Calico network policy
- Bash
- Netcat

## Sources Consulted
- OpenStackClient server command documentation: https://docs.openstack.org/python-openstackclient/latest/cli/command-objects/server.html
- Calico BGP peering and route reflector documentation: https://docs.tigera.io/calico/latest/networking/configuring/bgp
- Calico `calicoctl get` documentation: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico for OpenStack overview: https://docs.tigera.io/calico/latest/getting-started/openstack/overview
- Calico OpenStack policy documentation: https://docs.tigera.io/calico/latest/network-policy/get-started/calico-policy/network-policy-openstack
- Calico OpenStack IP addressing and connectivity documentation: https://docs.tigera.io/calico/latest/networking/openstack/connectivity

## Issues Found
- `openstack server create --project multi-region-test` was incorrect because `server create` does not provide a `--project` option. Removed the flag and clarified that credentials should be scoped to the target project before running the setup script.
- `openstack server wait` was not a valid documented server command. Replaced it with the documented `openstack server create --wait` option.
- The setup script created only one VM per region, while later intra-region and failover tests require a second VM. Updated the setup script to create two test VMs per region and added an actual VM-to-VM intra-region ping test.
- The cross-region TCP test used `nc -l -p 8080`, which is less portable with OpenBSD netcat. Changed it to `nc -l 8080`.
- The policy consistency script used Kubernetes datastore variables and `calicoctl -o name`, which does not match the documented `calicoctl get` output options and is misleading for Calico OpenStack. Updated it to use a Calico config file, documented `yaml` output, OpenStack region namespaces, and hashes of region-scoped `NetworkPolicy` definitions.
- The failover script referenced `REGION_A_IP`, `REGION_B_IP`, and `REGION_A_VM2_IP` without defining them. Added the OpenStack lookups at the start of the script.
- The failover script stopped `calico-node`, which is Kubernetes-oriented wording. For OpenStack Calico, the documented components include Felix and BIRD; changed the route-reflector failure simulation to stop and start `bird`.
- The report script still used Kubernetes datastore variables and invalid `calicoctl -o name` output. Updated it to use the Calico config file and documented default `calicoctl get node` output.

## Review Notes
- The examples remain environment-dependent: region names, image names, hostnames, service names, security group rules, and SSH access must match the operator's deployment.
- The policy hash comparison is a practical smoke test. In production, operators may want to normalize generated metadata before comparing exported policy definitions.
