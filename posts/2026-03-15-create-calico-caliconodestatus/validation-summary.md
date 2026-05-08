# Validation Summary: How to Create the Calico CalicoNodeStatus Resource

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Calico Enterprise
- CalicoNodeStatus
- Kubernetes
- kubectl
- BGP networking

## Sources Consulted
- Calico Enterprise CalicoNodeStatus resource documentation: https://docs.tigera.io/calico-enterprise/latest/reference/resources/caliconodestatus
- Calico Open Source calicoctl get documentation: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico Open Source calicoctl apply documentation: https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- Calico v3.21 announcement mentioning the CalicoNodeStatus API: https://www.tigera.io/blog/whats-new-in-calico-v3-21/

## Issues Found
- The prerequisite version said Calico v3.20 or later. The CalicoNodeStatus API was introduced with Calico v3.21, so the prerequisite was updated to Calico v3.21 or later.
- The post described generic Calico BGP use, but the current resource documentation scopes CalicoNodeStatus to Calico Enterprise BGP networking on Linux nodes. Updated the prerequisite accordingly.
- The post used `calicoctl` for CalicoNodeStatus create, read, list, and delete commands. Official CalicoNodeStatus examples use `kubectl`, and the current `calicoctl get` resource list does not include CalicoNodeStatus. Replaced those commands with `kubectl`.
- The post recommended generating CalicoNodeStatus resources for all nodes. Official documentation recommends using the resource for a small number of nodes, with fewer than 10 recommended, and deleting it after debugging. Updated the example to selected nodes and adjusted the conclusion.
- The introduction said CalicoNodeStatus reports interface status. The documented status classes cover BGP daemon agent status, BGP session status, and routes; route entries may include an interface field, but interface status is not a top-level status class. Updated the wording.
- The post described the data as real-time and framed the resource for ongoing production monitoring. The documented behavior is periodic refresh controlled by `updatePeriodSeconds`, with a troubleshooting/debugging focus. Updated the wording to match.

## Review Notes
The YAML examples use valid `apiVersion`, `kind`, `spec.node`, `spec.classes`, and `spec.updatePeriodSeconds` fields. The class values `Agent`, `BGP`, and `Routes`, the `status.lastUpdated` field, and the BGP and route status fields referenced in the post match the official resource documentation.
