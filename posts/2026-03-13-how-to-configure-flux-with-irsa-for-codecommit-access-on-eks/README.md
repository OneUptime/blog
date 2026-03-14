# How to Configure Flux with IRSA for CodeCommit Access on EKS

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, AWS, EKS, IRSA, CodeCommit

Description: Learn how to configure Flux to access AWS CodeCommit repositories using IRSA on EKS, enabling GitOps workflows without static Git credentials.

---

## Why CodeCommit with IRSA

AWS CodeCommit is a fully managed Git repository service that integrates natively with IAM for access control. By using IRSA, Flux can access CodeCommit repositories without SSH keys or HTTPS credentials, leveraging the EKS OIDC provider for secure, automatic authentication.

## Prerequisites

- An EKS cluster with the OIDC provider enabled
- Flux installed on the EKS cluster
- An AWS CodeCommit repository
- AWS CLI and eksctl installed

## Step 1: Create the CodeCommit Repository

If you do not already have a CodeCommit repository, create one:

```bash
aws codecommit create-repository \
  --repository-name flux-repo \
  --repository-description "Flux GitOps repository"

# Get the clone URL
REPO_URL=$(aws codecommit get-repository \
  --repository-name flux-repo \
  --query 'repositoryMetadata.cloneUrlHttp' \
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
```

## Step 3: Create the IAM Role

Create an IAM role for the Flux source-controller:

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
          "${OIDC_PROVIDER}:sub": "system:serviceaccount:flux-system:source-controller",
          "${OIDC_PROVIDER}:aud": "sts.amazonaws.com"
        }
      }
    }
  ]
}
EOF

aws iam create-role \
  --role-name flux-codecommit-role \
  --assume-role-policy-document file://trust-policy.json

aws iam attach-role-policy \
  --role-name flux-codecommit-role \
  --policy-arn "arn:aws:iam::${ACCOUNT_ID}:policy/FluxCodeCommitAccess"
```

## Step 4: Annotate the Source Controller Service Account

Patch the Flux source-controller service account:

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
      name: source-controller
      namespace: flux-system
    patch: |
      apiVersion: v1
      kind: ServiceAccount
      metadata:
        name: source-controller
        namespace: flux-system
        annotations:
          eks.amazonaws.com/role-arn: arn:aws:iam::123456789012:role/flux-codecommit-role
```

## Step 5: Configure the Git Repository Source

Configure Flux to use the CodeCommit repository with the AWS provider:

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
  url: https://git-codecommit.us-east-1.amazonaws.com/v1/repos/flux-repo
  provider: aws
```

The `provider: aws` field tells Flux to use IRSA-based authentication instead of SSH keys or HTTPS credentials.

## Step 6: Bootstrap Flux with CodeCommit

If you are bootstrapping Flux with CodeCommit from scratch:

```bash
flux bootstrap git \
  --url=https://git-codecommit.us-east-1.amazonaws.com/v1/repos/flux-repo \
  --branch=main \
  --path=clusters/production \
  --provider=aws
```

## Step 7: Image Automation with CodeCommit

If you use Flux image automation that pushes back to CodeCommit, the source-controller needs write access:

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
  url: https://git-codecommit.us-east-1.amazonaws.com/v1/repos/app-config
  provider: aws
```

## Verifying the Setup

```bash
# Check the source-controller service account
kubectl get sa source-controller -n flux-system -o yaml | grep eks.amazonaws.com

# Verify Git repository source is syncing
flux get sources git flux-system

# Check source-controller logs for CodeCommit access
kubectl logs -n flux-system deployment/source-controller | grep -i codecommit

# Verify kustomizations are reconciling
flux get kustomizations
```

## Conclusion

Configuring Flux with IRSA for CodeCommit access on EKS provides a secure, native AWS integration for GitOps workflows. By using the `provider: aws` configuration, Flux authenticates to CodeCommit through the EKS OIDC provider, eliminating the need for SSH keys or HTTPS Git credentials. This approach integrates seamlessly with AWS IAM policies, allowing fine-grained access control to specific repositories and branches.
