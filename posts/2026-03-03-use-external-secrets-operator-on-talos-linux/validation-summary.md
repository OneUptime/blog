# Validation Summary: How to Use External Secrets Operator on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- Kubernetes
- External Secrets Operator
- Helm
- AWS Secrets Manager
- Kubernetes Secrets and RBAC

## Sources Consulted
- External Secrets Operator getting started documentation: https://external-secrets.io/latest/introduction/getting-started/
- External Secrets Operator ClusterSecretStore API documentation: https://external-secrets.io/latest/api/clustersecretstore/
- External Secrets Operator AWS Secrets Manager provider documentation: https://external-secrets.io/latest/provider/aws-secrets-manager/
- External Secrets Operator API specification: https://external-secrets.io/main/api/spec/
- External Secrets Operator Helm chart values: https://github.com/external-secrets/external-secrets/blob/main/deploy/charts/external-secrets/values.yaml
- Talos Linux FAQ: https://www.talos.dev/v1.11/learn-more/faqs/

## Issues Found
- The ESO manifests used `apiVersion: external-secrets.io/v1beta1`. Current official ESO examples and API docs use `external-secrets.io/v1`, and the chart marks v1beta1 serving as deprecated/backward-compatible only. Updated the ClusterSecretStore and ExternalSecret examples to `external-secrets.io/v1`.
- The installation verification comment listed exact pod names that do not match the generated pod names from the Helm chart, which include deployment-derived names and hashes. Reworded it to say users should see pods for the controller, webhook, and cert-controller.
- The Helm values example claimed to set limits for ESO pods but only configured the top-level controller `resources`. Added `webhook.resources` and `certController.resources` entries so the example matches the text.
- The security best-practice note about restricting namespaces with RBAC alone was incomplete for shared `ClusterSecretStore` usage. Updated it to mention ClusterSecretStore namespace conditions along with RBAC.

## Review Notes
- The local environment did not have `helm` or `kubectl` installed, so command validation was performed against official documentation rather than local CLI help output.
- The AWS static credential example is technically valid for testing, and the post already warns against hard-coded credentials in production.
