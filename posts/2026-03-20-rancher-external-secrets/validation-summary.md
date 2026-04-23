# Validation Summary: How to Configure External Secrets Operator in Rancher - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Kubernetes
- Helm
- External Secrets Operator
- AWS Secrets Manager
- Amazon EKS IRSA
- HashiCorp Vault

## Sources Consulted
- External Secrets Operator getting started: https://external-secrets.io/latest/introduction/getting-started/
- External Secrets Operator `ExternalSecret` API: https://external-secrets.io/main/api/externalsecret/
- External Secrets Operator `SecretStore` API: https://external-secrets.io/main/api/secretstore/
- External Secrets Operator AWS access docs: https://external-secrets.io/latest/provider/aws-access/
- External Secrets Operator Vault provider docs: https://external-secrets.io/latest/provider/hashicorp-vault/
- External Secrets Operator API specification: https://external-secrets.io/latest/api/spec/
- Vault Kubernetes auth method docs: https://developer.hashicorp.com/vault/docs/auth/kubernetes
- Vault Kubernetes auth API docs: https://developer.hashicorp.com/vault/api-docs/auth/kubernetes
- Amazon EKS `eksctl` IAM service account docs: https://docs.aws.amazon.com/eks/latest/eksctl/iamserviceaccounts.html
- Kubernetes `kubectl create token` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_token/
- Kubernetes `kubectl annotate` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_annotate/
- Kubernetes Secrets docs: https://kubernetes.io/docs/concepts/configuration/secret/

## Issues Found
- The post used `external-secrets.io/v1beta1` manifests. Updated all ESO resources to `external-secrets.io/v1` to match current upstream API examples and current documentation.
- The Vault Kubernetes auth configuration used the in-cluster service IP and `/var/run/secrets/.../ca.crt`, which is not reliable when configuring Vault from an admin workstation. Replaced it with a kubeconfig-derived API server URL and exported CA certificate, which matches the Vault documentation for configuring the auth method from outside the cluster.
- The Vault example used `kubectl create token ...` for `token_reviewer_jwt`. Vault documents short-lived reviewer JWT caveats for Kubernetes 1.21+; using a freshly created token as a stored reviewer JWT is not a durable setup. Updated the example to omit `token_reviewer_jwt` and instead bind `system:auth-delegator` to the service accounts used for Vault authentication, which is the pattern documented by Vault and ESO for this flow.
- The Vault role and ESO `serviceAccountRef` examples did not include an audience. Current ESO Vault docs note that Vault 1.21+ requires an audience for Kubernetes auth roles or authentication fails. Added `audience=vault` to the Vault roles and `audiences: [vault]` to the corresponding `serviceAccountRef` entries.
- The namespace-scoped `SecretStore` example referenced `production-service-account` with the `external-secrets` Vault role, but no matching Vault role or service account setup was provided. Added the missing service account, ClusterRoleBinding, and Vault role for the `production` namespace, and updated the `SecretStore` to use that role.
- The conclusion claimed rotated secrets are propagated directly to pods. Kubernetes updates mounted Secret volumes eventually, but environment-variable consumers typically require a restart or reload path. Reworded the sentence so it correctly states that ESO propagates updates to Kubernetes Secrets.

## Review Notes
- The Helm install command remains valid, but current ESO chart behavior already installs and manages CRDs by default, so `--set installCRDs=true` is explicit rather than required.
- The EKS example uses IRSA, which is still valid. AWS also supports EKS Pod Identity as a newer alternative for some deployments.
