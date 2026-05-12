# Validation Summary: How to Set Up Calico on OpenShift Upgrades Step by Step

## Status
validated

## Post Type
Tutorial / Step-by-step operations guide

## Technologies Covered
- Calico (Tigera operator, open source)
- Red Hat OpenShift Container Platform (OCP) 4.x
- Kubernetes
- `oc` and `kubectl` CLI tooling
- OpenShift Security Context Constraints (SCCs)
- OpenShift MachineConfigPools (MCPs)
- OpenShift Cluster Operators
- Mermaid (diagram syntax)

## Sources Consulted
- Tigera Calico OpenShift upgrade documentation: https://docs.tigera.io/calico/latest/operations/upgrading/openshift-upgrade
- Tigera Calico Installation API reference: https://docs.tigera.io/calico/latest/reference/installation/api
- Tigera Calico Enterprise OpenShift requirements: https://docs.tigera.io/calico-enterprise/latest/getting-started/openshift/requirements
- OpenShift CLI (`oc`) documentation for SCC, MachineConfigPool, ClusterOperator, and network operator resources

## Issues Found

- **Incorrect Calico upgrade command.** The original "Step 3" used:
  ```
  kubectl patch installation default --type=merge \
    -p '{"spec":{"version":"'"${CALICO_VERSION}"'"}}'
  ```
  This is invalid: the Tigera `operator.tigera.io/v1` `Installation` CRD does not expose a `spec.version` field. Calico's version on OpenShift is controlled by the operator deployment image, which is upgraded by applying the manifests for the target release. The official upgrade flow is to `oc apply --server-side --force-conflicts` the new `manifests/ocp/crds/` and `manifests/ocp/tigera-operator/` directories from the `projectcalico/calico` repository at the desired tag. I replaced the `kubectl patch` line with that documented procedure and switched the monitoring line to `watch oc get tigerastatus`, which is the supported way to follow the rollout (and avoids implying that Calico components register as OpenShift `ClusterOperator` objects when installed via the manifest-based operator install).

## Review Notes
- The `kubectl get installation default -o jsonpath='{.status.calicoVersion}'` command is correct — `status.calicoVersion` is a real status field populated by the Tigera operator.
- The SCC name `calico-node` referenced in the post is plausible: the Tigera operator does create custom SCCs on OpenShift, but exact names can shift between Calico releases (e.g., `calico-node` vs `tigera-operator`). Readers should run `oc get scc | grep -i calico` first (the post already shows this) and substitute the actual name returned.
- The post mixes `oc` and `kubectl` invocations against the same cluster. Both work for non-OpenShift-specific resources, but on a pure OpenShift environment readers may find it cleaner to standardize on `oc`.
- The `oc get co | grep -v "True.*False.*False"` idiom is a common but fragile filter — it assumes the default column order of `AVAILABLE PROGRESSING DEGRADED`. It is fine for an ad-hoc post-upgrade smoke check, but is not robust for scripting.
- Calico v3.28.0 is referenced as the example target version; readers upgrading in the future should consult the Tigera support matrix to confirm OCP compatibility for the Calico version they choose.
