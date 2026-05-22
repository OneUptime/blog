# Validation Summary: How to Handle Kubernetes Init Containers in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform Kubernetes provider
- Kubernetes Deployments and Pods
- Kubernetes init containers
- Kubernetes Secrets
- Kubernetes emptyDir volumes
- kubectl logs and describe commands

## Sources Consulted
- Kubernetes init containers documentation: https://kubernetes.io/docs/concepts/workloads/pods/init-containers/
- Kubernetes kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- HashiCorp Terraform Kubernetes provider deployment resource documentation: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/deployment
- HashiCorp Terraform Kubernetes provider source documentation for kubernetes_deployment: https://raw.githubusercontent.com/hashicorp/terraform-provider-kubernetes/main/docs/resources/deployment.md
- HashiCorp Terraform Kubernetes provider source documentation for kubernetes_secret: https://raw.githubusercontent.com/hashicorp/terraform-provider-kubernetes/main/docs/resources/secret.md
- Kubernetes Secrets documentation: https://kubernetes.io/docs/concepts/configuration/secret/

## Issues Found
- The database migration example used a Deployment with three replicas but did not mention that init containers run per Pod. I added a caveat that migrations should be idempotent or run as a separate Kubernetes Job when they need to execute only once.

## Review Notes
The Terraform block names and Kubernetes init container behavior described in the post match the current Terraform Kubernetes provider and Kubernetes documentation. The debugging commands use valid `kubectl describe pod` and `kubectl logs -c ... --previous` syntax. The linked OneUptime article returned HTTP 200 during review.
