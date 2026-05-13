# Validation Summary: How to Configure Calico on OpenStack Ubuntu for a New Cluster

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico Open Source
- Calico for OpenStack
- OpenStack Neutron
- OpenStackClient
- Ubuntu
- Felix
- BGP
- etcd

## Sources Consulted
- Calico for OpenStack overview: https://docs.tigera.io/calico/latest/getting-started/openstack/overview
- Calico OpenStack Ubuntu installation: https://docs.tigera.io/calico/latest/getting-started/openstack/installation/ubuntu
- Calico OpenStack system configuration: https://docs.tigera.io/calico/latest/networking/openstack/configuration
- Calico OpenStack IP addressing and connectivity: https://docs.tigera.io/calico/latest/networking/openstack/connectivity
- Calico OpenStack deployment verification: https://docs.tigera.io/calico/latest/getting-started/openstack/installation/verification
- Calico IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico BGPConfiguration resource reference: https://docs.tigera.io/calico/latest/reference/resources/bgpconfig
- Calico BGPPeer resource reference: https://docs.tigera.io/calico/latest/reference/resources/bgppeer
- Calico Felix configuration reference: https://docs.tigera.io/calico/latest/reference/felix/configuration
- OpenStackClient subnet command reference: https://docs.openstack.org/python-openstackclient/latest/cli/command-objects/subnet.html
- OpenStackClient server command reference: https://docs.openstack.org/python-openstackclient/latest/cli/command-objects/server.html

## Issues Found
- The tenant address step used a Calico `IPPool` to define VM tenant addresses. Calico's OpenStack documentation models VM address allocation through Neutron networks and subnets, so the step was changed to create a shared Neutron network and IPv4 subnet with `openstack network create` and `openstack subnet create`.
- The Felix snippet used `EtcdEndpoints` and an invalid `RoutingRulesSourceFT = kube` setting. Updated it to the OpenStack-documented `EtcdAddr = <controller-ip>:2379`, removed the invalid setting, and added `EndpointStatusPathPrefix = none`.
- The Felix and Neutron region values did not match Calico's documented lower-case `openstack_region` constraints. Added `OpenStackRegion = regionone` to Felix and changed Neutron `openstack_region` from `RegionOne` to `regionone`.
- The Neutron `[calico]` etcd settings were shown under `/etc/neutron/plugins/ml2/ml2_conf.ini`, but Calico documents them under `/etc/neutron/neutron.conf`. Updated the file path and added the required `core_plugin = calico` and `service_plugins = qos` settings.
- The test step created a new tenant network and subnet even though the guide had already configured the shared Calico-backed network. Changed it to create a VM on the configured `internal` network.
- The conclusion still referred to "tenant IP pools" after removing the incorrect IPPool configuration. Updated it to refer to Neutron networks and subnets.

## Review Notes
- The post is technically relevant and contains implementation commands and configuration, so it was reviewed as a technical guide.
- The BGPConfiguration and BGPPeer examples use current Calico v3 resource kinds and fields. Operators should still adapt global versus node-scoped peer settings to their physical topology.
- The OpenStack and Calico OpenStack documentation includes version- and deployment-specific caveats. Existing clusters using Calico as an ML2 mechanism driver instead of the Calico core plugin may need corresponding ML2 settings in addition to, or instead of, the core-plugin configuration shown here.
