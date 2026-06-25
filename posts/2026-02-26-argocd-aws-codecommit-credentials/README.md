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

For ArgoCD, HTTPS Git Credentials are the simplest to set up. On EKS, IAM Roles for Service Accounts (IRSA) avoid static secrets, but ArgoCD does not authenticate to Git through the system credential helper the way a normal shell does, so IRSA needs extra wiring to work (explained in Method 3).

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
```text
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
  url: ssh://APKAEIBAERJR2EXAMPLE@git-codecommit.us-east-1.amazonaws.com/v1/repos
  sshPrivateKey: |
    -----BEGIN OPENSSH PRIVATE KEY-----
    b3BlbnNzaC1rZXktdjE...
    -----END OPENSSH PRIVATE KEY-----
```

The SSH URL format for CodeCommit is:
```text
ssh://APKAEIBAERJR2EXAMPLE@git-codecommit.us-east-1.amazonaws.com/v1/repos/repo-name
```

Use the `SSHPublicKeyId` from IAM in both the repository URL and the credential template URL so ArgoCD's prefix matching can find the credentials.

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
  labels:
    app.kubernetes.io/part-of: argocd
data:
  ssh_known_hosts: |
    git-codecommit.us-east-1.amazonaws.com ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQC...
    github.com ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOMqqnkVzrm0SdG6UOoqKLsabgH5C9okWi0dh2l9GKJl
```

## Method 3: IAM Roles for Service Accounts (IRSA)

If ArgoCD runs on EKS, you can use IAM Roles for Service Accounts (IRSA) to authenticate with CodeCommit without storing static credentials. This is attractive for security, but it needs more care than the other methods - and it is important to understand why a Git credential helper alone is usually not enough.

### How ArgoCD Authenticates to Git (Read This First)

ArgoCD's repo-server does not authenticate Git the way your interactive shell does. Two behaviors trip people up:

- **ArgoCD runs Git with `HOME=/dev/null`.** A per-user config such as `/home/argocd/.gitconfig` (`~/.gitconfig`) is therefore never read. ArgoCD's documentation states this directly: "Argo CD runs Git with the HOME environment variable set to /dev/null. As a result, global Git configuration is not supported." Only system Git configuration at `/etc/gitconfig` is honored.
- **ArgoCD injects credentials through `GIT_ASKPASS`, not through a `credential.helper`.** When a repository matches a `repo` or `repo-creds` Secret, ArgoCD hands the username and password to Git through its built-in askpass helper. When no Secret matches the repository URL, ArgoCD provides no credentials at all - and because `GIT_TERMINAL_PROMPT` is disabled, Git fails immediately. CodeCommit answers an unauthenticated request with `authentication required ... SPNEGO token required`.

Git does consult `credential.helper` entries before falling back to askpass, so a helper placed in `/etc/gitconfig` can still run - but only for a repository that has no matching `repo-creds` Secret (otherwise askpass supplies the credentials first and the helper is never reached). This is the narrow window the credential-helper approach depends on, and it is not an officially supported ArgoCD feature. For a reliable IRSA setup, prefer the credential-refresh CronJob in Method 4.

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

# Attach the IRSA role to the repo-server service account.
# Use the service account name your repo-server deployment actually runs as
# (the default for the official manifests/Helm chart is argocd-repo-server).
eksctl create iamserviceaccount \
  --name argocd-repo-server \
  --namespace argocd \
  --cluster your-eks-cluster \
  --attach-policy-arn arn:aws:iam::YOUR_ACCOUNT:policy/ArgoCD-CodeCommit-ReadOnly \
  --override-existing-serviceaccounts \
  --approve
```

### Step 2: Configure the Credential Helper as System Git Config

Because ArgoCD runs Git with `HOME=/dev/null`, the helper must be mounted as the system config at `/etc/gitconfig` - not at `/home/argocd/.gitconfig`. The repo-server container must also have the AWS CLI available, either through a custom ArgoCD image or by copying the binary in with an init container; the stock `argocd-repo-server` image does not include `aws`, and `helper = !aws codecommit credential-helper $@` fails silently without it.

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
              mountPath: /etc/gitconfig
              subPath: gitconfig
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
  gitconfig: |
    [credential "https://git-codecommit.us-east-1.amazonaws.com"]
        helper = !aws codecommit credential-helper $@
        UseHttpPath = true
```

For this to work end to end, all of the following must hold:

- The `aws` CLI is present on the repo-server `PATH` (custom image or init-container copy).
- The repo-server service account has the IRSA role from Step 1 with `codecommit:GitPull`, and the pod has the `AWS_ROLE_ARN` / `AWS_WEB_IDENTITY_TOKEN_FILE` environment that IRSA injects.
- You do **not** also create a `repo` or `repo-creds` Secret for that CodeCommit URL. If a Secret matches, ArgoCD authenticates through askpass and the `/etc/gitconfig` helper is never consulted.

This approach stores no static credentials, but note the caveats: it is undocumented and unsupported upstream (it relies on ArgoCD falling through to "no credentials" for unmatched repositories, an implementation detail that can change between versions), and CodeCommit credential-helper tokens are short-lived (about 15 minutes). The helper re-mints a token on each fetch, so on-demand fetches are usually fine, but this is a fragility. If you want a supported, robust IRSA setup, use Method 4 instead.

## Method 4: IRSA with a Credential-Refresh CronJob (Recommended for EKS)

This pattern uses IRSA without depending on ArgoCD's credential-helper behavior. A small CronJob assumes the IAM role, mints short-lived CodeCommit HTTPS credentials with the AWS credential helper, and writes them into a standard `repo-creds` Secret. ArgoCD then authenticates through its normal, fully supported askpass path. Because CodeCommit helper passwords expire after about 15 minutes, the job refreshes them every 10 minutes.

### Step 1: IAM Role and RBAC

Create an IRSA role (as in Method 3, Step 1) bound to a dedicated service account - for example `codecommit-creds-refresh` in the `argocd` namespace - with `codecommit:GitPull`. Then allow that service account to manage the credential Secret:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: codecommit-creds-refresh
  namespace: argocd
rules:
  - apiGroups: [""]
    resources: ["secrets"]
    verbs: ["get", "create", "update", "patch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: codecommit-creds-refresh
  namespace: argocd
subjects:
  - kind: ServiceAccount
    name: codecommit-creds-refresh
    namespace: argocd
roleRef:
  kind: Role
  name: codecommit-creds-refresh
  apiGroup: rbac.authorization.k8s.io
```

### Step 2: The Refresh CronJob

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: codecommit-creds-refresh
  namespace: argocd
spec:
  schedule: "*/10 * * * *"
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: codecommit-creds-refresh
          restartPolicy: OnFailure
          containers:
            # Use an image that contains both the aws CLI and kubectl.
            - name: refresh
              image: your-registry/aws-kubectl:latest
              env:
                - name: AWS_REGION
                  value: us-east-1
                - name: CODECOMMIT_HOST
                  value: git-codecommit.us-east-1.amazonaws.com
                - name: REPO_URL
                  value: https://git-codecommit.us-east-1.amazonaws.com
              command:
                - /bin/sh
                - -c
                - |
                  set -euo pipefail
                  CREDS=$(printf 'protocol=https\nhost=%s\npath=/v1/repos\n' "$CODECOMMIT_HOST" \
                    | aws codecommit credential-helper get)
                  USERNAME=$(printf '%s\n' "$CREDS" | sed -n 's/^username=//p')
                  PASSWORD=$(printf '%s\n' "$CREDS" | sed -n 's/^password=//p')
                  kubectl create secret generic codecommit-repo-creds \
                    --namespace argocd \
                    --from-literal=type=git \
                    --from-literal=url="$REPO_URL" \
                    --from-literal=username="$USERNAME" \
                    --from-literal=password="$PASSWORD" \
                    --dry-run=client -o yaml \
                    | kubectl label --local -f - argocd.argoproj.io/secret-type=repo-creds -o yaml \
                    | kubectl apply -f -
```

ArgoCD re-reads `repo` and `repo-creds` Secrets when they change, so each sync picks up freshly minted credentials and authenticates through its standard mechanism. No static long-lived secrets are stored, and the setup does not rely on any undocumented behavior.

If you are on the AWS-managed EKS ArgoCD capability (add-on), it provides native IRSA-based CodeCommit access through a capability role - check the [Amazon EKS documentation](https://docs.aws.amazon.com/eks/latest/userguide/argocd-considerations.html) for the managed option.

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

### "SPNEGO token required" / "authentication required" with IRSA

If ArgoCD fails with `failed to list refs: authentication required: ... NotAuthorizedException ... SPNEGO token required` even though `aws codecommit credential-helper` and `git ls-remote` work when you run them manually inside the repo-server container, ArgoCD is sending no credentials at all. This is the expected outcome when the credential helper is not actually reachable by ArgoCD's Git invocation. Work through this checklist:

- **Mount path.** The helper must be at `/etc/gitconfig`, not `/home/argocd/.gitconfig`. ArgoCD runs Git with `HOME=/dev/null`, so the per-user config is ignored. Verify it is loaded:

  ```bash
  kubectl exec -n argocd deployment/argocd-repo-server -- git config --system --get-all credential.helper
  ```

- **AWS CLI present.** Confirm `aws` is on the repo-server `PATH` (`kubectl exec ... which aws`); the stock image does not include it.
- **IRSA injected.** Check the pod has `AWS_ROLE_ARN` and `AWS_WEB_IDENTITY_TOKEN_FILE` set and the role grants `codecommit:GitPull`.
- **No conflicting Secret.** If a `repo` or `repo-creds` Secret matches the CodeCommit URL, ArgoCD authenticates through askpass and never calls the helper. Either remove it, or switch to the Method 4 CronJob pattern, which is the recommended IRSA approach.

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
