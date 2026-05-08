# Validation Summary: How to Scale OpenStack Semantics in Calico

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenStack Neutron
- Calico for OpenStack
- networking-calico Neutron driver
- Calico WorkloadEndpoint
- Calico NetworkPolicy and GlobalNetworkPolicy
- Calico FelixConfiguration
- `calicoctl`
- OpenStackClient CLI
- Bash
- YAML

## Sources Consulted
- Calico for OpenStack overview: https://docs.tigera.io/calico/latest/getting-started/openstack/overview
- Calico interpretation of Neutron API calls: https://docs.tigera.io/calico/latest/networking/openstack/neutron-api
- Calico OpenStack endpoint labels and operator policy: https://docs.tigera.io/calico/latest/networking/openstack/labels
- Calico WorkloadEndpoint resource reference: https://docs.tigera.io/calico/latest/reference/resources/workloadendpoint
- Calico NetworkPolicy for OpenStack guide: https://docs.tigera.io/calico/latest/network-policy/get-started/calico-policy/network-policy-openstack
- Calico GlobalNetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico FelixConfiguration resource reference: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico Felix configuration reference: https://docs.tigera.io/calico/latest/reference/felix/configuration
- OpenStackClient network command reference: https://docs.openstack.org/python-openstackclient/latest/cli/command-objects/network.html
- OpenStackClient subnet command reference: https://docs.openstack.org/python-openstackclient/latest/cli/command-objects/subnet.html
- OpenStackClient port command reference: https://docs.openstack.org/python-openstackclient/latest/cli/command-objects/port.html
- OpenStackClient security group command reference: https://docs.openstack.org/python-openstackclient/latest/cli/command-objects/security-group.html
- networking-calico source, Neutron mechanism driver options: https://github.com/projectcalico/calico/blob/master/networking-calico/networking_calico/plugins/ml2/drivers/calico/mech_calico.py
- networking-calico source, subnet synchronization: https://github.com/projectcalico/calico/blob/master/networking-calico/networking_calico/plugins/ml2/drivers/calico/subnets.py
- networking-calico source, WorkloadEndpoint labels/spec: https://github.com/projectcalico/calico/blob/master/networking-calico/networking_calico/plugins/ml2/drivers/calico/endpoints.py
- networking-calico source, security group policy translation: https://github.com/projectcalico/calico/blob/master/networking-calico/networking_calico/plugins/ml2/drivers/calico/policy.py

## Issues Found
- The post incorrectly mapped OpenStack security groups to Calico Profiles. Current networking-calico maps each security group to a Calico NetworkPolicy selected by generated security-group labels on WorkloadEndpoints, so the diagram, semantic reference, audit commands, verification output, and troubleshooting text were updated.
- The post described Neutron networks as mapping logically to Calico IP pools. Calico for OpenStack is L3-focused and represents network membership on endpoints with labels/annotations rather than creating a direct L2 or IP pool equivalent, so the network and subnet mapping language was corrected.
- The Neutron configuration snippet used unsupported `[calico]` options (`endpoint_reporting_delay` and `security_group_cache_timeout`). These were replaced with documented/source-backed networking-calico options: `num_port_status_threads`, `resync_interval_secs`, `resync_max_interval_secs`, and `project_name_cache_max`.
- The FelixConfiguration snippet used misleading tuning fields for this context. It now keeps only `logSeverityScreen`, which is a valid Felix configuration field.
- The OpenStackClient verification commands used `--all-projects` on list commands where the current OpenStackClient references do not document that option. The commands were changed to use the documented `list -f value` forms.
- The policy example claimed that a GlobalNetworkPolicy would run at lower priority than security group profiles. Calico documents that ordered operator policies are enforced before OpenStack security groups, so the example was changed to an explicit operator deny policy with `order: 10`.
- The metadata section implied arbitrary OpenStack port metadata is translated to Calico labels. It was corrected to describe the supported OpenStack project, network, security group, and namespace labels.

## Review Notes
The guide is now technically aligned with current Calico for OpenStack documentation and networking-calico source behavior. Operators should still validate exact tuning values in a staging environment because optimal Neutron and Felix settings depend on deployment size, datastore latency, and OpenStack release.
