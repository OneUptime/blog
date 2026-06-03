# Validation Summary: How to Set Up Kubernetes Secrets Encryption at Rest Using KMS Provider Plugins

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Kubernetes encryption at rest
- Kubernetes KMS provider v2
- Kubernetes Secrets and etcd
- AWS KMS and Amazon EKS
- Azure Key Vault and AKS
- Google Cloud KMS and GKE
- Prometheus alerting for kube-apiserver KMS metrics

## Sources Consulted
- Kubernetes: Encrypting Confidential Data at Rest - https://kubernetes.io/docs/tasks/administer-cluster/encrypt-data/
- Kubernetes: Using a KMS provider for data encryption - https://kubernetes.io/docs/tasks/administer-cluster/kms-provider/
- Kubernetes API server configuration API v1 - https://kubernetes.io/docs/reference/config-api/apiserver-config.v1/
- Kubernetes Metrics Reference - https://kubernetes.io/docs/reference/instrumentation/metrics/
- kubernetes-sigs AWS encryption provider README - https://github.com/kubernetes-sigs/aws-encryption-provider
- AWS CLI: eks associate-encryption-config - https://docs.aws.amazon.com/cli/latest/reference/eks/associate-encryption-config.html
- Amazon EKS: Default envelope encryption for all Kubernetes API data - https://docs.aws.amazon.com/eks/latest/userguide/envelope-encryption.html
- AWS KMS API: CreateGrant - https://docs.aws.amazon.com/kms/latest/APIReference/API_CreateGrant.html
- Microsoft Learn: AKS KMS data encryption - https://learn.microsoft.com/en-us/azure/aks/kms-data-encryption
- Microsoft Learn: Legacy AKS KMS etcd encryption - https://learn.microsoft.com/en-us/azure/aks/use-kms-etcd-encryption
- Azure CLI: az keyvault key - https://learn.microsoft.com/en-us/cli/azure/keyvault/key
- Google Cloud: Encrypt secrets at the application layer in GKE - https://docs.cloud.google.com/kubernetes-engine/docs/how-to/encrypting-secrets

## Issues Found
- The KMS architecture explanation described the older per-resource encrypted DEK flow as if it were the current KMS v2 behavior. Updated it to explain the KMS v2 encrypted DEK seed and single-use derived DEKs.
- The AWS provider install command pointed to a non-existent raw GitHub manifest and implied the provider should be deployed to EKS. Removed the broken URL and clarified that self-managed clusters run the provider on API server nodes, while EKS uses managed control-plane encryption configuration.
- The AWS KMS alias lookup happened before the alias was created. Reordered the commands so the key ID is captured from `create-key`, then the alias is created.
- The Kubernetes `EncryptionConfiguration` snippet omitted `apiVersion: v2` under `kms` and used the KMS v1 `cachesize` field. Updated the snippet for current KMS v2.
- The migration script used annotation mutation and `kubectl apply`; Kubernetes documentation recommends rewriting existing Secrets with `kubectl replace -f -`. Replaced the script with the documented rewrite command.
- The AKS section used a hand-written DaemonSet and ConfigMap for a managed AKS control plane. Replaced it with AKS control-plane CLI configuration and added the current 1.33+ KMS data encryption caveat.
- The Azure Key Vault key command did not specify an HSM key type while requesting HSM protection. Added `--kty RSA-HSM` and added commands to retrieve the versionless key ID used by AKS.
- The key rotation script attempted to `kubectl apply` an `EncryptionConfiguration`, which is not a Kubernetes API resource. Replaced it with guidance to update the API server config file on each control-plane node and use `kubectl replace` to re-encrypt Secrets.
- The Prometheus alert metrics used names that are not in the current Kubernetes metrics reference. Replaced them with `apiserver_storage_transformation_operations_total` and `apiserver_envelope_encryption_kms_operations_latency_seconds_bucket`.
- The compliance script checked the unrelated `extension-apiserver-authentication` ConfigMap and looked only for a generic KMS marker. Removed the unrelated check and changed the etcd marker to `k8s:enc:kms:v2`.

## Review Notes
Managed Kubernetes services differ from self-managed Kubernetes. EKS, AKS, and GKE expose provider-specific control-plane APIs instead of requiring users to mount KMS sockets into API server static pods. Future revisions could split self-managed Kubernetes and managed-provider instructions into separate sections for clarity.
