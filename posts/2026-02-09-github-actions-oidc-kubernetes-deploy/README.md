# How to Deploy to Kubernetes from GitHub Actions Using OIDC Workload Identity Federation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GitHub Actions, OIDC, Kubernetes, CI/CD, Security

Description: Learn how to deploy to Kubernetes from GitHub Actions using OIDC workload identity federation for secure, keyless authentication without storing credentials.

---

Traditional GitHub Actions workflows store Kubernetes credentials as secrets. These long-lived tokens are risky: they never expire, can't be automatically rotated, and provide broad access if compromised. OIDC workload identity federation eliminates this by letting GitHub Actions authenticate using short-lived tokens tied to cloud IAM roles.

This guide shows you how to implement secure, keyless Kubernetes deployments from GitHub Actions.

## How OIDC Works with GitHub Actions

The authentication flow:

1. GitHub Actions generates a JWT token proving workflow identity
2. Workflow exchanges JWT for cloud provider credentials
3. Cloud provider validates JWT against GitHub's OIDC issuer
4. Workflow receives short-lived credentials (15-60 minutes)
5. Credentials are used to access Kubernetes

No secrets stored in GitHub. Credentials expire automatically.

## AWS EKS with OIDC

### Prerequisites

- EKS cluster
- IAM permissions
- GitHub repository

### Create IAM OIDC Provider

```bash
# Add GitHub as OIDC provider
aws iam create-open-id-connect-provider \
  --url https://token.actions.githubusercontent.com \
  --client-id-list sts.amazonaws.com \
  --thumbprint-list 6938fd4d98bab03faadb97b34396831e3780aea1
```

### Create IAM Role

```bash
# Create trust policy
cat > trust-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::ACCOUNT_ID:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
          "token.actions.githubusercontent.com:sub": "repo:YOUR_ORG/YOUR_REPO:ref:refs/heads/main"
        }
      }
    }
  ]
}
EOF

# Create role
aws iam create-role \
  --role-name GitHubActionsEKSRole \
  --assume-role-policy-document file://trust-policy.json

# Attach EKS policies
aws iam attach-role-policy \
  --role-name GitHubActionsEKSRole \
  --policy-arn arn:aws:iam::aws:policy/AmazonEKSClusterPolicy
```

### GitHub Actions Workflow

```yaml
name: Deploy to EKS
on:
  push:
    branches: [main]

permissions:
  id-token: write  # Required for OIDC
  contents: read

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::ACCOUNT_ID:role/GitHubActionsEKSRole
          aws-region: us-east-1

      - name: Update kubeconfig
        run: |
          aws eks update-kubeconfig \
            --name my-cluster \
            --region us-east-1

      - name: Deploy to Kubernetes
        run: |
          kubectl apply -f manifests/
          kubectl rollout status deployment/my-app -n production
```

## GCP GKE with Workload Identity

### Create Service Account

```bash
# Create GCP service account
gcloud iam service-accounts create github-actions-deploy \
  --display-name="GitHub Actions Deploy"

# Grant GKE developer role
gcloud projects add-iam-policy-binding PROJECT_ID \
  --member="serviceAccount:github-actions-deploy@PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/container.developer"
```

### Configure Workload Identity

```bash
# Allow GitHub Actions to impersonate service account
gcloud iam service-accounts add-iam-policy-binding \
  github-actions-deploy@PROJECT_ID.iam.gserviceaccount.com \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/github/attribute.repository/YOUR_ORG/YOUR_REPO"
```

### Create Workload Identity Pool

```bash
# Create pool
gcloud iam workload-identity-pools create github \
  --location=global \
  --display-name="GitHub Actions"

# Create provider
gcloud iam workload-identity-pools providers create-oidc github-provider \
  --location=global \
  --workload-identity-pool=github \
  --issuer-uri="https://token.actions.githubusercontent.com" \
  --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository,attribute.actor=assertion.actor" \
  --attribute-condition="assertion.repository_owner=='YOUR_ORG'"
```

### GitHub Actions Workflow

```yaml
name: Deploy to GKE
on:
  push:
    branches: [main]

permissions:
  id-token: write
  contents: read

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Authenticate to Google Cloud
        uses: google-github-actions/auth@v2
        with:
          workload_identity_provider: 'projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/github/providers/github-provider'
          service_account: 'github-actions-deploy@PROJECT_ID.iam.gserviceaccount.com'

      - name: Set up Cloud SDK
        uses: google-github-actions/setup-gcloud@v2

      - name: Get GKE credentials
        run: |
          gcloud container clusters get-credentials my-cluster \
            --region us-central1

      - name: Deploy
        run: |
          kubectl apply -f k8s/
          kubectl rollout status deployment/my-app
```

## Azure AKS with Federated Identity

### Create User-Assigned Identity

```bash
# Create identity
az identity create \
  --name github-actions-identity \
  --resource-group my-rg

# Get identity details
IDENTITY_CLIENT_ID=$(az identity show \
  --name github-actions-identity \
  --resource-group my-rg \
  --query clientId -o tsv)
```

### Configure Federated Credential

```bash
# Create federated credential
az identity federated-credential create \
  --name github-actions-federated \
  --identity-name github-actions-identity \
  --resource-group my-rg \
  --issuer "https://token.actions.githubusercontent.com" \
  --subject "repo:YOUR_ORG/YOUR_REPO:ref:refs/heads/main" \
  --audiences "api://AzureADTokenExchange"
```

### Grant AKS Permissions

```bash
# Get AKS resource ID
AKS_ID=$(az aks show \
  --name my-aks \
  --resource-group my-rg \
  --query id -o tsv)

# Assign role
az role assignment create \
  --assignee $IDENTITY_CLIENT_ID \
  --role "Azure Kubernetes Service Cluster User Role" \
  --scope $AKS_ID
```

### GitHub Actions Workflow

```yaml
name: Deploy to AKS
on:
  push:
    branches: [main]

permissions:
  id-token: write
  contents: read

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Azure Login
        uses: azure/login@v2
        with:
          client-id: ${{ secrets.AZURE_CLIENT_ID }}
          tenant-id: ${{ secrets.AZURE_TENANT_ID }}
          subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}
          enable-oidc: true

      - name: Set AKS context
        uses: azure/aks-set-context@v3
        with:
          resource-group: my-rg
          cluster-name: my-aks

      - name: Deploy
        run: |
          kubectl apply -f manifests/
          kubectl wait --for=condition=available --timeout=300s deployment/my-app
```

## Self-Hosted Kubernetes with Vault

For non-cloud Kubernetes:

### Configure Vault

```bash
# Enable JWT auth
vault auth enable jwt

# Configure GitHub OIDC
vault write auth/jwt/config \
  oidc_discovery_url="https://token.actions.githubusercontent.com" \
  bound_issuer="https://token.actions.githubusercontent.com"

# Create role
vault write auth/jwt/role/github-actions \
  role_type="jwt" \
  bound_audiences="https://github.com/YOUR_ORG" \
  bound_subject="repo:YOUR_ORG/YOUR_REPO:*" \
  user_claim="actor" \
  policies="deploy-policy" \
  ttl="15m"
```

### GitHub Actions Workflow

```yaml
name: Deploy via Vault
on:
  push:
    branches: [main]

permissions:
  id-token: write
  contents: read

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Get Vault token
        id: vault
        run: |
          GITHUB_TOKEN=$(curl -H "Authorization: bearer $ACTIONS_ID_TOKEN_REQUEST_TOKEN" \
            "$ACTIONS_ID_TOKEN_REQUEST_URL&audience=https://github.com/YOUR_ORG" | jq -r '.value')

          VAULT_TOKEN=$(vault write -field=token auth/jwt/login \
            role=github-actions \
            jwt=$GITHUB_TOKEN)

          echo "::add-mask::$VAULT_TOKEN"
          echo "token=$VAULT_TOKEN" >> $GITHUB_OUTPUT

      - name: Get kubeconfig
        env:
          VAULT_TOKEN: ${{ steps.vault.outputs.token }}
        run: |
          vault kv get -field=kubeconfig secret/kubernetes > kubeconfig
          export KUBECONFIG=./kubeconfig

      - name: Deploy
        run: kubectl apply -f k8s/
```

## Advanced: Branch and Tag Protection

Restrict credentials by branch:

```json
{
  "StringLike": {
    "token.actions.githubusercontent.com:sub": [
      "repo:org/repo:ref:refs/heads/main",
      "repo:org/repo:ref:refs/tags/*"
    ]
  }
}
```

Or by environment:

```json
{
  "StringEquals": {
    "token.actions.githubusercontent.com:sub": "repo:org/repo:environment:production"
  }
}
```

## Security Best Practices

1. **Least privilege**: Grant minimal required permissions
2. **Scope to branches**: Limit which branches can deploy
3. **Use environments**: GitHub environments add approval gates
4. **Audit deployments**: Enable cloud audit logging
5. **Rotate roles periodically**: Recreate IAM roles/identities quarterly
6. **Monitor failed authentications**: Alert on OIDC failures
7. **Document trust policies**: Keep clear records of what's allowed

## Troubleshooting

**OIDC token request fails:**
```yaml
# Ensure permissions are set
permissions:
  id-token: write
  contents: read
```

**Trust policy mismatch:**
```bash
# Check JWT claims
echo $ACTIONS_ID_TOKEN_REQUEST_TOKEN | base64 -d | jq .
```

**Kubernetes access denied:**
```bash
# Verify role has correct permissions
aws iam get-role --role-name GitHubActionsEKSRole
```

## Conclusion

OIDC workload identity federation eliminates credential management from GitHub Actions. No secrets to rotate, no long-lived tokens to secure, just short-lived credentials automatically issued based on workflow identity. The initial setup requires cloud provider configuration, but the security and operational benefits far outweigh the complexity. Implement OIDC for all production deployments to align with modern security best practices.
