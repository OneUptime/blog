# Validation Summary: How to Create EKS Cluster with Fargate Profile in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- AWS provider for Terraform
- Kubernetes provider for Terraform
- Amazon EKS
- AWS Fargate for Amazon EKS
- Kubernetes
- AWS IAM
- AWS CLI
- Fluent Bit / EKS Fargate logging

## Sources Consulted
- Amazon EKS documentation: Kubernetes version lifecycle and currently supported versions: https://docs.aws.amazon.com/eks/latest/userguide/kubernetes-versions.html
- Amazon EKS documentation: Define which Pods use AWS Fargate: https://docs.aws.amazon.com/eks/latest/userguide/fargate-profile.html
- Amazon EKS documentation: Simplify compute management with AWS Fargate: https://docs.aws.amazon.com/eks/latest/userguide/fargate.html
- Amazon EKS documentation: Get started with AWS Fargate for your cluster, including CoreDNS guidance: https://docs.aws.amazon.com/eks/latest/userguide/fargate-getting-started.html
- Amazon EKS documentation: Pod execution IAM role: https://docs.aws.amazon.com/eks/latest/userguide/pod-execution-role.html
- Amazon EKS documentation: Fargate pod CPU and memory combinations: https://docs.aws.amazon.com/eks/latest/userguide/fargate-pod-configuration.html
- Amazon EKS documentation: Fargate logging configuration: https://docs.aws.amazon.com/eks/latest/userguide/fargate-logging.html
- Terraform AWS provider documentation: aws_eks_fargate_profile resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/eks_fargate_profile
- Terraform Kubernetes provider documentation: provider authentication and EKS exec plugin example: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs

## Issues Found
- The EKS cluster example pinned Kubernetes `1.29`, which is no longer listed as available in standard or extended support as of May 26, 2026. Updated the example to `1.35`, which is listed in standard support.
- The provider setup did not include the Kubernetes or null providers even though later snippets use `kubernetes_namespace`, `kubernetes_config_map`, and `null_resource`. Added the required provider entries.
- The Kubernetes provider was not configured, so the Kubernetes resources in the logging section would not have a working cluster connection. Added an EKS provider configuration using the AWS CLI exec credential plugin.
- The pod execution role explanation implied application containers could use the execution role for general AWS API calls. Clarified that the role is for Fargate infrastructure and that application AWS permissions should use IAM roles for service accounts.
- The CoreDNS Fargate profile selected the entire `kube-system` namespace. Updated it to match only CoreDNS with the `k8s-app = kube-dns` label, matching current AWS guidance and avoiding accidental selection of other system pods.
- The CoreDNS section instructed users to remove an `eks.amazonaws.com/compute-type` annotation. Current AWS guidance is to create a CoreDNS Fargate profile and restart the CoreDNS deployment. Updated the text and command accordingly.
- The Fargate logging output used `Match *`. Updated it to `Match kube.*` to align with the Fargate-managed input tag shown in AWS's CloudWatch logging example.
- The Fargate resource sizing list omitted the current 8 vCPU and 16 vCPU combinations. Added those combinations and changed the wording from "common ones" to "currently include."

## Review Notes
- The guide still uses AWS provider `~> 5.0`. This is not deprecated and remains usable, but future updates could consider provider `~> 6.0` after testing the examples against the newer major provider version.
- The example uses a single NAT gateway for two private subnets. That is valid for a tutorial, but production deployments often use one NAT gateway per Availability Zone for better availability.
