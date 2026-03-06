# How to Configure Flux CD with AWS CodeCommit

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, AWS, CodeCommit, GitOps, Kubernetes, IAM, Git

Description: Learn how to configure Flux CD to use AWS CodeCommit as a Git source, including HTTPS with IAM credentials, SSH key authentication, and git-remote-codecommit setup.

---

AWS CodeCommit is a managed Git service that integrates natively with IAM for authentication. Configuring Flux CD to work with CodeCommit requires specific setup for authentication since CodeCommit does not support standard Git username/password or personal access tokens. This guide covers all authentication methods for integrating Flux CD with CodeCommit.

## Understanding CodeCommit Authentication Options

CodeCommit supports three authentication methods:

1. **HTTPS with Git Credentials** - IAM-generated username and password
2. **SSH with IAM-managed keys** - SSH public key uploaded to IAM
3. **HTTPS with IRSA** - Using IAM Roles for Service Accounts on EKS

## Method 1: HTTPS with IAM Git Credentials

### Step 1: Create IAM Git Credentials

```bash
# Create an IAM user for Flux (if one does not already exist)
aws iam create-user --user-name flux-codecommit

# Attach the CodeCommit policy
aws iam attach-user-policy \
  --user-name flux-codecommit \
  --policy-arn arn:aws:iam::aws:policy/AWSCodeCommitReadOnly

# Generate Git credentials for HTTPS access
aws iam create-service-specific-credential \
  --user-name flux-codecommit \
  --service-name codecommit.amazonaws.com
```

The output will contain `ServiceUserName` and `ServicePassword`. Save these values.

### Step 2: Create the Kubernetes Secret

```bash
# Create the Git credentials secret
kubectl create secret generic codecommit-credentials \
  -n flux-system \
  --from-literal=username=YOUR_SERVICE_USERNAME \
  --from-literal=password=YOUR_SERVICE_PASSWORD
```

Or as a YAML manifest:

```yaml
# codecommit-secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: codecommit-credentials
  namespace: flux-system
type: Opaque
stringData:
  username: "YOUR_SERVICE_USERNAME"
  password: "YOUR_SERVICE_PASSWORD"
```

### Step 3: Configure the GitRepository Resource

```yaml
# git-repository.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: fleet-infra
  namespace: flux-system
spec:
  interval: 1m
  url: https://git-codecommit.us-east-1.amazonaws.com/v1/repos/fleet-infra
  ref:
    branch: main
  secretRef:
    name: codecommit-credentials  # Reference the credentials secret
```

### Step 4: Apply and Verify

```bash
# Apply the resources
kubectl apply -f codecommit-secret.yaml
kubectl apply -f git-repository.yaml

# Check the GitRepository status
kubectl get gitrepository fleet-infra -n flux-system

# Describe for detailed status
kubectl describe gitrepository fleet-infra -n flux-system
```

## Method 2: SSH Authentication

### Step 1: Generate an SSH Key Pair

```bash
# Generate an SSH key pair for Flux
ssh-keygen -t rsa -b 4096 -f /tmp/flux-codecommit -N "" -C "flux-codecommit"
```

### Step 2: Upload the Public Key to IAM

```bash
# Upload the SSH public key to the IAM user
aws iam upload-ssh-public-key \
  --user-name flux-codecommit \
  --ssh-public-key-body file:///tmp/flux-codecommit.pub

# Note the SSHPublicKeyId from the output - you will need it as the SSH username
```

### Step 3: Create the Kubernetes Secret with SSH Key

```bash
# Get the CodeCommit SSH host key
ssh-keyscan -H git-codecommit.us-east-1.amazonaws.com > /tmp/known_hosts 2>/dev/null

# Create the SSH secret
kubectl create secret generic codecommit-ssh \
  -n flux-system \
  --from-file=identity=/tmp/flux-codecommit \
  --from-file=identity.pub=/tmp/flux-codecommit.pub \
  --from-file=known_hosts=/tmp/known_hosts
```

### Step 4: Configure the GitRepository with SSH

```yaml
# git-repository-ssh.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: fleet-infra
  namespace: flux-system
spec:
  interval: 1m
  # Use the SSH URL format with the IAM SSH key ID as the user
  url: ssh://YOUR_SSH_KEY_ID@git-codecommit.us-east-1.amazonaws.com/v1/repos/fleet-infra
  ref:
    branch: main
  secretRef:
    name: codecommit-ssh
```

Replace `YOUR_SSH_KEY_ID` with the `SSHPublicKeyId` returned when you uploaded the key.

## Method 3: IRSA on Amazon EKS (Recommended)

This is the most secure method as it uses no static credentials.

### Step 1: Create the IAM Policy

```bash
# Create a policy with CodeCommit read access
cat > /tmp/flux-codecommit-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "FluxCodeCommitAccess",
      "Effect": "Allow",
      "Action": [
        "codecommit:GitPull",
        "codecommit:GetRepository",
        "codecommit:GetBranch",
        "codecommit:ListBranches",
        "codecommit:GetCommit",
        "codecommit:BatchGetCommits"
      ],
      "Resource": "arn:aws:codecommit:us-east-1:123456789012:fleet-infra"
    }
  ]
}
EOF

aws iam create-policy \
  --policy-name FluxCodeCommitAccess \
  --policy-document file:///tmp/flux-codecommit-policy.json
```

### Step 2: Create the IAM Role with IRSA Trust Policy

```bash
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
OIDC_ID=$(aws eks describe-cluster \
  --name my-cluster \
  --query "cluster.identity.oidc.issuer" \
  --output text | cut -d'/' -f5)

cat > /tmp/flux-codecommit-trust.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::${ACCOUNT_ID}:oidc-provider/oidc.eks.us-east-1.amazonaws.com/id/${OIDC_ID}"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "oidc.eks.us-east-1.amazonaws.com/id/${OIDC_ID}:sub": "system:serviceaccount:flux-system:source-controller",
          "oidc.eks.us-east-1.amazonaws.com/id/${OIDC_ID}:aud": "sts.amazonaws.com"
        }
      }
    }
  ]
}
EOF

aws iam create-role \
  --role-name flux-codecommit-role \
  --assume-role-policy-document file:///tmp/flux-codecommit-trust.json

aws iam attach-role-policy \
  --role-name flux-codecommit-role \
  --policy-arn arn:aws:iam::${ACCOUNT_ID}:policy/FluxCodeCommitAccess
```

### Step 3: Annotate the Source Controller Service Account

```yaml
# clusters/production/flux-system/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - gotk-components.yaml
  - gotk-sync.yaml
patches:
  - target:
      kind: ServiceAccount
      name: source-controller
    patch: |
      apiVersion: v1
      kind: ServiceAccount
      metadata:
        name: source-controller
        annotations:
          eks.amazonaws.com/role-arn: arn:aws:iam::123456789012:role/flux-codecommit-role
```

### Step 4: Configure the GitRepository for IRSA

```yaml
# git-repository-irsa.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: fleet-infra
  namespace: flux-system
spec:
  interval: 1m
  url: https://git-codecommit.us-east-1.amazonaws.com/v1/repos/fleet-infra
  ref:
    branch: main
  provider: aws  # Tells Flux to use IRSA/AWS credentials
```

## Bootstrapping Flux Directly with CodeCommit

You can bootstrap Flux directly to a CodeCommit repository:

```bash
# Bootstrap with HTTPS credentials
flux bootstrap git \
  --url=https://git-codecommit.us-east-1.amazonaws.com/v1/repos/fleet-infra \
  --branch=main \
  --path=clusters/production \
  --username=YOUR_SERVICE_USERNAME \
  --password=YOUR_SERVICE_PASSWORD

# Bootstrap with SSH
flux bootstrap git \
  --url=ssh://YOUR_SSH_KEY_ID@git-codecommit.us-east-1.amazonaws.com/v1/repos/fleet-infra \
  --branch=main \
  --path=clusters/production \
  --private-key-file=/tmp/flux-codecommit
```

## Troubleshooting CodeCommit Integration

### Common errors and solutions:

```bash
# Check GitRepository status
kubectl describe gitrepository fleet-infra -n flux-system

# Check source-controller logs for auth errors
kubectl logs -n flux-system deployment/source-controller --tail=50 \
  | grep -i "codecommit\|auth\|credential\|403\|401"
```

### Error: "unable to clone: authentication required"

```bash
# Verify the secret exists and has the correct keys
kubectl get secret codecommit-credentials -n flux-system -o json \
  | jq '.data | keys'

# For HTTPS, ensure username and password keys are present
# For SSH, ensure identity, identity.pub, and known_hosts keys are present
```

### Error: "unable to clone: remote repository is empty"

```bash
# CodeCommit requires at least one commit. Initialize the repo:
git clone https://git-codecommit.us-east-1.amazonaws.com/v1/repos/fleet-infra
cd fleet-infra
echo "# Fleet Infrastructure" > README.md
git add .
git commit -m "Initial commit"
git push origin main
```

### Error: "dial tcp: lookup git-codecommit.us-east-1.amazonaws.com: no such host"

```bash
# Verify DNS resolution from inside the cluster
kubectl run dns-test --rm -it --restart=Never \
  -n flux-system --image=busybox:1.36 \
  -- nslookup git-codecommit.us-east-1.amazonaws.com

# Check if VPC endpoints are needed for private clusters
aws ec2 describe-vpc-endpoints --filters "Name=service-name,Values=com.amazonaws.us-east-1.codecommit"
```

## Setting Up Notifications for CodeCommit Events

```yaml
# codecommit-receiver.yaml - Receive webhook events from CodeCommit via SNS
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Receiver
metadata:
  name: codecommit-receiver
  namespace: flux-system
spec:
  type: generic
  secretRef:
    name: receiver-token
  resources:
    - kind: GitRepository
      name: fleet-infra
```

```bash
# Create the receiver token secret
kubectl create secret generic receiver-token \
  -n flux-system \
  --from-literal=token=$(head -c 32 /dev/urandom | base64)

# Get the receiver webhook URL
kubectl get receiver codecommit-receiver -n flux-system \
  -o jsonpath='{.status.webhookPath}'
```

## Summary

Flux CD integrates with AWS CodeCommit through three authentication methods: HTTPS with IAM Git credentials, SSH with IAM-managed keys, and IRSA on EKS. IRSA is the recommended approach for EKS environments as it eliminates static credentials entirely. Whichever method you choose, ensure the IAM permissions include at minimum `codecommit:GitPull` access to your repository, and verify connectivity from the source-controller pod to the CodeCommit endpoint.
