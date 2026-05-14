# Validation Summary: How to  Calico on OpenStack Upgrades - Avoid

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico
- OpenStack
- Kubernetes
- Neutron
- networking-calico
- etcd
- calico-felix
- kubectl

## Sources Consulted
- Calico Open Source documentation: Upgrade Calico on Kubernetes: https://docs.tigera.io/calico/latest/operations/upgrading/kubernetes-upgrade
- Calico Open Source documentation: Upgrade Calico on OpenStack: https://docs.tigera.io/calico/latest/operations/upgrading/openstack-upgrade
- Calico Open Source documentation: Calico for OpenStack overview: https://docs.tigera.io/calico/latest/getting-started/openstack/overview
- Calico Open Source documentation: Configure systems for use with Calico: https://docs.tigera.io/calico/latest/networking/openstack/configuration
- Calico Open Source documentation: Installation API reference: https://docs.tigera.io/calico/latest/reference/installation/api
- OpenStack networking-calico documentation: https://static.opendev.org/docs/networking-calico/latest/

## Issues Found
- The post described the OpenStack integration only as a Neutron ML2 plugin. Calico documentation says OpenStack Calico uses networking-calico and can operate either as the Neutron core plugin or an ML2 mechanism driver, with the core plugin recommended for floating IP support. Updated the prerequisite and related compatibility wording.
- The Kubernetes upgrade command used an inaccurate operator upgrade pattern. Current Calico documentation upgrades operator-managed installs by applying the target CRDs and Tigera Operator manifest, not by setting an `Installation.spec.version` field. Updated the example commands to the documented `kubectl apply --server-side --force-conflicts` flow.
- The post referred to a Neutron ML2 compatibility matrix. The official Calico guidance is the Calico OpenStack upgrade documentation and OpenStack configuration documentation, not a specific ML2 matrix. Updated the referenced URLs and wording.
- The post implied only compute-node Felix needed attention. The official OpenStack upgrade procedure updates compute-node packages including `calico-felix` and `networking-calico`, and control-node packages including `calico-control`, `calico-common`, and `networking-calico`. Updated the wording to cover OpenStack Calico packages on compute and control nodes.

## Review Notes
The post is technically relevant and includes command examples. The title remains grammatically awkward, but that is editorial rather than technical and was not changed.
