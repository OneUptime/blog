# Validation Summary: How to Install Calico on OpenStack Red Hat Step by Step

## Status
validated

## Post Type
Tutorial / installation guide

## Technologies Covered
- Calico Open Source for OpenStack
- OpenStack Neutron
- Red Hat Enterprise Linux
- etcd
- Felix
- BIRD / BGP
- firewalld
- calicoctl

## Sources Consulted
- Calico OpenStack overview: https://docs.tigera.io/calico/latest/getting-started/openstack/overview
- Calico OpenStack RHEL installation documentation: https://docs.tigera.io/calico/latest/getting-started/openstack/installation/redhat
- Calico OpenStack configuration documentation: https://docs.tigera.io/calico/latest/networking/openstack/configuration
- Calico OpenStack deployment verification documentation: https://docs.tigera.io/calico/latest/getting-started/openstack/installation/verification
- Calico Felix configuration reference: https://docs.tigera.io/calico/latest/reference/felix/configuration
- Calico calicoctl get reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- OpenStack networking-calico documentation: https://docs.openstack.org/networking-calico/1.3.1/

## Issues Found
- The introduction described the RHEL install as primarily an SELinux-specific variant and omitted BIRD and the Calico DHCP agent from the OpenStack architecture. Updated it to match the documented OpenStack components and added the official caveat that the RHEL OpenStack path is no longer actively tested.
- The prerequisites were too specific about RHEL 8/9 and did not mention DNS/host resolution or etcd reachability from all nodes. Updated these prerequisites to match the Calico RHEL installation guidance.
- The SELinux step used broad booleans (`nis_enabled` and `httpd_can_network_connect`) that are not part of the official Calico OpenStack RHEL installation. Replaced that step with the documented RHEL package prerequisites: EPEL, the Calico RPM repository, `python3-pip`, `crudini`, and `etcd3gw==2.4.0`.
- The etcd step installed a local controller etcd while the guide already required an etcd cluster. Replaced it with the documented Neutron `[calico] etcd_host` configuration.
- The controller package `python3-networking-calico` did not match the documented Calico RPM package. Replaced it with `calico-control`, and added the documented `service_plugins = qos` Neutron setting.
- The Neutron restart command used a non-standard `openstack-neutron` service name. Updated it to restart `neutron-server`, which matches the Calico RHEL documentation's Neutron server process.
- The compute-node package list installed only `calico-felix`. Updated it to install the documented OpenStack compute-side packages: `openstack-neutron`, `calico-dhcp-agent`, `bird`, `bird6`, and `calico-compute`.
- The Felix configuration used `EtcdEndpoints` but omitted the OpenStack-specific `EndpointStatusPathPrefix = none` setting shown in the official OpenStack install docs. Updated the snippet to use `EtcdAddr = <etcd-ip>:2379` and include `EndpointStatusPathPrefix = none`.
- The compute-node step omitted disabling conflicting Neutron/Open vSwitch services. Added stop/disable commands for the DHCP, L3, Open vSwitch agent, and Open vSwitch services.
- The verification commands relied on `calicoctl node status`, which is not the documented OpenStack verification path. Replaced it with service checks for Felix and BIRD plus `ip route`, while keeping `calicoctl get workloadendpoints -A`, which is valid for WorkloadEndpoint resources.
- The conclusion still claimed SELinux configuration was the key RHEL-specific requirement. Updated it to summarize the corrected RPM, Neutron, Felix, BIRD, and BGP requirements.

## Review Notes
The corrected post is still a condensed guide, not a full replacement for the official Calico OpenStack RHEL installation page. Operators should review the full upstream instructions for Nova metadata settings, Calico DHCP agent behavior, route reflector or BGP mesh setup, and environment-specific firewall/security policy before deploying.
