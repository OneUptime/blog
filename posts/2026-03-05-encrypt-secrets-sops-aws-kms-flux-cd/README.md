# How to Encrypt Secrets with SOPS and AWS KMS for Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Secret, SOPS, AWS KMS, Encryption

Description: Learn how to encrypt Kubernetes secrets using SOPS with AWS KMS for cloud-native secret management in Flux CD GitOps workflows.

---

AWS Key Management Service (KMS) provides a centralized, managed encryption key service that integrates seamlessly with SOPS and Flux CD. Using AWS KMS for secret encryption eliminates the need to manage local encryption keys and leverages AWS IAM for access control, making it ideal for teams already running on AWS.

This guide covers setting up SOPS encryption with AWS KMS and configuring Flux CD to decrypt secrets automatically during reconciliation.

## Prerequisites

- A Kubernetes cluster with Flux CD bootstrapped (EKS recommended)
- `sops` CLI installed (v3.7+)
- `aws` CLI configured with appropriate permissions
- An AWS account with KMS access
- `kubectl` access to your cluster

## Step 1: Create an AWS KMS Key

Create a symmetric encryption key in AWS KMS that SOPS will use for encrypting and decrypting secrets.

```bash
# Create a KMS key for SOPS encryption
aws kms create-key \
  --description "SOPS encryption key for Flux CD secrets" \
  --key-usage ENCRYPT_DECRYPT \
  --key-spec SYMMETRIC_DEFAULT \
  --region us-east-1

# Note the KeyId from the output, then create an alias for easier reference
aws kms create-alias \
  --alias-name alias/flux-sops \
  --target-key-id <key-id> \
  --region us-east-1
```

## Step 2: Set Up IAM Permissions

The kustomize-controller in Flux needs permissions to decrypt using the KMS key. If running on EKS, use IAM Roles for Service Accounts (IRSA).

```bash
# Create an IAM policy for KMS decrypt access
cat > kms-decrypt-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "kms:Decrypt",
        "kms:DescribeKey"
      ],
      "Resource": "arn:aws:kms:us-east-1:123456789012:key/<key-id>"
    }
  ]
}
EOF

aws iam create-policy \
  --policy-name FluxSOPSDecrypt \
  --policy-document file://kms-decrypt-policy.json
```

## Step 3: Configure IRSA for the Kustomize Controller

Associate the IAM role with the Flux kustomize-controller service account.

```bash
# Create an IAM role and associate it with the kustomize-controller service account
eksctl create iamserviceaccount \
  --name kustomize-controller \
  --namespace flux-system \
  --cluster my-cluster \
  --attach-policy-arn arn:aws:iam::123456789012:policy/FluxSOPSDecrypt \
  --override-existing-serviceaccounts \
  --approve
```

Alternatively, if not using IRSA, you can create a Kubernetes secret with AWS credentials.

```bash
# Alternative: Store AWS credentials as a Kubernetes secret
kubectl create secret generic sops-aws \
  --namespace=flux-system \
  --from-literal=aws_access_key_id=AKIAIOSFODNN7EXAMPLE \
  --from-literal=aws_secret_access_key=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY \
  --from-literal=aws_region=us-east-1
```

## Step 4: Create and Encrypt a Secret

Create a Kubernetes secret manifest and encrypt it using SOPS with the AWS KMS key.

```yaml
# secret.yaml - Plaintext secret
apiVersion: v1
kind: Secret
metadata:
  name: aws-app-secret
  namespace: default
type: Opaque
stringData:
  api-endpoint: https://api.example.com
  api-token: tok-abc123def456
```

Encrypt the secret using the KMS key ARN.

```bash
# Encrypt using the AWS KMS key ARN
sops --encrypt \
  --kms arn:aws:kms:us-east-1:123456789012:key/<key-id> \
  --encrypted-regex '^(data|stringData)$' \
  secret.yaml > secret.enc.yaml
```

## Step 5: Configure the Flux Kustomization

Set up the Flux Kustomization to use SOPS decryption. When using IRSA, no secretRef is needed because the service account already has the required permissions.

```yaml
# clusters/my-cluster/apps-kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 10m
  path: ./apps/my-app
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  # SOPS decryption with AWS KMS via IRSA (no secretRef needed)
  decryption:
    provider: sops
```

If you are using the AWS credentials secret instead of IRSA, reference it in the Kustomization.

```yaml
# Alternative: Using AWS credentials secret
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 10m
  path: ./apps/my-app
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  decryption:
    provider: sops
    secretRef:
      name: sops-aws
```

## Step 6: Define Repository-Level SOPS Configuration

Create a `.sops.yaml` file to standardize encryption rules across your repository.

```yaml
# .sops.yaml - Repository SOPS configuration for AWS KMS
creation_rules:
  - path_regex: .*\.enc\.yaml$
    encrypted_regex: ^(data|stringData)$
    kms: arn:aws:kms:us-east-1:123456789012:key/<key-id>
```

With this file in place, encrypting becomes simpler.

```bash
# Encrypt using rules from .sops.yaml
sops --encrypt secret.yaml > secret.enc.yaml
```

## Step 7: Commit and Verify

Push the encrypted secret and verify Flux decrypts it correctly.

```bash
# Commit the encrypted secret
rm secret.yaml
git add secret.enc.yaml
git commit -m "Add AWS KMS encrypted secret"
git push

# Trigger reconciliation and check results
flux reconcile kustomization my-app --with-source
kubectl get secret aws-app-secret -n default
```

## Multi-Region KMS Configuration

For disaster recovery, you can encrypt secrets with KMS keys from multiple regions.

```bash
# Encrypt with multiple KMS keys for multi-region support
sops --encrypt \
  --kms "arn:aws:kms:us-east-1:123456789012:key/<key-id-1>,arn:aws:kms:eu-west-1:123456789012:key/<key-id-2>" \
  --encrypted-regex '^(data|stringData)$' \
  secret.yaml > secret.enc.yaml
```

## Troubleshooting

Common issues and how to resolve them.

```bash
# Check if the kustomize-controller has the correct IAM role annotation
kubectl get sa kustomize-controller -n flux-system -o yaml | grep eks.amazonaws.com

# Verify KMS key access from the controller pod
kubectl exec -n flux-system deployment/kustomize-controller -- \
  aws kms describe-key --key-id arn:aws:kms:us-east-1:123456789012:key/<key-id>

# Check controller logs for decryption errors
kubectl logs -n flux-system deployment/kustomize-controller | grep -i "kms\|decrypt\|sops"
```

Common issues include missing IAM permissions, incorrect KMS key ARN in the encrypted file, or network connectivity problems if the cluster cannot reach the KMS endpoint. Ensure VPC endpoints for KMS are configured if running in a private subnet.

AWS KMS with SOPS provides enterprise-grade secret encryption for Flux CD with the added benefits of centralized key management, audit logging via CloudTrail, and fine-grained access control through IAM policies.
