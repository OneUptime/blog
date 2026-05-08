# Validation Summary: How to Update the Calico CalicoNodeStatus Resource Safely

## Status
validated

## Post Type
Tutorial / operations guide

## Technologies Covered
- Calico Enterprise
- CalicoNodeStatus
- Kubernetes custom resources
- kubectl
- BGP networking

## Sources Consulted
- Calico Enterprise CalicoNodeStatus resource documentation: https://docs.tigera.io/calico-enterprise/latest/reference/resources/caliconodestatus
- Calico Open Source troubleshooting documentation referencing CalicoNodeStatus for BGP session status: https://docs.tigera.io/calico/latest/operations/troubleshoot/troubleshooting
- Calico resource definitions overview: https://docs.tigera.io/calico/latest/reference/resources/overview
- Calico calicoctl patch reference: https://docs.tigera.io/calico/latest/reference/calicoctl/patch
- Kubernetes kubectl patch reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/
- Kubernetes kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes kubectl top reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- Tigera Calico v3.21 announcement mentioning the CalicoNodeStatus API: https://www.tigera.io/blog/whats-new-in-calico-v3-21/

## Issues Found
- The prerequisite version said Calico v3.20 or later. The CalicoNodeStatus API was introduced with Calico v3.21, and the resource documentation currently scopes it to Calico Enterprise BGP networking on Linux nodes. Updated the prerequisite accordingly.
- The post used `calicoctl get`, `calicoctl apply`, `calicoctl delete`, and `calicoctl patch` for CalicoNodeStatus. Official CalicoNodeStatus examples use `kubectl`, and current `calicoctl patch` documentation does not list CalicoNodeStatus as a valid patch resource. Replaced CalicoNodeStatus resource operations with `kubectl`.
- The patch examples omitted `--type='merge'`. Kubernetes documents that strategic merge patch is not supported for custom resources, so the patch commands now explicitly use JSON merge patch.
- The post described CalicoNodeStatus as a read-only status object and real-time telemetry. The resource has a mutable `spec` that controls collection behavior and is updated periodically according to `updatePeriodSeconds`. Updated the wording to avoid implying real-time behavior or a read-only resource.
- The batch update section implied broad production use. Official CalicoNodeStatus documentation recommends using it for a small number of nodes and debugging purposes because frequent updates add node and API server load. Clarified that batch updates should be limited to a small troubleshooting set.

## Review Notes
The YAML examples use valid `apiVersion`, `kind`, `spec.node`, `spec.classes`, and `spec.updatePeriodSeconds` fields. The class values `Agent`, `BGP`, and `Routes`, the `status.lastUpdated` field, and the `updatePeriodSeconds` range and load cautions are consistent with the official resource documentation.
