# Validation Summary: How to Verify Pod Networking with Calico on OpenStack Ubuntu

## Status
validated

## Post Type
Tutorial / verification guide

## Technologies Covered
- Calico for OpenStack
- OpenStack Neutron
- OpenStackClient CLI
- Ubuntu systemd services
- BGP routing with Calico/BIRD
- Calico workload endpoints and Felix

## Sources Consulted
- Calico for OpenStack overview: https://docs.tigera.io/calico/latest/getting-started/openstack/overview
- Calico OpenStack IP addressing and connectivity: https://docs.tigera.io/calico/latest/networking/openstack/connectivity
- Calico interpretation of Neutron API calls: https://docs.tigera.io/calico/latest/networking/openstack/neutron-api
- Calico WorkloadEndpoint resource reference: https://docs.tigera.io/calico/latest/reference/resources/workloadendpoint
- Calico BGP peering documentation: https://docs.tigera.io/calico/latest/networking/configuring/bgp
- calicoctl get command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- calicoctl node status command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/node/status
- OpenStackClient server command reference: https://docs.openstack.org/python-openstackclient/latest/cli/command-objects/server.html
- OpenStackClient port command reference: https://docs.openstack.org/python-openstackclient/zed/cli/command-objects/port.html

## Issues Found
- The post described OpenStack VM networking as "pod networking." Calico for OpenStack provides Neutron-backed VM instance networking, not Kubernetes pod networking. Updated the description and introduction to use accurate OpenStack terminology while preserving the post's intent.
- The post said VM IPs should fall within a configured Calico IP pool. In Calico for OpenStack, VM addresses are allocated through Neutron subnets and their allocation pools. Updated the statement to reference the Neutron subnet allocation pool.
- The VM-to-VM SSH example included a placeholder pipeline (`| ...`) inside command substitution, which is not runnable shell syntax. Replaced it with a concrete `VM_A_IP` extraction and a quoted remote `ping` command.
- The BGP verification step implied VM IPs should appear directly as BGP-advertised routes from the compute node command output. Updated the wording to distinguish established BGP session status, local/learned BIRD routes, and verification on a configured gateway or route reflector.
- The consistency check compared all Neutron ports with all Calico workload endpoints, but Neutron can include non-VM ports such as DHCP, router, floating IP, and service ports. Updated the command to filter VM interface ports with `--device-owner compute:nova` and clarified that each active VM interface port should have a corresponding workload endpoint.

## Review Notes
The guide is technically relevant and generally aligned with Calico for OpenStack concepts after the corrections. Future improvements could include showing how to map a specific Neutron port ID to a specific Calico workload endpoint and noting that SSH/ping tests may require permissive security group rules.
