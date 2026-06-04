# Validation Summary: How to Use Cluster API to Manage the Lifecycle of Multiple Kubernetes Clusters

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Cluster API
- Cluster API Provider AWS
- clusterctl
- clusterawsadm
- kubeadm bootstrap and control plane resources
- ClusterClass
- Flux GitOps
- Calico CNI
- AWS cloud controller manager
- AWS EBS CSI driver
- Prometheus Operator

## Sources Consulted
- Cluster API Book: clusterctl init - https://cluster-api.sigs.k8s.io/clusterctl/commands/init.html
- Cluster API Book: clusterctl generate cluster - https://cluster-api.sigs.k8s.io/clusterctl/commands/generate-cluster.html
- Cluster API Book: version support and API versions - https://cluster-api.sigs.k8s.io/reference/versions.html
- Cluster API Book: writing a ClusterClass - https://cluster-api.sigs.k8s.io/tasks/experimental-features/cluster-class/write-clusterclass
- Cluster API Provider AWS quick start - https://cluster-api-aws.sigs.k8s.io/quick-start
- Cluster API Provider AWS CRD reference - https://cluster-api-aws.sigs.k8s.io/crd/
- Cluster API Provider AWS external cloud provider and EBS CSI guidance - https://cluster-api-aws.sigs.k8s.io/topics/external-cloud-provider-with-ebs-csi-driver
- clusterawsadm credentials reference - https://cluster-api-aws.sigs.k8s.io/clusterawsadm/clusterawsadm_bootstrap_credentials
- Kubernetes AWS Cloud Provider documentation - https://kubernetes.github.io/cloud-provider-aws/
- Kubernetes kubeadm component customization documentation - https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/control-plane-flags/
- Kubernetes kube-state-metrics overview - https://kubernetes.io/docs/concepts/cluster-administration/kube-state-metrics/
- Prometheus Operator API reference - https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
- The post downloaded `clusterctl` v1.6.0, which is EOL. Updated the command to install Cluster API v1.13.2.
- The AWS setup used `clusterawsadm` without installing it and skipped the IAM CloudFormation bootstrap step. Added `clusterawsadm` installation and `clusterawsadm bootstrap iam create-cloudformation-stack`.
- The examples used deprecated Cluster API `v1beta1` API versions. Updated Cluster API, KubeadmControlPlane, KubeadmConfigTemplate, and ClusterClass examples to `v1beta2`.
- The AWSCluster example used `networkSpec`, but the current CAPA CRD uses `spec.network`. Updated the field name.
- The kubeadm examples used the in-tree AWS cloud provider setting (`cloud-provider: aws`). Updated them to the external cloud provider configuration and removed the API server cloud-provider extra argument, which is invalid on newer Kubernetes versions.
- The MachineDeployment selector matched an empty label set. Added matching `nodepool` labels to the selector and template metadata.
- Kubernetes versions `v1.28.5` and `v1.29.0` were outdated for a 2026 guide. Updated the creation example to `v1.35.4` and the upgrade example to `v1.35.5`.
- The Calico manifest URL used an older version. Updated it to v3.29.1, matching current Cluster API quick-start guidance.
- The storage section installed the EBS CSI driver but did not address the external AWS cloud controller manager required by the external cloud provider path. Added the official AWS cloud controller manager Helm chart install.
- The Prometheus alert expressions referenced non-standard `cluster_status_phase` and `machine_status_phase` metrics. Replaced them with controller availability and controller-runtime reconciliation error alerts.

## Review Notes
- The AWS cloud controller manager chart version is pinned to `0.0.11`, whose app version is v1.35.0. Operators should keep the cloud provider minor version aligned with the Kubernetes minor version during future updates.
- The ClusterClass snippet is still illustrative: the referenced templates must exist and variable patches must be defined before the `region` and `instanceType` variables will affect AWS template fields.
