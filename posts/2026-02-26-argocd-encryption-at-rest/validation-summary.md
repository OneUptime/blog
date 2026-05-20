# Validation Summary: How to Implement Encryption at Rest for ArgoCD Data

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD
- Kubernetes Secrets and etcd encryption at rest
- Kubernetes KMS provider
- Amazon EKS and AWS KMS
- Azure AKS and Azure Key Vault KMS
- Google Kubernetes Engine and Cloud KMS
- Bitnami Sealed Secrets
- External Secrets Operator
- Redis TLS and authentication
- Kubernetes StorageClass and volumes
- Argo CD Helm chart

## Sources Consulted
- Kubernetes: Encrypting Confidential Data at Rest - https://kubernetes.io/docs/tasks/administer-cluster/encrypt-data/
- Kubernetes: Using a KMS provider for data encryption - https://kubernetes.io/docs/tasks/administer-cluster/kms-provider/
- AWS CLI: eks associate-encryption-config - https://docs.aws.amazon.com/cli/latest/reference/eks/associate-encryption-config.html
- Microsoft Learn: Enable KMS data encryption in AKS - https://learn.microsoft.com/en-us/azure/aks/kms-data-encryption
- Google Cloud: Encrypt secrets at the application layer in GKE - https://cloud.google.com/kubernetes-engine/docs/how-to/encrypting-secrets
- Argo CD declarative setup documentation - https://argo-cd.readthedocs.io/en/stable/operator-manual/declarative-setup/
- Argo CD argocd-secret example - https://argo-cd.readthedocs.io/en/stable/operator-manual/argocd-secret-yaml/
- Argo CD server command reference - https://argo-cd.readthedocs.io/en/stable/operator-manual/server-commands/argocd-server/
- Argo CD application controller command reference - https://argo-cd.readthedocs.io/en/stable/operator-manual/server-commands/argocd-application-controller/
- Argo CD repo server command reference - https://argo-cd.readthedocs.io/en/stable/operator-manual/server-commands/argocd-repo-server/
- Argo CD Helm chart values - https://github.com/argoproj/argo-helm/blob/main/charts/argo-cd/values.yaml
- External Secrets Operator ExternalSecret API - https://external-secrets.io/latest/api/externalsecret/
- Bitnami Sealed Secrets documentation - https://github.com/bitnami-labs/sealed-secrets
- Redis TLS documentation - https://redis.io/docs/latest/operate/oss_and_stack/management/security/encryption/

## Issues Found
- The Kubernetes AES-CBC snippet described AES-CBC as the recommended default. Updated the wording to clarify that it is a locally managed key example and that KMS v2 is preferred where available.
- The EKS KMS section showed a raw Kubernetes `EncryptionConfiguration` with a local KMS plugin socket, which is not how managed EKS users enable Secrets encryption. Replaced it with the official `aws eks associate-encryption-config` command.
- The AKS command was incomplete for current AKS KMS data encryption with customer-managed keys. Added `--kms-infrastructure-encryption Enabled`, the Key Vault resource ID, and the managed identity argument.
- The GKE update command omitted required location and project flags from the official example. Added `--location` and `--project`.
- The External Secrets Operator example used `external-secrets.io/v1beta1`. Updated it to the current `external-secrets.io/v1` API version.
- The Argo CD Helm Redis TLS values used unsupported chart keys such as `redis.externalEndpoint` and `redis.password.*`, and mixed Redis HA values into a single-node Redis example. Replaced the snippet with current chart values using `global.extraVolumes`, `redis.extraArgs`, component `extraArgs`, and the chart's `redisSecretInit` behavior.
- The repo-server temporary storage examples added a second `tmp` volume through `repoServer.volumes`; the chart already defines that volume. Updated the examples to use `repoServer.existingVolumes.tmp`, which is the chart-supported override.
- The Argo CD server secret key was described as encrypting session tokens. Updated the text to match Argo CD documentation: it signs and validates session tokens.
- The verification command decoded the Secret through the Kubernetes API, which returns plaintext Secret data to authorized users and does not prove etcd encryption. Replaced it with an `etcdctl` storage check that looks for the Kubernetes encryption prefix.

## Review Notes
The Redis TLS example assumes a Secret named `argocd-redis-tls` containing `tls.crt`, `tls.key`, and `ca.crt`. Production deployments that require mutual TLS should also configure Argo CD Redis client certificate and key flags instead of disabling Redis client certificate authentication.
