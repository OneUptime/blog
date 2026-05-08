# Validation Summary: How to Test OpenStack Neutron API Integration with Calico

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenStack Neutron
- OpenStackClient CLI
- Project Calico for OpenStack
- networking-calico
- calicoctl
- Bash

## Sources Consulted
- OpenStackClient security group rule command documentation: https://docs.openstack.org/python-openstackclient/latest/cli/command-objects/security-group-rule.html
- OpenStackClient network command documentation: https://docs.openstack.org/python-openstackclient/latest/cli/command-objects/network.html
- OpenStackClient subnet command documentation: https://docs.openstack.org/python-openstackclient/latest/cli/command-objects/subnet.html
- OpenStackClient port command documentation: https://docs.openstack.org/python-openstackclient/3.11.0/command-objects/port.html
- Calico for OpenStack overview: https://docs.tigera.io/calico/latest/getting-started/openstack/overview
- Calico OpenStack configuration documentation: https://docs.tigera.io/calico/latest/networking/openstack/configuration
- Calico interpretation of Neutron API calls: https://docs.tigera.io/calico/latest/networking/openstack/neutron-api
- Calico endpoint labels and operator policy documentation: https://docs.tigera.io/calico/latest/networking/openstack/labels
- Calico WorkloadEndpoint resource documentation: https://docs.tigera.io/calico/latest/reference/resources/workloadendpoint
- Calico Profile resource documentation: https://docs.tigera.io/calico/latest/reference/resources/profile
- Calico calicoctl get command documentation: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Project Calico networking-calico source code, especially `networking_calico/plugins/ml2/drivers/calico/policy.py` and `endpoints.py`: https://github.com/projectcalico/calico

## Issues Found
- The post described security group translation as Calico profile creation. Current Calico OpenStack implementation maps each OpenStack security group to a Calico `NetworkPolicy` named `ossg.default.<security-group-id>`, while VM security group membership is represented with `sg.projectcalico.org/openstack-<security-group-id>` labels. Updated the description, commands, and diagram to validate `NetworkPolicy` resources instead of profiles.
- The introduction implied that every tested Neutron API request directly produces Calico data plane configuration. Calico's OpenStack documentation states that Neutron network creation is effectively a no-op in Calico, while security group policies and bound workload ports are programmed into Calico resources. Updated the wording to avoid overgeneralizing.
- The stress test counted all Calico WorkloadEndpoints after creating standalone Neutron ports. networking-calico only writes WorkloadEndpoints for VM ports (`device_owner` beginning with `compute:`) or Kuryr container ports, so standalone unbound ports are not expected to appear as WorkloadEndpoints. Updated the test to verify the Neutron port count and added a note explaining the distinction.
- The stress test could divide by zero if the port creation loop completed within the same one-second timestamp interval. Added a guard for `DURATION=0`.
- The verification snippet counted Calico profiles. Updated it to count OpenStack security group-derived Calico `NetworkPolicy` objects in the OpenStack Calico namespace.
- Troubleshooting text referred to missing Calico profiles and generic port endpoints. Updated it to refer to Calico network policies and to clarify that only bound VM or Kuryr container ports should become WorkloadEndpoints.

## Review Notes
The OpenStackClient commands and flags used for networks, subnets, ports, security groups, and security group rules match documented CLI syntax. Calico OpenStack deployments may use the namespace `openstack-region-<region>` when `[calico] openstack_region` is configured, so the snippets now allow overriding the default `openstack` namespace with `CALICO_NAMESPACE`.
