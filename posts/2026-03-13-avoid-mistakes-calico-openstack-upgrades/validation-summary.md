# Validation Summary: How to  Calico on OpenStack Upgrades - Avoid

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico (Tigera operator-managed)
- networking-calico (Neutron ML2 driver)
- OpenStack (Neutron)
- Kubernetes
- Felix (calico-felix agent)
- kubectl

## Sources Consulted
- Calico OpenStack getting-started documentation: https://docs.tigera.io/calico/latest/getting-started/openstack/
- Calico operator upgrade documentation: https://docs.tigera.io/calico/latest/operations/upgrading/kubernetes-upgrade
- Tigera operator Installation CR reference: https://docs.tigera.io/calico/latest/reference/installation/api
- Calico Felix component overview: https://docs.tigera.io/calico/latest/reference/component-resources/node/felix/configuration
- networking-calico OpenStack project documentation: https://docs.openstack.org/networking-calico/latest/

## Issues Found
- The "WRONG" example used `kubectl patch installation default --type=merge -p '{"spec":{"version":"v3.28.0"}}'` to represent upgrading operator-managed Calico. The Tigera operator's `Installation` CRD does not expose a `spec.version` field — the documented upgrade flow is to apply the new `tigera-operator.yaml` manifest for the target release. Replaced the `kubectl patch` line with `kubectl apply -f https://raw.githubusercontent.com/projectcalico/calico/v3.28.0/manifests/tigera-operator.yaml` so the example reflects the actual upgrade mechanism.
- The compatibility-check reference pointed at `https://docs.openstack.org/networking-calico/latest/`. The authoritative, currently maintained OpenStack integration documentation lives on the Calico documentation site, so the URL was updated to `https://docs.tigera.io/calico/latest/getting-started/openstack/`, and the surrounding wording now says "networking-calico (Neutron ML2) plugin" to match the project name used in the docs.

## Review Notes
- The title in the README ("How to  Calico on OpenStack Upgrades - Avoid", with a double space and dangling phrasing) is grammatically awkward, but the task scope is technical correctness only, so it was left as-is.
- The post correctly identifies that operator-managed Calico in Kubernetes and the networking-calico Felix agents on OpenStack compute nodes must be upgraded in lockstep — Felix uses a shared datastore and protocol contract between the two planes, so version skew can break dataplane programming.
- Calico v3.28.0 is referenced as an example version; consumers should still consult the compatibility matrix for the specific Calico and networking-calico releases they are running.
