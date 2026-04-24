# Validation Summary: How to Deploy Kubernetes Operators via Portainer - K8s

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Kubernetes
- Helm
- Custom Resource Definitions (CRDs)
- cert-manager
- Prometheus Operator / kube-prometheus-stack
- CloudNativePG
- MinIO Operator
- Strimzi
- Vault Secrets Operator

## Sources Consulted
- Portainer docs: Applications overview https://docs.portainer.io/user/kubernetes/applications
- Portainer docs: Create an application from a Manifest https://docs.portainer.io/sts/user/kubernetes/applications/manifest/create
- Portainer docs: Create an application from a Helm chart https://docs.portainer.io/user/kubernetes/applications/manifest/helm
- Portainer docs: Account settings / Helm repositories https://docs.portainer.io/sts/user/account-settings
- Portainer docs: Custom Resources view https://docs.portainer.io/sts/user/kubernetes/more-resources/custom-resources
- cert-manager docs: install via `kubectl` https://cert-manager.io/docs/installation/kubectl/
- cert-manager docs: install via Helm https://cert-manager.io/docs/installation/helm/
- cert-manager releases https://github.com/cert-manager/cert-manager/releases
- Prometheus Community `kube-prometheus-stack` chart https://github.com/prometheus-community/helm-charts/tree/main/charts/kube-prometheus-stack
- CloudNativePG installation docs https://cloudnative-pg.io/docs/devel/installation_upgrade/
- CloudNativePG Helm chart docs https://cloudnative-pg.io/charts
- CloudNativePG sample cluster manifest https://raw.githubusercontent.com/cloudnative-pg/cloudnative-pg/main/docs/src/samples/cluster-example.yaml
- MinIO Operator Helm installation docs https://min.io/docs/minio/kubernetes/upstream/operations/install-deploy-manage/deploy-operator-helm.html
- Strimzi deployment docs https://strimzi.io/docs/operators/latest/full/deploying and https://strimzi.io/docs/operators/in-development/full/deploying.html
- HashiCorp Vault Secrets Operator installation docs https://developer.hashicorp.com/vault/docs/platform/k8s/vso/installation
- Kubernetes CRD docs https://kubernetes.io/docs/tasks/extend-kubernetes/custom-resources/custom-resource-definitions/

## Issues Found
- Portainer navigation paths were outdated. I changed the post to use the current `Applications > Create from code` flow for both Manifest and Helm deployments, updated Helm repository guidance to `Account settings > Helm repositories`, and replaced the incorrect `Kubernetes > Advanced` reference with `More resources > Custom Resources`.
- The cert-manager manifest URL was outdated. I updated the static manifest example from `v1.14.0` to `v1.20.2`, which is the current release as of April 24, 2026, and added the required `crds.enabled: true` Helm value for repo-based installs.
- The original "custom operator" YAML was not a working deployment. It used a placeholder image, referenced a missing service account, and defined a CRD schema that did not match the later custom resource fields. I replaced that section with an official CloudNativePG operator manifest deployment and a matching `Cluster` custom resource example.
- Several Helm chart references in the comparison table were incorrect or misleading. I corrected `cert-manager/cert-manager`, `zalionis/postgres-operator`, `minio/operator`, and `hashicorp/vault`, and updated the Strimzi entry to its current official OCI chart reference.
- The monitoring commands no longer matched the revised operator example. I updated the `kubectl` checks to target the CloudNativePG deployment, CRDs, and custom resources.

## Review Notes
- cert-manager's official docs now recommend the OCI chart first, but the Jetstack Helm repository remains supported and is easier to map to Portainer's repository-based Helm workflow.
- Portainer's direct Custom Resources view is documented as an admin-only Portainer Business Edition feature.
- The article still mixes Portainer UI steps with `kubectl` verification commands; that is technically fine for a Kubernetes operations audience.
