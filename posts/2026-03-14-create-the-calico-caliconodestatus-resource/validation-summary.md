# Validation Summary: Creating the Calico CalicoNodeStatus Resource in Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Calico Open Source
- CalicoNodeStatus custom resource
- kubectl
- calicoctl
- BGP networking

## Sources Consulted
- Calico Open Source Calico node status resource documentation: https://docs.tigera.io/calico/latest/reference/resources/caliconodestatus
- Calico Open Source resource definitions overview: https://docs.tigera.io/calico/latest/reference/resources/overview
- Calico calicoctl apply reference: https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- Calico calicoctl get reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico calicoctl validate reference: https://docs.tigera.io/calico/latest/reference/calicoctl/validate
- Calico calicoctl ipam check reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/check
- Calico calicoctl node status reference: https://docs.tigera.io/calico/latest/reference/calicoctl/node/status
- Kubernetes kubectl apply reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/
- Kubernetes kubectl describe reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_describe/
- Kubernetes kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes labels and selectors documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/

## Issues Found
- The post described CalicoNodeStatus as a foundational Calico configuration building block. Official Calico documentation describes it as a node status collection resource for troubleshooting, with a caution to create it only for targeted debugging and delete it afterward. Updated the introduction, prerequisites, troubleshooting, and conclusion to reflect this.
- The prerequisites did not mention that CalicoNodeStatus status collection is valid for Linux nodes with Calico BGP networking. Added those requirements.
- The `updatePeriodSeconds` field was described as having a 10 second minimum. Official documentation accepts `0` through `86400`, with `0` disabling refresh. Updated the field description and validation guidance.
- The post recommended `calicoctl apply` and `calicoctl get caliconodestatus`. Current official `calicoctl` resource-management documentation does not list CalicoNodeStatus as a valid managed resource type, while the CalicoNodeStatus documentation uses `kubectl`. Replaced those examples with `kubectl apply --dry-run=server`, `kubectl describe`, and `kubectl get`.
- The verification example described a specific resource but omitted the resource name. Added `worker-node-1` to the `kubectl describe` and `kubectl get` commands.
- The troubleshooting guidance suggested restarting calico-node pods when the resource is not picked up. Replaced that with checks for a Linux Calico node using BGP networking and calico-node logs.
- The labels section implied node labels control which nodes a CalicoNodeStatus resource affects. CalicoNodeStatus targets one node through `spec.node`, so the text now says labels are useful for organizing and finding target nodes, not for resource selection.
- The manifest commentary called the values defaults. They are example values, so that wording was corrected.

## Review Notes
- The remaining `calicoctl ipam check` and `calicoctl node status` commands in the recovery checklist are documented commands, but they are broader Calico troubleshooting checks rather than steps specifically required to create a CalicoNodeStatus resource.
- The log namespace and label examples assume an operator-style Calico installation using `calico-system` and `k8s-app=calico-node`; installations using different manifests may need namespace or label adjustments.
