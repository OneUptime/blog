# Validation Summary: How to Configure Bucket Source with MinIO in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD source-controller Bucket sources
- Flux CD kustomize-controller Kustomizations
- Kubernetes Secrets, Services, Namespaces, and kubectl
- MinIO object storage
- MinIO Helm chart
- MinIO Client (`mc`)
- GitHub Actions
- TLS certificates with OpenSSL

## Sources Consulted
- Flux Bucket source documentation: https://fluxcd.io/flux/components/source/buckets/
- Flux source-controller API reference: https://fluxcd.io/flux/components/source/api/v1/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux v2.0 Kustomization documentation: https://v2-0.docs.fluxcd.io/flux/components/kustomize/kustomization/
- MinIO Helm chart values and templates: https://github.com/minio/minio/tree/master/helm/minio
- MinIO TLS documentation: https://min.io/docs/minio/linux/operations/network-encryption.html
- MinIO Client quickstart: https://minio.github.io/mc/
- MinIO `mc cp` documentation: https://min.io/docs/minio/linux/reference/minio-mc/mc-cp.html
- MinIO `mc mirror` documentation: https://min.io/docs/minio/linux/reference/minio-mc/mc-mirror.html
- MinIO `mc admin user add` documentation: https://min.io/docs/minio/linux/reference/minio-mc-admin/mc-admin-user-add.html
- MinIO `mc admin policy attach` documentation: https://min.io/docs/minio/linux/reference/minio-mc-admin/mc-admin-policy-attach.html

## Issues Found
- The Kustomization example used `targetNamespace: my-app` without ensuring that namespace exists. Flux documentation states that `spec.targetNamespace` must already exist or be provided by a manifest in the Kustomization; the kustomize-controller does not create it automatically. Added a short note and `kubectl create namespace my-app` command before the Kustomization example.
- The GitHub Actions `mc alias set` command used unquoted secrets. Quoted the endpoint, access key, and secret key expressions so shell parsing does not break credentials that contain special characters.

## Review Notes
The Flux Bucket API fields, `generic` provider usage, `accesskey` and `secretkey` secret keys, `insecure` behavior, and `certSecretRef` CA usage match the current Flux documentation. The MinIO Helm chart values used for root credentials, standalone mode, persistence, and TLS certificate secret shape match the official chart templates. The MinIO Client commands and policy attachment flow are current.
