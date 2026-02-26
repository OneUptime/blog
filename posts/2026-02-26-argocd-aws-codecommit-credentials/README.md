# How to Configure Git Credentials for AWS CodeCommit in ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, AWS, CodeCommit

Description: Learn how to connect ArgoCD to AWS CodeCommit repositories using HTTPS Git credentials, SSH keys, and IAM roles for Kubernetes-native GitOps workflows.

---

AWS CodeCommit is Amazon's managed Git hosting service. While it integrates seamlessly with other AWS services, connecting it to ArgoCD requires understanding how AWS authentication works for Git operations. CodeCommit does not use standard Git username/password authentication by default, which trips up many ArgoCD users. This guide covers every method for connecting ArgoCD to CodeCommit.

## Understanding CodeCommit Authentication

CodeCommit offers three authentication methods:

```mermaid
graph TD
    A[CodeCommit Auth Methods] --> B[HTTPS Git Credentials]
    A --> C[SSH Keys]
    A --> D[AWS CLI Credential Helper]
    B --> B1[Static username/password]
    B --> B2[Created per IAM user]
    C --> C1[SSH key registered in IAM]
    D --> D1[Temporary STS credentials]
    D --> D2[IAM roles, IRSA]
```

For ArgoCD, HTTPS Git Credentials are the simplest, while IAM roles with the credential helper offer the best security on EKS.

## Method 1: HTTPS Git Credentials (Simplest)

CodeCommit allows you to generate static HTTPS credentials for IAM users. This is the easiest method to set up.

### Step 1: Create Git Credentials in IAM

```bash
# Create an IAM user for ArgoCD (if you do not have one)
aws iam create-user --user-name argocd-codecommit

# Attach the CodeCommit read-only policy
aws iam attach-user-policy \
  --user-name argocd-codecommit \
  --policy-arn arn:aws:iam::aws:policy/AWSCodeCommitReadOnly

# Generate HTTPS Git credentials
aws iam create-service-specific-credential \
  --user-name argocd-codecommit \
  --service-name codecommit.amazonaws.com
```

The output gives you a `ServiceUserName` and `ServicePassword`. Save these - the password cannot be retrieved again.

### Step 2: Configure ArgoCD

```yaml
# codecommit-https-creds.yaml
apiVersion: v1
kind: Secret
metadata:
  name: codecommit-https-creds
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repo-creds
stringData:
  type: git
  url: https://git-codecommit.us-east-1.amazonaws.com/v1/repos
  username: your-service-username-from-iam
  password: your-service-password-from-iam
```

```bash
kubectl apply -f codecommit-https-creds.yaml
```

The URL pattern for CodeCommit is region-specific:
```
https://git-codecommit.{region}.amazonaws.com/v1/repos/{repo-name}
```

If your repositories span multiple regions, create a credential template per region:

```yaml
# us-east-1
apiVersion: v1
kind: Secret
metadata:
  name: codecommit-us-east-1
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repo-creds
stringData:
  type: git
  url: https://git-codecommit.us-east-1.amazonaws.com
  username: service-username
  password: service-password
---
# eu-west-1
apiVersion: v1
kind: Secret
metadata:
  name: codecommit-eu-west-1
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repo-creds
stringData:
  type: git
  url: https://git-codecommit.eu-west-1.amazonaws.com
  username: service-username
  password: service-password
```

## Method 2: SSH Keys

SSH authentication with CodeCommit requires uploading the public key to IAM.

### Step 1: Generate and Upload the Key

```bash
# Generate an RSA key (CodeCommit requires RSA)
ssh-keygen -t rsa -b 4096 -C "argocd@company.com" -f argocd-codecommit-key -N ""

# Upload the public key to IAM
aws iam upload-ssh-public-key \
  --user-name argocd-codecommit \
  --ssh-public-key-body file://argocd-codecommit-key.pub
```

Note the `SSHPublicKeyId` from the output. This is used as the SSH username, not the IAM username.

### Step 2: Configure ArgoCD

```yaml
# codecommit-ssh-creds.yaml
apiVersion: v1
kind: Secret
metadata:
  name: codecommit-ssh-creds
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repo-creds
stringData:
  type: git
  url: ssh://git-codecommit.us-east-1.amazonaws.com/v1/repos
  sshPrivateKey: |
    -----BEGIN RSA PRIVATE KEY-----
    MIIEpAIBAAKCAQEA...
    -----END RSA PRIVATE KEY-----
```

The SSH URL format for CodeCommit is:
```
ssh://APKAEIBAERJR2EXAMPLE@git-codecommit.us-east-1.amazonaws.com/v1/repos/repo-name
```

Add the CodeCommit SSH host key:

```bash
# Get CodeCommit SSH host keys
ssh-keyscan git-codecommit.us-east-1.amazonaws.com
```

Update ArgoCD's known hosts:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-ssh-known-hosts-cm
  namespace: argocd
data:
  ssh_known_hosts: |
    git-codecommit.us-east-1.amazonaws.com ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQC...
    github.com ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOMqqnkVzrm0SdG6UOoqKLsabgH5C9okWi0dh2l9GKJl
```

## Method 3: IAM Role with Credential Helper (Best for EKS)

If ArgoCD runs on EKS, you can use IAM Roles for Service Accounts (IRSA) to authenticate with CodeCommit without static credentials.

### Step 1: Create the IAM Role

```bash
# Create an IAM policy for CodeCommit read access
cat > codecommit-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "codecommit:GitPull",
        "codecommit:GetRepository",
        "codecommit:ListRepositories"
      ],
      "Resource": "*"
    }
  ]
}
EOF

aws iam create-policy \
  --policy-name ArgoCD-CodeCommit-ReadOnly \
  --policy-document file://codecommit-policy.json

# Create the IRSA role
eksctl create iamserviceaccount \
  --name argocd-repo-server \
  --namespace argocd \
  --cluster your-eks-cluster \
  --attach-policy-arn arn:aws:iam::YOUR_ACCOUNT:policy/ArgoCD-CodeCommit-ReadOnly \
  --override-existing-serviceaccounts \
  --approve
```

### Step 2: Configure the Credential Helper

The AWS credential helper generates temporary credentials. You need to configure ArgoCD's repo-server to use it:

```yaml
# argocd-repo-server patch
apiVersion: apps/v1
kind: Deployment
metadata:
  name: argocd-repo-server
  namespace: argocd
spec:
  template:
    spec:
      serviceAccountName: argocd-repo-server
      containers:
        - name: argocd-repo-server
          env:
            - name: AWS_REGION
              value: us-east-1
          volumeMounts:
            - name: git-config
              mountPath: /home/argocd/.gitconfig
              subPath: .gitconfig
      volumes:
        - name: git-config
          configMap:
            name: argocd-git-config
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-git-config
  namespace: argocd
data:
  .gitconfig: |
    [credential "https://git-codecommit.us-east-1.amazonaws.com"]
        helper = !aws codecommit credential-helper $@
        UseHttpPath = true
```

This approach means no static credentials are stored anywhere. The credential helper uses the IRSA role to generate short-lived tokens automatically.

## Using the ArgoCD CLI

```bash
# Add a CodeCommit repo with HTTPS credentials
argocd repo add https://git-codecommit.us-east-1.amazonaws.com/v1/repos/k8s-manifests \
  --username your-service-username \
  --password your-service-password

# Add a credential template
argocd repocreds add https://git-codecommit.us-east-1.amazonaws.com \
  --username your-service-username \
  --password your-service-password

# Verify
argocd repo list
```

## Creating an Application from CodeCommit

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-service
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://git-codecommit.us-east-1.amazonaws.com/v1/repos/k8s-manifests
    targetRevision: main
    path: services/my-service
  destination:
    server: https://kubernetes.default.svc
    namespace: my-service
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
```

## Configuring Webhooks

CodeCommit supports notifications through SNS and EventBridge. To notify ArgoCD of pushes, set up an EventBridge rule that triggers a Lambda function which calls ArgoCD's webhook endpoint:

```mermaid
sequenceDiagram
    participant CC as CodeCommit
    participant EB as EventBridge
    participant Lambda as Lambda
    participant ArgoCD as ArgoCD

    CC->>EB: Push event
    EB->>Lambda: Trigger rule
    Lambda->>ArgoCD: POST /api/webhook
    ArgoCD->>CC: Pull latest changes
```

## Troubleshooting

### "Unable to negotiate key exchange" Error

CodeCommit may not support newer SSH algorithms. Ensure you are using RSA keys, not ED25519.

### "403 Forbidden" with HTTPS Credentials

Verify the IAM user has the `AWSCodeCommitReadOnly` policy attached:

```bash
aws iam list-attached-user-policies --user-name argocd-codecommit
```

### Region Mismatch

CodeCommit URLs are region-specific. A credential template for `us-east-1` will not match a repository in `eu-west-1`:

```bash
# Wrong - region mismatch
# Template: https://git-codecommit.us-east-1.amazonaws.com
# Repo:     https://git-codecommit.eu-west-1.amazonaws.com/v1/repos/my-repo

# Create templates for each region you use
```

For more on managing repository credentials in ArgoCD across multiple providers, see the [repository credentials guide](https://oneuptime.com/blog/post/2026-01-25-repository-credentials-argocd/view).
