# Validation Summary: How to Configure ClusterSecretStore for Multi-Namespace Access with Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Kubernetes
- External Secrets Operator
- ClusterSecretStore
- ExternalSecret
- AWS Secrets Manager
- Amazon EKS IAM Roles for Service Accounts (IRSA)
- kubectl

## Sources Consulted
- External Secrets Operator API specification: https://external-secrets.io/main/api/spec/
- External Secrets Operator ClusterSecretStore documentation: https://external-secrets.io/v0.10.0/api/clustersecretstore/
- External Secrets Operator AWS provider authentication documentation: https://external-secrets.io/latest/provider/aws-access/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Kustomize API reference v1: https://fluxcd.io/flux/components/kustomize/api/v1/
- Kubernetes kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/

## Issues Found
- The External Secrets Operator manifests used `apiVersion: external-secrets.io/v1beta1`. Current ESO documentation exposes `external-secrets.io/v1` as the stable API, and current examples use `v1`. Updated the `ClusterSecretStore`, both `ExternalSecret` examples, and the Flux `healthChecks` reference to `external-secrets.io/v1`.

## Review Notes
- The `ClusterSecretStore` `conditions.namespaceSelector` example is valid and matches the documented namespace access controls.
- The AWS `auth.jwt.serviceAccountRef.namespace` field is correct for a cluster-scoped store that references a ServiceAccount in a namespace.
- The Flux `Kustomization` fields shown are valid for `kustomize.toolkit.fluxcd.io/v1`.
- The `kubectl get` verification commands are syntactically correct; they assume the External Secrets Operator CRDs are installed in the cluster.
