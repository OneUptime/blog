# Validation Summary: How to Automate Calico on OpenStack Upgrades

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico
- Tigera Operator
- OpenStack Neutron
- Neutron ML2 Calico driver
- Kubernetes
- Ansible

## Sources Consulted
- Calico OpenStack upgrade documentation: https://docs.tigera.io/calico/latest/operations/upgrading/openstack-upgrade
- Calico for OpenStack overview: https://docs.tigera.io/calico/latest/getting-started/openstack/overview
- Calico OpenStack configuration documentation: https://docs.tigera.io/calico/latest/networking/openstack/configuration
- Calico Kubernetes upgrade documentation: https://docs.tigera.io/calico/latest/operations/upgrading/kubernetes-upgrade
- Tigera Operator Installation API reference: https://docs.tigera.io/calico/latest/reference/installation/api
- Ansible kubernetes.core.k8s module documentation: https://docs.ansible.com/projects/ansible/latest/collections/kubernetes/core/k8s_module.html
- OpenStack Neutron database migration documentation: https://docs.openstack.org/neutron/latest/contributor/alembic_migrations.html

## Issues Found
- The Ansible example attempted to upgrade Kubernetes Calico by patching `spec.version` on the Tigera Operator `Installation` resource. The official Installation API does not define `spec.version`; Calico operator upgrades are initiated by applying the target release CRDs and Tigera Operator manifest. Updated the task to apply `v1_crd_projectcalico_org.yaml` and `tigera-operator.yaml` for the target Calico release using server-side apply.
- The OpenStack package task upgraded only `calico-felix` on compute nodes. Tigera's OpenStack upgrade documentation lists additional Calico packages needed on compute nodes and separate packages for Neutron control nodes. Updated the playbook to upgrade the documented compute package set, verify the Felix version, upgrade the control-node Calico packages, and restart `neutron-server`.
- The task label "Check Neutron ML2 compatibility" overstated what `neutron-db-manage current` does. OpenStack documentation describes it as checking the current Neutron database revision. Updated the task name accordingly.

## Review Notes
- The playbook assumes package repositories have already been pointed at the intended Calico release before `state: latest` runs, which matches the documented OpenStack upgrade prerequisite but is not shown in the post.
- The Kubernetes operator task is relevant only when the OpenStack environment also has a Kubernetes or OpenShift Calico deployment to upgrade. Pure OpenStack Calico deployments should follow only the OpenStack package upgrade flow.
