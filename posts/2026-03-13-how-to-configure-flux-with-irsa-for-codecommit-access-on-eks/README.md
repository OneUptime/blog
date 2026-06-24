# How to Configure Flux with IRSA for CodeCommit Access on EKS

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, AWS, EKS, IRSA, CodeCommit

Description: Learn how to configure Flux to access AWS CodeCommit repositories using IRSA on EKS, enabling GitOps workflows without static Git credentials.

---

## Why CodeCommit with Flux

AWS CodeCommit is a fully managed Git repository service that integrates natively with IAM for access control. Flux can access CodeCommit repositories over SSH by using an IAM user SSH key ID as the SSH username and a Kubernetes Secret containing the private key.

## Prerequisites

- An EKS cluster
- Flux installed on the EKS cluster
- An AWS CodeCommit repository
- AWS CLI and Flux CLI installed

## Step 1: Create the CodeCommit Repository

If you do not already have a CodeCommit repository, create one:

```bash
aws codecommit create-repository \
  --repository-name flux-repo \
  --repository-description "Flux GitOps repository"

# Get the clone URL

REPO_URL=$(aws codecommit get-repository \
  --repository-name flux-repo \
  --query 'repositoryMetadata.cloneUrlSsh' \
  --output text)

echo "Repository URL: $REPO_URL"
```

## Step 2: Create the IAM Policy

Create an IAM policy that grants Flux access to CodeCommit:

```bash
cat > codecommit-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "codecommit:GitPull",
        "codecommit:GetRepository",
        "codecommit:GetBranch",
        "codecommit:ListBranches",
        "codecommit:GetCommit",
        "codecommit:BatchGetCommits"
      ],
      "Resource": "arn:aws:codecommit:us-east-1:123456789012:flux-repo"
    }
  ]
}
EOF

aws iam create-policy \
  --policy-name FluxCodeCommitAccess \
  --policy-document file://codecommit-policy.json
```

For write access (needed if Flux image automation commits back to the repo):

```bash
cat > codecommit-write-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "codecommit:GitPull",
        "codecommit:GitPush",
        "codecommit:GetRepository",
        "codecommit:GetBranch",
        "codecommit:ListBranches",
        "codecommit:CreateBranch",
        "codecommit:GetCommit",
        "codecommit:BatchGetCommits",
        "codecommit:CreateCommit",
        "codecommit:GetDifferences"
      ],
      "Resource": "arn:aws:codecommit:us-east-1:123456789012:flux-repo"
    }
  ]
}
EOF

aws iam create-policy \
  --policy-name FluxCodeCommitWriteAccess \
  --policy-document file://codecommit-write-policy.json
```

## Step 3: Create the IAM User SSH Key

Create or choose an IAM user that Flux will use for CodeCommit SSH access, then attach the policy:

```bash
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
CODECOMMIT_USER=flux-codecommit-user

aws iam create-user --user-name "$CODECOMMIT_USER"

aws iam attach-user-policy \
  --user-name "$CODECOMMIT_USER" \
  --policy-arn "arn:aws:iam::${ACCOUNT_ID}:policy/FluxCodeCommitAccess"
```

Generate an SSH key pair and upload the public key to the IAM user:

```bash
ssh-keygen -t rsa -b 4096 -m PEM -f ./codecommit_rsa

SSH_KEY_ID=$(aws iam upload-ssh-public-key \
  --user-name "$CODECOMMIT_USER" \
  --ssh-public-key-body file://codecommit_rsa.pub \
  --query 'SSHPublicKey.SSHPublicKeyId' \
  --output text)

echo "SSH key ID: $SSH_KEY_ID"
```

The SSH key ID is used as the SSH username for CodeCommit.

## Step 4: Create the Git Authentication Secret

Create a Kubernetes Secret for Flux that contains the CodeCommit SSH private key:

```bash
flux create secret git codecommit-auth \
  --namespace=flux-system \
  --url=ssh://${SSH_KEY_ID}@git-codecommit.us-east-1.amazonaws.com/v1/repos/flux-repo \
  --private-key-file=./codecommit_rsa
```

If your private key has a passphrase, add the `--password` flag:

```bash
flux create secret git codecommit-auth \
  --namespace=flux-system \
  --url=ssh://${SSH_KEY_ID}@git-codecommit.us-east-1.amazonaws.com/v1/repos/flux-repo \
  --private-key-file=./codecommit_rsa \
  --password='<key-passphrase>'
```

## Step 5: Configure the Git Repository Source

Configure Flux to use the CodeCommit repository over SSH:

```yaml
# clusters/production/flux-system/gotk-sync.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: flux-system
  namespace: flux-system
spec:
  interval: 1m
  ref:
    branch: main
  url: ssh://<SSH-Key-ID>@git-codecommit.us-east-1.amazonaws.com/v1/repos/flux-repo
  secretRef:
    name: codecommit-auth
```

The `secretRef` field tells Flux to use the SSH private key stored in the Kubernetes Secret.

## Step 6: Bootstrap Flux with CodeCommit

If you are bootstrapping Flux with CodeCommit from scratch:

```bash
flux bootstrap git \
  --url=ssh://${SSH_KEY_ID}@git-codecommit.us-east-1.amazonaws.com/v1/repos/flux-repo \
  --branch=main \
  --path=clusters/production \
  --private-key-file=./codecommit_rsa
```

If the key has a passphrase, include it with `--password`:

```bash
flux bootstrap git \
  --url=ssh://${SSH_KEY_ID}@git-codecommit.us-east-1.amazonaws.com/v1/repos/flux-repo \
  --branch=main \
  --path=clusters/production \
  --private-key-file=./codecommit_rsa \
  --password='<key-passphrase>'
```

## Step 7: Image Automation with CodeCommit

If you use Flux image automation that pushes back to CodeCommit, the IAM user used by the GitRepository needs write access:

```yaml
# clusters/production/image-update.yaml
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImageUpdateAutomation
metadata:
  name: flux-system
  namespace: flux-system
spec:
  interval: 5m
  sourceRef:
    kind: GitRepository
    name: flux-system
  git:
    checkout:
      ref:
        branch: main
    commit:
      author:
        name: flux-bot
        email: flux@example.com
      messageTemplate: "chore: update images"
    push:
      branch: main
  update:
    path: ./apps
    strategy: Setters
```

## Multi-Repository Setup

To access multiple CodeCommit repositories, update the IAM policy:

```bash
cat > codecommit-multi-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "codecommit:GitPull",
        "codecommit:GetRepository",
        "codecommit:GetBranch",
        "codecommit:GetCommit"
      ],
      "Resource": [
        "arn:aws:codecommit:us-east-1:123456789012:flux-repo",
        "arn:aws:codecommit:us-east-1:123456789012:app-config",
        "arn:aws:codecommit:us-east-1:123456789012:helm-charts"
      ]
    }
  ]
}
EOF
```

Then define additional Git repository sources:

```yaml
# clusters/production/app-config-source.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: app-config
  namespace: flux-system
spec:
  interval: 5m
  ref:
    branch: main
  url: ssh://<SSH-Key-ID>@git-codecommit.us-east-1.amazonaws.com/v1/repos/app-config
  secretRef:
    name: codecommit-auth
```

## Verifying the Setup

```bash
# Check the Git authentication secret
kubectl get secret codecommit-auth -n flux-system

# Verify Git repository source is syncing
flux get sources git flux-system

# Check source-controller logs for CodeCommit access
kubectl logs -n flux-system deployment/source-controller | grep -i codecommit

# Verify kustomizations are reconciling
flux get kustomizations
```

## Conclusion

Configuring Flux with CodeCommit access on EKS provides a secure AWS integration for GitOps workflows. By using SSH authentication with CodeCommit, Flux can authenticate to the repository without embedding HTTPS Git credentials in manifests. This approach integrates with AWS IAM policies, allowing fine-grained access control to specific repositories and branches.
