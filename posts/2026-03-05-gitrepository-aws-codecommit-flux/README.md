# How to Configure GitRepository with AWS CodeCommit in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, AWS, CodeCommit, EKS

Description: Learn how to configure Flux CD GitRepository resources to pull Kubernetes manifests from AWS CodeCommit using HTTPS, SSH, and IAM-based authentication.

---

AWS CodeCommit is a managed Git hosting service that integrates tightly with AWS IAM for access control. Flux CD can connect to CodeCommit repositories through the GitRepository custom resource using HTTPS with Git credentials, SSH keys, or IAM roles on EKS. This guide covers all three methods with step-by-step instructions.

## Prerequisites

- A Kubernetes cluster with Flux CD installed (EKS or any other provider)
- An AWS account with CodeCommit repositories
- `aws` CLI installed and configured
- `kubectl` and `flux` CLI tools installed

## Understanding CodeCommit URLs

AWS CodeCommit repositories are accessed through region-specific URLs.

CodeCommit URL formats:

```bash
# HTTPS format
https://git-codecommit.{region}.amazonaws.com/v1/repos/{repo-name}

# SSH format
ssh://git-codecommit.{region}.amazonaws.com/v1/repos/{repo-name}

# HTTPS (GRC) format for IAM-based auth
codecommit::{region}://{repo-name}
```

Flux uses the standard HTTPS and SSH formats. The GRC (git-remote-codecommit) format is not supported directly.

## Step 1: Configure HTTPS with Git Credentials

The simplest method is to generate HTTPS Git credentials for an IAM user. These are static username/password pairs specific to CodeCommit.

Generate Git credentials in the AWS Console or CLI:

```bash
# Create an IAM user for Flux (if one does not exist)
aws iam create-user --user-name flux-codecommit

# Attach the CodeCommit read-only policy
aws iam attach-user-policy \
  --user-name flux-codecommit \
  --policy-arn arn:aws:iam::aws:policy/AWSCodeCommitReadOnly

# Generate HTTPS Git credentials for CodeCommit
aws iam create-service-specific-credential \
  --user-name flux-codecommit \
  --service-name codecommit.amazonaws.com
```

The command outputs a `ServiceUserName` and `ServicePassword`. Use these to create the Kubernetes secret.

Create the HTTPS credentials secret:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: codecommit-https
  namespace: flux-system
type: Opaque
stringData:
  # Use the ServiceUserName from the create-service-specific-credential output
  username: flux-codecommit-at-123456789012
  # Use the ServicePassword from the same output
  password: your-generated-service-password
```

## Step 2: Create the GitRepository Resource (HTTPS)

Point the GitRepository to your CodeCommit repository using the HTTPS URL.

GitRepository configuration for CodeCommit over HTTPS:

```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: codecommit-repo
  namespace: flux-system
spec:
  interval: 5m
  url: https://git-codecommit.us-east-1.amazonaws.com/v1/repos/my-k8s-config
  ref:
    branch: main
  secretRef:
    # References the CodeCommit Git credentials
    name: codecommit-https
  timeout: 60s
```

Apply the resources:

```bash
kubectl apply -f codecommit-secret.yaml
kubectl apply -f gitrepository.yaml
```

## Step 3: Configure SSH Authentication

SSH provides an alternative that does not require rotating Git credentials. Upload an SSH public key to your IAM user.

Generate and upload an SSH key:

```bash
# Generate an RSA key pair (CodeCommit supports RSA)
ssh-keygen -t rsa -b 4096 -f codecommit-flux-key -N "" -C "flux@cluster"

# Upload the public key to the IAM user
aws iam upload-ssh-public-key \
  --user-name flux-codecommit \
  --ssh-public-key-body file://codecommit-flux-key.pub

# Note the SSHPublicKeyId from the output -- this becomes the SSH username
```

Scan the CodeCommit SSH host key and create the secret:

```bash
# Scan the CodeCommit SSH host key
ssh-keyscan git-codecommit.us-east-1.amazonaws.com > known_hosts

# Create the Kubernetes secret
kubectl create secret generic codecommit-ssh \
  --from-file=identity=./codecommit-flux-key \
  --from-file=known_hosts=./known_hosts \
  --namespace=flux-system
```

Important: For CodeCommit SSH, the username in the SSH URL is the `SSHPublicKeyId`, not a regular username.

## Step 4: Create the GitRepository Resource (SSH)

Configure the GitRepository with the SSH URL for CodeCommit.

GitRepository configuration for CodeCommit over SSH:

```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: codecommit-repo-ssh
  namespace: flux-system
spec:
  interval: 5m
  # The SSH URL for CodeCommit
  url: ssh://git-codecommit.us-east-1.amazonaws.com/v1/repos/my-k8s-config
  ref:
    branch: main
  secretRef:
    name: codecommit-ssh
```

## Step 5: Use IAM Roles for Service Accounts (IRSA) on EKS

On EKS clusters, you can use IAM Roles for Service Accounts to authenticate to CodeCommit without managing credentials. This is the most secure approach for EKS.

Set up IRSA for the Flux source-controller:

```bash
# Create an IAM policy for CodeCommit read access
cat > codecommit-policy.json << 'POLICY'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "codecommit:GitPull",
        "codecommit:GetRepository",
        "codecommit:GetBranch"
      ],
      "Resource": "arn:aws:codecommit:us-east-1:123456789012:my-k8s-config"
    }
  ]
}
POLICY

aws iam create-policy \
  --policy-name FluxCodeCommitReadOnly \
  --policy-document file://codecommit-policy.json

# Create the IRSA association using eksctl
eksctl create iamserviceaccount \
  --name source-controller \
  --namespace flux-system \
  --cluster my-eks-cluster \
  --attach-policy-arn arn:aws:iam::123456789012:policy/FluxCodeCommitReadOnly \
  --override-existing-serviceaccounts \
  --approve
```

Then configure the GitRepository to use AWS-native authentication:

```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: codecommit-irsa
  namespace: flux-system
spec:
  interval: 10m
  url: https://git-codecommit.us-east-1.amazonaws.com/v1/repos/my-k8s-config
  ref:
    branch: main
  # Use AWS-native authentication via IRSA
  provider: aws
```

The `provider: aws` field instructs Flux to use the IAM role attached to the source-controller service account for authentication.

## Step 6: Working with Multiple Regions

If your CodeCommit repositories span multiple AWS regions, create separate GitRepository resources with the appropriate regional URLs.

GitRepositories across AWS regions:

```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: us-east-config
  namespace: flux-system
spec:
  interval: 10m
  url: https://git-codecommit.us-east-1.amazonaws.com/v1/repos/k8s-config
  ref:
    branch: main
  secretRef:
    name: codecommit-https
---
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: eu-west-config
  namespace: flux-system
spec:
  interval: 10m
  url: https://git-codecommit.eu-west-1.amazonaws.com/v1/repos/k8s-config
  ref:
    branch: main
  secretRef:
    # Same credentials work across regions
    name: codecommit-https
```

## Verifying the Configuration

Confirm Flux can successfully pull from CodeCommit.

Check the reconciliation status:

```bash
# List all Git sources
flux get sources git

# Describe a specific source for detailed status
kubectl describe gitrepository codecommit-repo -n flux-system
```

## Troubleshooting

**403 Forbidden (HTTPS):** The Git credentials may have expired or the IAM user may lack the `AWSCodeCommitReadOnly` policy. Verify permissions with `aws iam list-attached-user-policies --user-name flux-codecommit`.

**SSH authentication failure:** Ensure the SSH public key ID (not the key fingerprint) is being used. CodeCommit SSH requires the `SSHPublicKeyId` returned by `upload-ssh-public-key`.

**Repository not found:** CodeCommit repository names are case-sensitive. Verify the exact name with `aws codecommit list-repositories`.

**IRSA not working:** Check that the source-controller pod has the `eks.amazonaws.com/role-arn` annotation on its service account. Restart the source-controller pod after configuring IRSA.

**Timeout errors:** CodeCommit may be slow for large repositories. Increase the `timeout` field in the GitRepository spec to 120s or higher.

## Summary

AWS CodeCommit integrates with Flux CD through standard HTTPS and SSH Git protocols. For non-EKS clusters, HTTPS with IAM-generated Git credentials is the simplest path. For EKS environments, IAM Roles for Service Accounts (IRSA) with `provider: aws` provides the most secure, credential-free setup. Remember to use the region-specific URLs and the correct authentication format for each method.
