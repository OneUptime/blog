# How to Use SOPS with Multiple Cloud KMS Providers in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, SOPS, Secrets, Encryption, KMS, AWS, GCP, Azure, Multi-Cloud

Description: Learn how to configure SOPS with multiple cloud KMS providers for cross-cloud secret management in Flux deployments.

---

Organizations running workloads across multiple cloud providers need a unified approach to secret management. SOPS supports AWS KMS, GCP Cloud KMS, Azure Key Vault, and HashiCorp Vault as encryption providers. By combining multiple KMS providers in a single SOPS configuration, you can encrypt secrets so that any of your cloud environments can decrypt them. This guide shows how to set up multi-cloud KMS with SOPS in Flux.

## Why Use Cloud KMS with SOPS

Cloud KMS providers offer hardware-backed key management, automatic key rotation, audit logging, and integration with cloud IAM. Unlike age or GPG keys that must be manually distributed, cloud KMS keys are accessed through API calls authenticated by the cloud provider's identity system. This is especially useful for workloads running on managed Kubernetes services like EKS, GKE, and AKS.

## Prerequisites

- Kubernetes clusters in AWS (EKS), GCP (GKE), or Azure (AKS) with Flux installed
- KMS keys created in each cloud provider
- SOPS CLI installed with cloud provider SDK support
- IAM roles or service accounts configured for KMS access

## Setting Up AWS KMS

Create a KMS key in AWS:

```bash
aws kms create-key --description "SOPS encryption key for Flux"
# Note the KeyId from the output

aws kms create-alias \
  --alias-name alias/sops-flux \
  --target-key-id <key-id>
```

## Setting Up GCP Cloud KMS

Create a keyring and key in GCP:

```bash
gcloud kms keyrings create sops-flux \
  --location global

gcloud kms keys create sops-key \
  --keyring sops-flux \
  --location global \
  --purpose encryption
```

## Setting Up Azure Key Vault

Create a Key Vault and key in Azure:

```bash
az keyvault create \
  --name sops-flux-vault \
  --resource-group myResourceGroup

az keyvault key create \
  --vault-name sops-flux-vault \
  --name sops-key \
  --protection software
```

## Configuring .sops.yaml with Multiple Providers

Combine all KMS providers in your `.sops.yaml`:

```yaml
creation_rules:
  - path_regex: .*\.yaml$
    kms: arn:aws:kms:us-east-1:123456789012:alias/sops-flux
    gcp_kms: projects/my-project/locations/global/keyRings/sops-flux/cryptoKeys/sops-key
    azure_kv: https://sops-flux-vault.vault.azure.net/keys/sops-key/1234567890abcdef
    encrypted_regex: ^(data|stringData)$
```

When SOPS encrypts a file, it creates a data key and encrypts it with each KMS provider. Any single provider can decrypt the file independently.

## Encrypting with Multiple KMS Providers

Set up cloud credentials and encrypt:

```bash
# Ensure cloud credentials are configured
export AWS_PROFILE=my-profile
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/gcp-sa.json
# Azure credentials via az login

# Encrypt
sops --encrypt --in-place secret.yaml
```

SOPS contacts each KMS provider to encrypt the data key. The encrypted file contains separate encrypted copies of the data key for each provider.

## Environment-Specific KMS Configuration

Assign different KMS providers to different environments:

```yaml
creation_rules:
  # AWS EKS cluster secrets
  - path_regex: clusters/aws/.*\.yaml$
    kms: arn:aws:kms:us-east-1:123456789012:alias/sops-flux
    encrypted_regex: ^(data|stringData)$

  # GCP GKE cluster secrets
  - path_regex: clusters/gcp/.*\.yaml$
    gcp_kms: projects/my-project/locations/global/keyRings/sops-flux/cryptoKeys/sops-key
    encrypted_regex: ^(data|stringData)$

  # Azure AKS cluster secrets
  - path_regex: clusters/azure/.*\.yaml$
    azure_kv: https://sops-flux-vault.vault.azure.net/keys/sops-key/1234567890abcdef
    encrypted_regex: ^(data|stringData)$

  # Shared secrets accessible from any cloud
  - path_regex: shared/.*\.yaml$
    kms: arn:aws:kms:us-east-1:123456789012:alias/sops-flux
    gcp_kms: projects/my-project/locations/global/keyRings/sops-flux/cryptoKeys/sops-key
    azure_kv: https://sops-flux-vault.vault.azure.net/keys/sops-key/1234567890abcdef
    encrypted_regex: ^(data|stringData)$
```

## Configuring Flux for AWS KMS

On an EKS cluster, configure the kustomize-controller to use an IAM role for KMS access:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: secrets
  namespace: flux-system
spec:
  interval: 10m
  path: ./clusters/aws
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  decryption:
    provider: sops
```

Annotate the kustomize-controller service account with the IAM role:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: kustomize-controller
  namespace: flux-system
  annotations:
    eks.amazonaws.com/role-arn: arn:aws:iam::123456789012:role/sops-kms-role
```

## Configuring Flux for GCP KMS

On a GKE cluster, use Workload Identity:

```bash
# Bind the KSA to a GSA with KMS permissions
gcloud iam service-accounts add-iam-policy-binding \
  sops-sa@my-project.iam.gserviceaccount.com \
  --role roles/iam.workloadIdentityUser \
  --member "serviceAccount:my-project.svc.id.goog[flux-system/kustomize-controller]"
```

Annotate the service account:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: kustomize-controller
  namespace: flux-system
  annotations:
    iam.gke.io/gcp-service-account: sops-sa@my-project.iam.gserviceaccount.com
```

## Configuring Flux for Azure Key Vault

On an AKS cluster, use Azure AD Workload Identity:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: kustomize-controller
  namespace: flux-system
  annotations:
    azure.workload.identity/client-id: <managed-identity-client-id>
  labels:
    azure.workload.identity/use: "true"
```

## Combining KMS with Age as Backup

Add an age key as a fallback for local development and backup access:

```yaml
creation_rules:
  - path_regex: .*\.yaml$
    kms: arn:aws:kms:us-east-1:123456789012:alias/sops-flux
    gcp_kms: projects/my-project/locations/global/keyRings/sops-flux/cryptoKeys/sops-key
    age: age1backupkey...
    encrypted_regex: ^(data|stringData)$
```

Developers can decrypt files locally using the age key without needing cloud credentials.

## Verifying Multi-Provider Setup

Test decryption with each provider independently:

```bash
# Test AWS KMS
AWS_PROFILE=my-profile sops --decrypt secret.yaml

# Test GCP KMS
GOOGLE_APPLICATION_CREDENTIALS=/path/to/sa.json sops --decrypt secret.yaml

# Test age backup key
SOPS_AGE_KEY_FILE=backup.agekey sops --decrypt secret.yaml
```

## Conclusion

Using SOPS with multiple cloud KMS providers in Flux enables a unified secret management workflow across multi-cloud environments. Each cloud cluster uses its native KMS for decryption through workload identity, while shared secrets can be encrypted for all providers simultaneously. Combined with an age backup key, this approach provides both cloud-native security and operational resilience.
