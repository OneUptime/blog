# Validation Summary: How to Use Cluster API with Flux CD

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Cluster API
- Cluster API Provider AWS
- Cluster API Operator
- Flux CD
- Kubernetes
- Helm
- AWS IAM and EC2 infrastructure

## Sources Consulted
- Cluster API Quick Start: https://cluster-api.sigs.k8s.io/user/quick-start
- Cluster API version support: https://cluster-api.sigs.k8s.io/reference/versions.html
- Cluster API v1beta2 API reference: https://cluster-api.sigs.k8s.io/reference/api/crd-api-reference
- Cluster API ClusterResourceSet documentation: https://main.cluster-api.sigs.k8s.io/tasks/cluster-resource-set
- Cluster API Operator documentation: https://cluster-api-operator.sigs.k8s.io/
- Cluster API Operator Helm installation: https://cluster-api-operator.sigs.k8s.io/installation/helm-chart-installation
- Cluster API Operator provider installation and spec documentation: https://cluster-api-operator.sigs.k8s.io/topics/basic-cluster-api-provider-installation/installing-core-provider and https://cluster-api-operator.sigs.k8s.io/topics/configuration/provider-spec-configuration
- Cluster API Provider AWS documentation and CRD reference: https://cluster-api-aws.sigs.k8s.io/ and https://cluster-api-aws.sigs.k8s.io/crd/
- Flux HelmRelease guide: https://fluxcd.io/flux/guides/helmreleases/

## Issues Found
- The AWS setup command sequence omitted `clusterawsadm bootstrap iam create-cloudformation-stack`, which the CAPA quick start requires to create IAM resources before initializing the AWS provider. Added the command.
- The Flux installation examples referenced CAPI and CAPA Helm chart repositories and chart names that are not the current documented GitOps installation path. Replaced them with the official Cluster API Operator Helm chart and provider custom resources.
- The CAPI and CAPA versions in the examples were outdated. Replaced CAPI `1.9.x` and CAPA `2.7.x` with supported example versions `v1.13.0` and `v2.11.1`.
- The workload cluster manifests used deprecated Cluster API `v1beta1` APIs. Updated Cluster, KubeadmControlPlane, MachineDeployment, KubeadmConfigTemplate, and ClusterResourceSet examples to `v1beta2` where applicable.
- The `v1beta2` object references were using old `apiVersion` fields. Updated references to use `apiGroup`, `kind`, and `name` as required by current CAPI `ContractVersionedObjectReference` fields.
- The kubeadm `extraArgs` and `kubeletExtraArgs` examples used map syntax that is no longer correct for current `v1beta2` kubeadm APIs. Converted them to `name`/`value` lists.
- The MachineDeployment selector was empty and did not define matching template labels. Added explicit labels to make the selector and machine template consistent.
- The ClusterResourceSet selected clusters with `gitops: flux`, but the example Cluster did not have that label. Added the label to the Cluster manifest.

## Review Notes
The auto-bootstrapping Flux example remains intentionally abbreviated and only creates the `flux-system` namespace; production use still needs the full Flux install and GitRepository/Kustomization manifests or another add-on mechanism. The examples use placeholder subnet IDs and credentials that must be replaced with real environment-specific values.
