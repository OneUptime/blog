# How to Configure Flux with IRSA for KMS SOPS Decryption on EKS

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, AWS, EKS, IRSA, KMS, SOPS, Secrets Management

Description: Learn how to configure Flux to decrypt SOPS-encrypted secrets using AWS KMS with IRSA on EKS, eliminating the need for static credentials or GPG keys.

---

## Why KMS with SOPS

SOPS (Secrets OPerationS) supports AWS KMS as an encryption backend, allowing you to encrypt Kubernetes secrets in your Git repository and have Flux decrypt them at deploy time. Combined with IRSA, the kustomize-controller can access KMS without any static credentials, using only the EKS OIDC provider for authentication.

## Prerequisites

- An EKS cluster with the OIDC provider enabled
- Flux installed on the EKS cluster
- AWS KMS key created for SOPS encryption
- SOPS CLI installed locally for encrypting secrets
- AWS CLI and eksctl installed

## Step 1: Create the KMS Key

Create a KMS key dedicated to SOPS encryption:

```bash
# Create the KMS key
KEY_ARN=$(aws kms create-key \
  --description "SOPS encryption key for Flux" \
  --query 'KeyMetadata.Arn' \
  --output text)

# Create an alias for easier reference
aws kms create-alias \
  --alias-name alias/flux-sops \
  --target-key-id "$KEY_ARN"

echo "KMS Key ARN: $KEY_ARN"
```

## Step 2: Create the IAM Policy

Create an IAM policy that grants decrypt access to the KMS key:

```bash
cat > kms-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "kms:Decrypt",
        "kms:DescribeKey"
      ],
      "Resource": "${KEY_ARN}"
    }
  ]
}
EOF

aws iam create-policy \
  --policy-name FluxKMSDecrypt \
  --policy-document file://kms-policy.json
```

## Step 3: Create the IAM Role for Kustomize Controller

The kustomize-controller is the Flux component that handles SOPS decryption:

```bash
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
OIDC_PROVIDER=$(aws eks describe-cluster --name my-cluster \
  --query "cluster.identity.oidc.issuer" --output text | sed 's|https://||')

cat > trust-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::${ACCOUNT_ID}:oidc-provider/${OIDC_PROVIDER}"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "${OIDC_PROVIDER}:sub": "system:serviceaccount:flux-system:kustomize-controller",
          "${OIDC_PROVIDER}:aud": "sts.amazonaws.com"
        }
      }
    }
  ]
}
EOF

aws iam create-role \
  --role-name flux-kms-sops-role \
  --assume-role-policy-document file://trust-policy.json

aws iam attach-role-policy \
  --role-name flux-kms-sops-role \
  --policy-arn "arn:aws:iam::${ACCOUNT_ID}:policy/FluxKMSDecrypt"
```

## Step 4: Annotate the Kustomize Controller Service Account

Patch the kustomize-controller service account to use the IAM role:

```yaml
# clusters/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - gotk-components.yaml
  - gotk-sync.yaml
patches:
  - target:
      kind: ServiceAccount
      name: kustomize-controller
      namespace: flux-system
    patch: |
      apiVersion: v1
      kind: ServiceAccount
      metadata:
        name: kustomize-controller
        namespace: flux-system
        annotations:
          eks.amazonaws.com/role-arn: arn:aws:iam::123456789012:role/flux-kms-sops-role
```

## Step 5: Configure SOPS Locally

Create a `.sops.yaml` configuration file in your repository root:

```yaml
# .sops.yaml
creation_rules:
  - path_regex: secrets/.*\.yaml$
    kms: arn:aws:kms:us-east-1:123456789012:key/12345678-1234-1234-1234-123456789012
    encrypted_regex: ^(data|stringData)$
```

## Step 6: Encrypt Secrets with SOPS

Encrypt your Kubernetes secrets using SOPS:

```bash
# Create a plain-text secret
cat > secret.yaml << 'EOF'
apiVersion: v1
kind: Secret
metadata:
  name: database-credentials
  namespace: default
type: Opaque
stringData:
  username: admin
  password: super-secret-password
  connection-string: postgresql://admin:super-secret-password@db:5432/mydb
EOF

# Encrypt with SOPS using KMS
sops --encrypt --in-place secret.yaml

# Move to the secrets directory
mv secret.yaml secrets/production/database-credentials.yaml
```

The encrypted file will look like this:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: database-credentials
  namespace: default
type: Opaque
stringData:
  username: ENC[AES256_GCM,data:...,type:str]
  password: ENC[AES256_GCM,data:...,type:str]
  connection-string: ENC[AES256_GCM,data:...,type:str]
sops:
  kms:
    - arn: arn:aws:kms:us-east-1:123456789012:key/12345678-1234-1234-1234-123456789012
      created_at: "2026-03-13T00:00:00Z"
      enc: AQICAHh...
      aws_profile: ""
  version: 3.8.1
```

## Step 7: Configure Flux Kustomization for Decryption

Enable SOPS decryption in the Flux Kustomization:

```yaml
# clusters/production/secrets.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: secrets
  namespace: flux-system
spec:
  interval: 10m
  retryInterval: 1m
  timeout: 5m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./secrets/production
  prune: true
  decryption:
    provider: sops
```

Note that with KMS-based SOPS and IRSA, you do not need a `secretRef` in the decryption configuration. The kustomize-controller uses its service account's IAM role to access KMS directly.

## Step 8: Multi-Region KMS Setup

For disaster recovery, encrypt secrets with KMS keys in multiple regions:

```yaml
# .sops.yaml
creation_rules:
  - path_regex: secrets/.*\.yaml$
    kms: >-
      arn:aws:kms:us-east-1:123456789012:key/key-id-1,
      arn:aws:kms:us-west-2:123456789012:key/key-id-2
    encrypted_regex: ^(data|stringData)$
```

Update the IAM policy to include both keys:

```bash
cat > kms-policy-multi.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "kms:Decrypt",
        "kms:DescribeKey"
      ],
      "Resource": [
        "arn:aws:kms:us-east-1:123456789012:key/key-id-1",
        "arn:aws:kms:us-west-2:123456789012:key/key-id-2"
      ]
    }
  ]
}
EOF
```

## Verifying the Setup

```bash
# Check kustomize-controller service account
kubectl get sa kustomize-controller -n flux-system -o yaml | grep eks.amazonaws.com

# Verify SOPS decryption is working
flux get kustomization secrets

# Check kustomize-controller logs for decryption activity
kubectl logs -n flux-system deployment/kustomize-controller | grep -i sops

# Verify the decrypted secret exists
kubectl get secret database-credentials -n default -o yaml
```

## Troubleshooting

If decryption fails, check these common issues:

```bash
# Verify the IAM role trust policy
aws iam get-role --role-name flux-kms-sops-role --query 'Role.AssumeRolePolicyDocument'

# Check if the service account token is being projected
kubectl get pod -n flux-system -l app=kustomize-controller -o yaml | grep -A5 serviceAccount

# Test KMS access from within the pod
kubectl exec -n flux-system deployment/kustomize-controller -- \
  aws sts get-caller-identity
```

## Conclusion

Configuring Flux with IRSA for KMS-based SOPS decryption provides a secure, fully managed approach to secrets management on EKS. By eliminating GPG keys and static credentials, you reduce the operational overhead of key management while maintaining the ability to store encrypted secrets directly in your Git repository. The IRSA integration ensures that only the kustomize-controller can decrypt secrets, with fine-grained IAM policies controlling access to specific KMS keys.
