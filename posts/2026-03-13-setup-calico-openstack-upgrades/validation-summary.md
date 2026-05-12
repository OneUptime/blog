# Validation Summary: How to  Calico on OpenStack Upgrades - Setup

## Status
validated

## Post Type
Tutorial / Operational guide

## Technologies Covered
- Calico (Project Calico / Tigera operator)
- networking-calico (Neutron ML2 plugin)
- OpenStack (Neutron)
- Kubernetes (kubectl, operator-managed Installation CR)
- Felix (calico-felix compute-node agent)
- Ansible (ad-hoc `package` and `service` modules)

## Sources Consulted
- Calico operator-based upgrade docs: https://docs.tigera.io/calico/latest/operations/upgrading/kubernetes-upgrade
- Calico Installation CR API reference: https://docs.tigera.io/calico/latest/reference/installation/api
- Calico for OpenStack docs: https://docs.tigera.io/calico/latest/getting-started/openstack/
- networking-calico project: https://opendev.org/openstack/networking-calico
- Neutron `neutron-db-manage` CLI reference (OpenStack docs)
- Ansible `package` and `service` module docs (docs.ansible.com)

## Issues Found
- **Step 3 used a non-existent field on the Calico Installation CR.** The original command was `kubectl patch installation default --type=merge -p '{"spec":{"version":"v3.28.0"}}'`. The `operator.tigera.io/v1` Installation CRD has no `spec.version` field — Calico version is determined by the running operator, and the documented upgrade path is to apply the new operator manifest (and the CRDs) for the target release. Replaced the patch command with the official `kubectl apply --server-side --force-conflicts` of `operator-crds.yaml` followed by `tigera-operator.yaml` from the `v3.28.0` tag of the `projectcalico/calico` repo.

## Review Notes
- The post's overall architectural description (felix agent on each compute node, networking-calico as the Neutron ML2 driver, separation between the K8s-facing operator-managed components and the OpenStack-side agents) matches the upstream Calico-for-OpenStack design.
- The `neutron-db-manage ... current` command is a read-only check of the current Alembic migration head and is safe to run as shown.
- `openstack network agent list | grep calico` is a valid way to enumerate Calico-registered Neutron agents.
- The Ansible ad-hoc commands (`-m package`, `-m service`) are syntactically correct; in real deployments operators may want to pin the package version explicitly (e.g. `name=calico-felix-3.28.0`) rather than using `state=latest`, to stay aligned with the K8s-side Calico version — worth considering but not technically wrong as written.
- Calico v3.28.0 is a real upstream release (May 2024); the manifest URL in the corrected command resolves to that tag.
- The post title contains a double space and reads awkwardly ("How to  Calico on OpenStack Upgrades - Setup"), but per review scope only technical errors were corrected; the title was left untouched.
