# Validation Summary: How to Install Calico on OpenStack Ubuntu Step by Step

## Status
validated

## Post Type
Tutorial / installation guide

## Technologies Covered
- Calico Open Source for OpenStack
- OpenStack Neutron
- Ubuntu package installation
- etcd
- Felix
- BIRD and BGP
- OpenStack CLI

## Sources Consulted
- Calico Open Source 3.32 documentation, Ubuntu OpenStack installation: https://docs.tigera.io/calico/latest/getting-started/openstack/installation/ubuntu
- Calico Open Source 3.32 documentation, OpenStack system requirements: https://docs.tigera.io/calico/latest/getting-started/openstack/requirements
- Calico Open Source 3.32 documentation, OpenStack component configuration: https://docs.tigera.io/calico/latest/networking/openstack/configuration
- Calico Open Source 3.32 documentation, OpenStack verification: https://docs.tigera.io/calico/latest/getting-started/openstack/installation/verification
- OpenStack python-neutronclient documentation, CLI deprecation and OpenStackClient transition: https://docs.openstack.org/python-neutronclient/latest/

## Issues Found
- The post described Calico as an ML2 mechanism driver and configured `/etc/neutron/plugins/ml2/ml2_conf.ini`. Calico's OpenStack install uses `core_plugin = calico` in `/etc/neutron/neutron.conf`, so the ML2 configuration was removed and the Neutron Calico settings were moved to `neutron.conf`.
- The controller package name was incorrect. Replaced `python3-networking-calico` with the documented `calico-control` package.
- The post skipped the Calico PPA, BIRD PPA, and `etcd3gw` setup required by the documented Ubuntu install path. Added those package preparation steps.
- The post implied the guide should install a local etcd service with a minimal `/etc/etcd/etcd.conf`. Calico's documentation requires an etcdv3 datastore accessible by all components and points production deployments to upstream etcd guidance, so the post now treats etcd as a prerequisite endpoint.
- The prerequisites named OpenStack Yoga or later. Current Calico documentation requires a Python 3 OpenStack release and recommends Caracal or later, so the prerequisite was corrected.
- The compute-node instructions installed `calico-felix` directly and used `EtcdEndpoints` in `felix.cfg`. The documented OpenStack Ubuntu flow installs `calico-compute` and uses `EtcdAddr` plus `EndpointStatusPathPrefix = none`, so the snippet was corrected.
- The post used `calicoctl node run` for BGP setup, which is not the documented OpenStack package install flow. Replaced it with `calico-gen-bird-conf.sh` and BIRD restart instructions.
- The verification commands used the deprecated `neutron` CLI and Kubernetes-oriented Calico workload endpoint checks. Replaced them with `openstack network list`, route table inspection, and BIRD protocol status checks.

## Review Notes
This guide remains a concise install outline. A future expansion could add production etcd TLS/authentication, route reflector configuration details, cleanup of existing Neutron state before migration, and exact service names for a specific OpenStack deployment method.
