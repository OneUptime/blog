# Validation Summary: How to Deploy Kubernetes Operators with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HashiCorp Helm provider
- HashiCorp Kubernetes provider
- HashiCorp HTTP provider
- gavinbunney/kubectl Terraform provider
- Kubernetes operators and custom resources
- Prometheus Operator and kube-prometheus-stack
- Strimzi Kafka Operator
- Zalando Postgres Operator
- Operator Lifecycle Manager (OLM)

## Sources Consulted
- HashiCorp Helm provider `helm_release` resource documentation: https://registry.terraform.io/providers/hashicorp/helm/latest/docs/resources/release
- HashiCorp Kubernetes provider `kubernetes_resource` data source documentation: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/data-sources/resource
- HashiCorp HTTP provider `http` data source documentation: https://registry.terraform.io/providers/hashicorp/http/latest/docs/data-sources/http
- gavinbunney/kubectl `kubectl_file_documents` data source documentation: https://registry.terraform.io/providers/gavinbunney/kubectl/latest/docs/data-sources/kubectl_file_documents
- Prometheus Operator installation documentation: https://prometheus-operator.dev/docs/getting-started/installation/
- prometheus-community kube-prometheus-stack chart documentation: https://github.com/prometheus-community/helm-charts/tree/main/charts/kube-prometheus-stack
- Strimzi Operator 0.39.0 deploying documentation: https://strimzi.io/docs/operators/0.39.0/deploying
- Zalando Postgres Operator user guide and cluster manifest reference: https://opensource.zalando.com/postgres-operator/docs/user.html and https://opensource.zalando.com/postgres-operator/docs/reference/cluster_manifest.html
- Operator Lifecycle Manager install and quickstart documentation: https://operator-framework.github.io/olm-book/docs/install-olm.html and https://olm.operatorframework.io/docs/getting-started/

## Issues Found
- The Zalando Postgres cluster manifest used `metadata.name: app-database` with `teamId: myteam`. Zalando's manifest guidance documents the team ID prefix convention for cluster names, so the example was changed to `myteam-app-database`.
- The OLM Subscription example used a generic `redis-operator` package that was not verified against the Operator Framework documentation. It was replaced with the documented `project-quay` Subscription example using the `operatorhubio-catalog` source in the `olm` namespace.
- The operator health-check example used `data "kubernetes_deployment"`, which is not a current HashiCorp Kubernetes provider data source, and referenced `helm_release.cert_manager`, which was not defined in the post. It was changed to use the documented generic `kubernetes_resource` data source and to check the kube-prometheus-stack operator deployment created earlier in the post.

## Review Notes
- The pinned chart and operator versions in the examples are older, but the examples are version-specific and remain technically valid for those versions.
- The Helm provider has had version-specific schema changes around nested attributes. The examples use patterns still represented in the current provider documentation, but production modules should pin provider versions in `required_providers`.
