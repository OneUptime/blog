# Validation Summary: How to Synchronize Secrets Across Multiple Kubernetes Clusters

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Kubernetes Secrets
- External Secrets Operator
- AWS Secrets Manager and Amazon EKS IRSA
- HashiCorp Vault Agent Injector and Kubernetes auth
- Bitnami Sealed Secrets and kubeseal
- EmberStack Reflector
- Kubernetes Python client
- Prometheus Operator PrometheusRule resources

## Sources Consulted
- External Secrets Operator ExternalSecret API: https://external-secrets.io/latest/api/externalsecret/
- External Secrets Operator AWS access provider docs: https://external-secrets.io/latest/provider/aws-access/
- External Secrets Operator metrics docs: https://external-secrets.io/v0.8.0/api/metrics/
- HashiCorp Vault Agent Injector annotations: https://developer.hashicorp.com/vault/docs/deploy/kubernetes/injector/annotations
- HashiCorp Vault Kubernetes auth API: https://developer.hashicorp.com/vault/api-docs/auth/kubernetes
- Bitnami Sealed Secrets README and Helm notes: https://github.com/bitnami-labs/sealed-secrets
- EmberStack Reflector README: https://github.com/emberstack/kubernetes-reflector
- Amazon EKS IAM roles for service accounts docs: https://docs.aws.amazon.com/eks/latest/userguide/iam-roles-for-service-accounts.html

## Issues Found
- External Secrets Operator manifests used `external-secrets.io/v1beta1`; updated them to the current `external-secrets.io/v1` API shown in current ESO docs.
- The AWS `SecretStore` referenced a service account without showing the required IAM role annotation context; added a minimal annotated `ServiceAccount` manifest using the documented `eks.amazonaws.com/role-arn` annotation.
- The basic `kubeseal --format=yaml` command would not reliably find the Helm-installed controller because the Helm chart defaults to controller name `sealed-secrets`, while `kubeseal` defaults to `sealed-secrets-controller`; added explicit `--controller-name` and `--controller-namespace` flags.
- The Vault deployment used `source` under `/bin/sh`; changed it to the POSIX `.` command so the example works with standard `/bin/sh`.
- The Vault sidecar explanation overstated continuous updates; clarified that Vault Agent renders updated files when template renewal or refresh occurs.
- The custom Python controller reused the same Kubernetes default client configuration and mutated the source secret object during target writes; changed it to create one API client per kubeconfig, deep-copy the source secret per target, and clear additional cluster-owned metadata.
- The custom Python controller did not ignore empty target entries; added filtering for blank target names.
- The Prometheus `SecretNotSynced` alert subtracted a counter from `time()`, which is not a valid way to detect stale syncs; replaced it with an alert based on `externalsecret_status_condition`.

## Review Notes
The post remains a high-level guide. The examples still use placeholder ARNs, secret names, kubeconfig paths, images, and credential values that readers must replace for their environments.
