# Validation Summary: How to Manage Secrets Securely in Kubernetes

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes Secrets
- Kubernetes RBAC
- Kubernetes encryption at rest
- etcd
- External Secrets Operator
- AWS Secrets Manager
- Bitnami Sealed Secrets
- kubectl
- kubeseal

## Sources Consulted
- Kubernetes Secrets documentation: https://kubernetes.io/docs/concepts/configuration/secret/
- Kubernetes encryption at rest documentation: https://kubernetes.io/docs/tasks/administer-cluster/encrypt-data/
- Kubernetes RBAC documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- External Secrets Operator ExternalSecret API documentation: https://external-secrets.io/latest/api/externalsecret/
- External Secrets Operator AWS Secrets Manager provider documentation: https://external-secrets.io/latest/provider/aws-secrets-manager/
- External Secrets Operator AWS access documentation: https://external-secrets.io/latest/provider/aws-access/
- Bitnami Sealed Secrets documentation: https://github.com/bitnami-labs/sealed-secrets
- OneUptime Kubernetes product page and related audit log posts: https://oneuptime.com/product/kubernetes

## Issues Found
- The access-risk diagram said anyone who can exec into pods can read Secrets. That is only true for pods where the Secret is exposed to the container. Kubernetes documents the broader namespace risk as anyone authorized to create a Pod in a namespace can indirectly read Secrets in that namespace. Changed the diagram node to "Anyone who can create pods in the namespace."
- The encryption-at-rest example recommended AES-CBC and described a 32-byte key, but current Kubernetes documentation marks `aescbc` as weak and the sample key decoded to 29 bytes. Changed the example to use the stronger built-in `secretbox` provider and replaced the key with a valid 32-byte base64-encoded value.
- The External Secrets Operator examples used `external-secrets.io/v1beta1`. Current ESO documentation uses the GA `external-secrets.io/v1` API. Updated the `SecretStore` and `ExternalSecret` examples to `external-secrets.io/v1`.

## Review Notes
The `kubectl` CLI was not installed in the local environment, so command verification was performed against official Kubernetes documentation instead of local `kubectl --help` output. The examples remain intentionally illustrative and still require cluster-specific control plane paths, etcd credentials, IAM roles, and External Secrets Operator installation details before use in a real cluster. Kubernetes documents that Secret volume updates are eventually consistent, but containers using a Secret through a `subPath` mount do not receive automatic updates; that caveat could be added in a future revision. For high-security production clusters, Kubernetes KMS v2 is stronger than local key material in an encryption provider config, but the corrected `secretbox` example is a valid built-in encryption-at-rest provider.
