# Validation Summary: How to Scale OpenStack Kuryr with Calico

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenStack Neutron
- Kuryr-Kubernetes
- Calico for OpenStack
- Calico Felix
- Calico IPPool and WorkloadEndpoint resources
- OpenStackClient CLI
- Bash

## Sources Consulted
- OpenStack Kuryr-Kubernetes design documentation: https://docs.openstack.org/kuryr-kubernetes/latest/devref/kuryr_kubernetes_design.html
- OpenStack Kuryr-Kubernetes Port Manager design: https://docs.openstack.org/kuryr-kubernetes/latest/devref/port_manager.html
- OpenStack Neutron configuration reference: https://docs.openstack.org/neutron/latest/configuration/neutron.html
- OpenStackClient compute service command reference: https://files.openstack.org/docs/python-openstackclient/latest/cli/command-objects/compute-service.html
- OpenStackClient port command reference: https://static.openstack.org/docs/python-openstackclient/pike/cli/command-objects/port.html
- Calico for OpenStack overview: https://docs.tigera.io/calico/latest/getting-started/openstack/overview
- Calico Kuryr documentation: https://docs.tigera.io/calico/latest/networking/openstack/kuryr
- Calico WorkloadEndpoint resource reference: https://docs.tigera.io/calico/latest/reference/resources/workloadendpoint
- Calico IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico FelixConfiguration resource reference: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico Felix Prometheus metrics reference: https://docs.tigera.io/calico/latest/reference/felix/prometheus

## Issues Found
- The `IPPool` examples used `encapsulation: VXLAN` under `apiVersion: projectcalico.org/v3`. That field is used in the Calico operator `Installation` API, while `IPPool` resources managed by `calicoctl` use `vxlanMode`. Updated both IPPool snippets to `vxlanMode: Always`.
- The Neutron tuning command implied that writing to `/etc/neutron/neutron.conf.d/kuryr-scale.conf` is always sufficient. OpenStack Neutron supports arbitrary config files, but the service must be started with those files via `--config-file`. Added a caveat that the options must be placed in `neutron.conf` or in a supplemental file loaded by the `neutron-server` service.

## Review Notes
The guide is technically relevant and the main Kuryr and Calico claims are consistent with official documentation: Kuryr maps pod networking into Neutron resources, Calico's OpenStack integration translates Neutron data into Calico workload state, Felix exposes Prometheus metrics on port 9091 when enabled, and Neutron's `api_workers`, `rpc_workers`, `max_pool_size`, and `max_overflow` options are valid. The exact Neutron device owner value for Kuryr ports and the availability of Felix metrics can vary by deployment and enabled configuration, so operators should confirm those locally.
