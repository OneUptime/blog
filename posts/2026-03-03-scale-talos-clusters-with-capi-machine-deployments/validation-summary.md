# Validation Summary: How to Scale Talos Clusters with CAPI Machine Deployments

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Cluster API (CAPI) — MachineDeployment, MachineSet, Machine resources
- Cluster API Provider for Talos (CAPT) — TalosControlPlane, TalosConfigTemplate
- Cluster API Provider AWS (CAPA) — AWSMachineTemplate
- Talos Linux
- Kubernetes Cluster Autoscaler (clusterapi cloud provider)
- kubectl, clusterctl

## Sources Consulted
- [The Cluster API Book — Labels and Annotations](https://cluster-api.sigs.k8s.io/reference/api/labels-and-annotations)
- [The Cluster API Book — Scaling](https://cluster-api.sigs.k8s.io/tasks/automated-machine-management/scaling)
- [The Cluster API Book — Autoscaling](https://cluster-api.sigs.k8s.io/tasks/automated-machine-management/autoscaling)
- [The Cluster API Book — MachineDeployment controller](https://cluster-api.sigs.k8s.io/developer/core/controllers/machine-deployment)
- [Cluster Autoscaler — clusterapi cloud provider README](https://github.com/kubernetes/autoscaler/blob/master/cluster-autoscaler/cloudprovider/clusterapi/README.md)
- [Sidero Labs — cluster-api-bootstrap-provider-talos](https://github.com/siderolabs/cluster-api-bootstrap-provider-talos)
- [Sidero Labs — cluster-api-control-plane-provider-talos](https://github.com/siderolabs/cluster-api-control-plane-provider-talos)
- [Cluster API Provider AWS — v1beta2 API reference](https://pkg.go.dev/sigs.k8s.io/cluster-api-provider-aws/v2/api/v1beta2)
- [kubernetes/autoscaler releases](https://github.com/kubernetes/autoscaler/releases)

## Issues Found
1. **`cluster.x-k8s.io/delete-machine` is a label, not an annotation.** The post originally instructed readers to set it with `kubectl annotate machine ... cluster.x-k8s.io/delete-machine=yes`. According to the official CAPI Scaling docs and the Labels and Annotations reference, this is a **label** that influences MachineSet/KCP scale-down priority. I changed the command to `kubectl label machine ... cluster.x-k8s.io/delete-machine=yes` and updated the surrounding prose ("annotated machine" → "labeled machine") to match.

## Review Notes
- The post mixes API versions across providers: `cluster.x-k8s.io/v1beta1` for MachineDeployment, `bootstrap.cluster.x-k8s.io/v1alpha3` for TalosConfigTemplate, and `infrastructure.cluster.x-k8s.io/v1beta2` for AWSMachineTemplate. Each is correct for its respective provider at the time of writing — CAPT's bootstrap CRD is still on v1alpha3, CAPA has moved to v1beta2, and core CAPI v1beta1 remains supported alongside v1beta2.
- Worth noting for a future update: in core CAPI v1beta2, `nodeDrainTimeout` has moved from `spec.template.spec.nodeDrainTimeout` to `spec.template.spec.deletion.nodeDrainTimeout`. The v1beta1 path used in this post is still valid.
- The CAPI Scaling docs caveat that the `delete-machine` label only affects MachineSet-level scale-down; in a MachineDeployment, the choice of which MachineSet to scale down may bypass labeled Machines. The post's flow (label + scale down on the same MachineDeployment) works in practice but readers should be aware of this nuance during rollouts.
- The `kubectl scale` and `kubectl patch` workflows, the autoscaler annotations (`cluster.x-k8s.io/cluster-api-autoscaler-node-group-min-size`/`-max-size`), the `--node-group-auto-discovery=clusterapi:namespace=...,clusterName=...` flag format, the `registry.k8s.io/autoscaling/cluster-autoscaler:v1.30.0` image, and the `cluster.x-k8s.io/deployment-name` and `cluster.x-k8s.io/cluster-name` selectors used in the monitoring commands are all consistent with the official documentation.
- The "must be odd numbers" guidance for control plane replicas is a best practice for etcd quorum, not a hard constraint enforced by the controller — but the wording in the post is fine as written.
