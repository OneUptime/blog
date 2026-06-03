# Validation Summary: How to Set Up Terraform K8s Provider for Managing Resources Inside Running

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HashiCorp Terraform Kubernetes provider
- Kubernetes workloads, Services, ConfigMaps, Secrets, Ingress, StorageClasses, PVCs, StatefulSets, RBAC, and custom resources
- Amazon EKS
- AWS CLI EKS authentication
- AWS EBS CSI Driver

## Sources Consulted
- Terraform Kubernetes provider documentation: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs
- Terraform Kubernetes Secret resource documentation: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/secret
- Terraform Kubernetes Ingress resource documentation: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/ingress
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- Kubernetes StorageClass documentation: https://kubernetes.io/docs/concepts/storage/storage-classes/
- Kubernetes authentication and exec credential plugin documentation: https://kubernetes.io/docs/reference/access-authn-authz/authentication/
- AWS CLI `eks get-token` documentation: https://docs.aws.amazon.com/cli/latest/reference/eks/get-token.html
- Amazon EKS Kubernetes version lifecycle documentation: https://docs.aws.amazon.com/eks/latest/userguide/kubernetes-versions.html
- Amazon EKS StorageClass parameters documentation: https://docs.aws.amazon.com/eks/latest/userguide/create-storage-class.html
- AWS EBS CSI Driver documentation: https://github.com/kubernetes-sigs/aws-ebs-csi-driver

## Issues Found
- The EKS example used `cluster_version = "1.28"`, which is no longer an EKS supported version as of June 3, 2026. Updated it to `1.33`, which is listed in Amazon EKS standard support.
- The Secret example base64-encoded values in the Terraform `data` argument. The Kubernetes provider expects clear string values for `data` and handles encoding for the Kubernetes API, so using `base64encode` would store double-encoded values. Updated the values to plain strings.
- The Ingress example used the deprecated `kubernetes.io/ingress.class` annotation. Updated it to use `ingress_class_name = "nginx"` in the Ingress spec.
- The StorageClass example used the removed in-tree AWS EBS provisioner `kubernetes.io/aws-ebs`. Updated it to the AWS EBS CSI provisioner `ebs.csi.aws.com`.

## Review Notes
The examples are illustrative and still omit surrounding resources such as the VPC module, API service, database password variable, installed CRDs, and installed CSI or Ingress controllers. Those omissions are acceptable for a blog guide, but a production-ready example would define those dependencies explicitly and protect Terraform state because Secret values are still stored in state.
