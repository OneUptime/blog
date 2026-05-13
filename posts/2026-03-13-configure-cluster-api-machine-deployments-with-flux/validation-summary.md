# Validation Summary: How to Configure Cluster API Machine Deployments with Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD Kustomization
- Cluster API
- Cluster API MachineDeployment
- Cluster API Provider AWS
- Kubeadm bootstrap provider
- Kubernetes kubectl
- GitOps workflows

## Sources Consulted
- Cluster API version support: https://cluster-api.sigs.k8s.io/reference/versions
- Cluster API v1beta2 Go API reference: https://pkg.go.dev/sigs.k8s.io/cluster-api/api/core/v1beta2
- Cluster API MachineDeployment controller documentation: https://cluster-api.sigs.k8s.io/developer/core/controllers/machine-deployment
- Cluster API machine template update documentation: https://release-1-0.cluster-api.sigs.k8s.io/tasks/updating-machine-templates
- Cluster API kubeadm bootstrap kubelet configuration documentation: https://main.cluster-api.sigs.k8s.io/tasks/bootstrap/kubeadm-bootstrap/kubelet-config.html
- Cluster API Provider AWS CRD reference: https://cluster-api-aws.sigs.k8s.io/crd/index.html
- Flux Kustomization API reference: https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux Kustomization health check documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/

## Issues Found
- The MachineDeployment examples used `cluster.x-k8s.io/v1beta1`, which is deprecated in current Cluster API releases. Updated the examples and Flux health check references to `cluster.x-k8s.io/v1beta2`.
- The MachineDeployment rolling update configuration used `spec.strategy`, which is the v1beta1 shape. Updated it to `spec.rollout.strategy` for CAPI v1beta2.
- The v1beta2 MachineDeployment bootstrap and infrastructure references used `apiVersion`. Updated them to `apiGroup`, which is the current `ContractVersionedObjectReference` field in CAPI v1beta2.
- The KubeadmConfigTemplate example used the deprecated v1beta1 API and map-style `kubeletExtraArgs`. Updated it to `bootstrap.cluster.x-k8s.io/v1beta2` and the v1beta2 list form with `name` and `value`.
- The kubelet cloud provider flag was set to `aws`. Updated it to `external`, which is the correct value for Kubernetes clusters using an external cloud controller manager.
- The Flux health check guidance implied a generic ready condition. Added a CEL health check expression for the CAPI v1beta2 MachineDeployment `Available` condition and adjusted the best-practice wording.

## Review Notes
- The AWSMachineTemplate fields in the example are valid for Cluster API Provider AWS v1beta2.
- The post keeps Kubernetes `v1.29.2` as an example workload-cluster version; that version is now old, but the example is still syntactically valid.
- `prune: false` is valid Flux configuration, though production GitOps repositories often use `prune: true` when resource deletion should also be managed declaratively.
