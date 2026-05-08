# Validation Summary: How to Scale OpenStack Labels with Calico

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenStack
- Calico OpenStack integration
- Calico WorkloadEndpoint resources
- Calico GlobalNetworkPolicy resources
- Calico label selectors
- calicoctl
- Felix Prometheus metrics
- Python shell snippets for JSON processing

## Sources Consulted
- Calico OpenStack endpoint labels and operator policy: https://docs.tigera.io/calico/latest/networking/openstack/labels
- Calico WorkloadEndpoint resource reference: https://docs.tigera.io/calico/latest/reference/resources/workloadendpoint
- Calico GlobalNetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico NetworkPolicy selector and selector performance reference: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico calicoctl get command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico Felix Prometheus metrics reference: https://docs.tigera.io/calico/latest/reference/felix/prometheus
- OpenStackClient compute service command reference: https://files.openstack.org/docs/python-openstackclient/latest/cli/command-objects/compute-service.html

## Issues Found
- The introduction said OpenStack VM labels are applied through Neutron port metadata. Calico's OpenStack documentation describes VM WorkloadEndpoint labels generated from OpenStack project, network, security group, and namespace information, so the wording was corrected.
- The selector performance diagram used literal `O(1) per endpoint` and `O(n)` claims and referred to regex selectors. Calico documents optimized and unoptimized selector forms instead, and Calico selectors support `contains`, `starts with`, and `ends with` rather than a regex operator. The diagram was updated to reflect the documented optimization categories.
- The label audit script only inspected top-level policy selectors and used a regex that missed Calico label names containing `.` or `/`. It was updated to recursively inspect nested policy selectors and match the documented Calico label-name characters.
- The troubleshooting section referenced `felix_calc_graph_update_duration_seconds`, which is not the documented Felix metric. It was corrected to `felix_calc_graph_update_time_seconds`, and `felix_label_index_num_active_selectors` was added as a relevant selector-scaling metric.

## Review Notes
The WorkloadEndpoint YAML is a label-focused example rather than a complete resource suitable for manual creation. Calico documentation generally recommends using `calicoctl` only to view WorkloadEndpoint resources because their lifecycle is usually managed by an orchestrator-specific plugin such as the OpenStack Neutron driver.
