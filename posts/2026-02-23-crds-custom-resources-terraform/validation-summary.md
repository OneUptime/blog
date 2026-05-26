# Validation Summary: How to Handle CRDs and Custom Resources in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HashiCorp Kubernetes provider
- HashiCorp Helm provider
- kubectl Terraform provider
- Kubernetes CustomResourceDefinitions and custom resources
- cert-manager
- Prometheus Operator
- Helm
- kubectl

## Sources Consulted
- Kubernetes documentation: CustomResourceDefinitions - https://kubernetes.io/docs/tasks/extend-kubernetes/custom-resources/custom-resource-definitions/
- Kubernetes documentation: Finalizers - https://kubernetes.io/docs/concepts/overview/working-with-objects/finalizers/
- Kubernetes kubectl reference - https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- cert-manager v1.14 Helm installation documentation - https://cert-manager.io/v1.14-docs/installation/helm/
- cert-manager ACME issuer documentation - https://cert-manager.io/docs/configuration/acme/
- Terraform Registry: HashiCorp Kubernetes provider `kubernetes_manifest` - https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/manifest
- Terraform Registry: HashiCorp Helm provider `helm_release` - https://registry.terraform.io/providers/hashicorp/helm/latest/docs/resources/release
- Terraform Registry: gavinbunney/kubectl `kubectl_manifest` - https://registry.terraform.io/providers/gavinbunney/kubectl/latest/docs/resources/kubectl_manifest
- Prometheus Operator CRD examples for v0.71.0 - https://github.com/prometheus-operator/prometheus-operator/tree/v0.71.0/example/prometheus-operator-crd

## Issues Found
- The Certificate example requested a wildcard certificate while the referenced ClusterIssuer used an HTTP-01 solver against Let's Encrypt. Let's Encrypt does not issue wildcard certificates through HTTP-01, so the example was changed to request `app.example.com` instead of `*.example.com`.
- The critical Certificate example also used a wildcard DNS name while referencing the same HTTP-01 ClusterIssuer pattern. It was changed to `app.production.example.com`.
- The post recommended adding an arbitrary `kubernetes` finalizer to prevent accidental deletion. Kubernetes custom finalizers must use qualified names and should be removed by a controller; otherwise they can leave resources stuck in deletion. The example was revised to rely on Terraform `prevent_destroy` instead.

## Review Notes
- The `kubernetes_manifest` plan-time CRD limitation is correctly described.
- The cert-manager v1.14 `installCRDs` value is correct for the pinned chart version. Future cert-manager chart versions should be checked before reusing the same value name.
- The Prometheus Operator CRD URLs match the v0.71.0 repository layout.
