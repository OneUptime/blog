# Configure Flux Workload Identity for Secure Git Repository Access Without Tokens

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Flux, Workload Identity, Security, AWS, Azure, GCP

Description: Learn how to use cloud workload identity federation with Flux to access Git repositories securely without storing long-lived credentials or SSH keys.

---

Traditional Git authentication uses SSH keys or personal access tokens stored as Kubernetes secrets. These credentials are long-lived, hard to rotate, and risky if compromised. Workload identity federation lets Flux authenticate using short-lived tokens tied to cloud IAM roles where the Git provider supports it. No long-lived Git secrets stored in clusters, automatic credential rotation, and full audit trails through cloud IAM.

For Flux `GitRepository` resources, native workload identity support is currently available for Azure DevOps through the `azure` provider. AWS and GCP workload identity are useful for other Flux source types such as OCI repositories and buckets, but they do not provide native secretless Git authentication for `GitRepository` resources.

## Why Workload Identity

Traditional approach problems:

- Long-lived tokens never expire
- Rotation requires manual updates
- Token compromise gives persistent access
- No centralized audit trail
- Secrets stored in cluster

Workload identity benefits where supported:

- Short-lived tokens with provider-managed lifetimes
- Automatic rotation
- Cloud IAM controls access
- Complete audit trail
- No long-lived Git secrets in cluster

## AWS: IRSA (IAM Roles for Service Accounts)

Flux can use IRSA for AWS APIs in supported source types such as OCI repositories and buckets. Flux `GitRepository` resources do not have an `aws` provider, so IRSA alone does not make CodeCommit or GitHub Git clones secretless.

### Prerequisites

- EKS cluster with OIDC provider enabled
- AWS CodeCommit repository, if you are using CodeCommit
- AWS IAM permissions to create roles and policies

### Enable OIDC Provider

```bash
# Get cluster OIDC issuer

aws eks describe-cluster \
  --name my-cluster \
  --query "cluster.identity.oidc.issuer" \
  --output text

# Enable OIDC provider (if not already enabled)
eksctl utils associate-iam-oidc-provider \
  --cluster my-cluster \
  --approve
```

### Create IAM Role for Flux

```bash
# Get OIDC provider URL
OIDC_PROVIDER=$(aws eks describe-cluster \
  --name my-cluster \
  --query "cluster.identity.oidc.issuer" \
  --output text | sed 's|https://||')

# Create trust policy
cat > trust-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::ACCOUNT_ID:oidc-provider/${OIDC_PROVIDER}"
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

# Create IAM role
aws iam create-role \
  --role-name FluxGitAccess \
  --assume-role-policy-document file://trust-policy.json
```

### Grant CodeCommit Access

For CodeCommit, grant the role read access. This is useful for AWS-aware tooling in the pod, but Flux `GitRepository` does not automatically use these IAM credentials for Git authentication:

```bash
# Create policy for CodeCommit access
cat > codecommit-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "codecommit:GitPull"
      ],
      "Resource": "arn:aws:codecommit:us-east-1:ACCOUNT_ID:my-repo"
    }
  ]
}
EOF

# Attach policy to role
aws iam put-role-policy \
  --role-name FluxGitAccess \
  --policy-name CodeCommitAccess \
  --policy-document file://codecommit-policy.json
```

### Configure Flux ServiceAccount

Annotate the source-controller service account:

```yaml
# flux-system/source-controller-sa-patch.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: source-controller
  namespace: flux-system
  annotations:
    eks.amazonaws.com/role-arn: arn:aws:iam::ACCOUNT_ID:role/FluxGitAccess
```

Apply the patch:

```bash
kubectl patch serviceaccount source-controller \
  -n flux-system \
  -p '{"metadata":{"annotations":{"eks.amazonaws.com/role-arn":"arn:aws:iam::ACCOUNT_ID:role/FluxGitAccess"}}}'

# Restart source-controller to pick up annotation
kubectl rollout restart deployment source-controller -n flux-system
```

### Configure GitRepository

For AWS CodeCommit, Flux still needs a supported Git authentication method such as HTTPS credentials in a Kubernetes secret:

```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: flux-system
  namespace: flux-system
spec:
  interval: 1m
  url: https://git-codecommit.us-east-1.amazonaws.com/v1/repos/my-repo
  ref:
    branch: main
  secretRef:
    name: codecommit-credentials
```

There is no `spec.provider: aws` for Flux `GitRepository` resources. For true secretless Flux sources on AWS, use Flux source types that support AWS workload identity, such as `OCIRepository` with Amazon ECR or `Bucket` with Amazon S3, instead of Git.

## Azure: Workload Identity

### Prerequisites

- AKS cluster with workload identity enabled
- Azure DevOps or GitHub repository
- Azure AD permissions
- Azure DevOps organization connected to Microsoft Entra ID

### Enable Workload Identity on AKS

```bash
# Create AKS cluster with workload identity
az aks create \
  --resource-group myResourceGroup \
  --name myAKSCluster \
  --enable-oidc-issuer \
  --enable-workload-identity

# Get OIDC issuer URL
az aks show \
  --resource-group myResourceGroup \
  --name myAKSCluster \
  --query "oidcIssuerProfile.issuerUrl" \
  -o tsv
```

### Create Managed Identity

```bash
# Create user-assigned managed identity
az identity create \
  --name flux-git-identity \
  --resource-group myResourceGroup

# Get identity client ID
IDENTITY_CLIENT_ID=$(az identity show \
  --name flux-git-identity \
  --resource-group myResourceGroup \
  --query clientId \
  -o tsv)

# Get identity principal ID
IDENTITY_PRINCIPAL_ID=$(az identity show \
  --name flux-git-identity \
  --resource-group myResourceGroup \
  --query principalId \
  -o tsv)
```

### Grant Repository Access

For Azure DevOps:

```bash
# Grant identity access to Azure DevOps repo
# This requires Azure DevOps REST API or portal configuration
# Navigate to Project Settings → Repositories → Security
# Add the managed identity with Read permissions
```

### Create Federated Credential

```bash
# Get AKS OIDC issuer
OIDC_ISSUER=$(az aks show \
  --resource-group myResourceGroup \
  --name myAKSCluster \
  --query "oidcIssuerProfile.issuerUrl" \
  -o tsv)

# Create federated credential
az identity federated-credential create \
  --name flux-source-controller \
  --identity-name flux-git-identity \
  --resource-group myResourceGroup \
  --issuer "${OIDC_ISSUER}" \
  --subject system:serviceaccount:flux-system:source-controller \
  --audiences api://AzureADTokenExchange
```

### Configure Flux ServiceAccount

```yaml
# flux-system/source-controller-sa-patch.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: source-controller
  namespace: flux-system
  annotations:
    azure.workload.identity/client-id: "${IDENTITY_CLIENT_ID}"
  labels:
    azure.workload.identity/use: "true"
```

Apply:

```bash
kubectl apply -f flux-system/source-controller-sa-patch.yaml

# Patch the source-controller pod template so the Azure Workload Identity
# webhook injects the projected token
kubectl patch deployment source-controller \
  -n flux-system \
  -p '{"metadata":{"labels":{"azure.workload.identity/use":"true"}},"spec":{"template":{"metadata":{"labels":{"azure.workload.identity/use":"true"}}}}}'

kubectl rollout restart deployment source-controller -n flux-system
```

### Configure GitRepository

```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: flux-system
  namespace: flux-system
spec:
  interval: 1m
  provider: azure
  url: https://dev.azure.com/organization/project/_git/repository
  ref:
    branch: main
```

With workload identity configured and `provider: azure` set, Flux uses the managed identity.

## GCP: Workload Identity

### Prerequisites

- GKE cluster
- Cloud Source Repositories, if your organization used it before June 17, 2024
- GCP IAM permissions

Flux can use GKE Workload Identity Federation for supported source types such as OCI repositories and buckets. Flux `GitRepository` resources do not have a `gcp` provider, so GKE Workload Identity Federation does not provide native secretless Git authentication for Flux.

### Enable Workload Identity on GKE

```bash
# Create cluster with workload identity
gcloud container clusters create my-cluster \
  --workload-pool=PROJECT_ID.svc.id.goog

# Or enable on existing cluster
gcloud container clusters update my-cluster \
  --workload-pool=PROJECT_ID.svc.id.goog
```

### Create Service Account

```bash
# Create GCP service account
gcloud iam service-accounts create flux-git-access \
  --display-name="Flux Git Access"

# Grant source repository reader role
gcloud projects add-iam-policy-binding PROJECT_ID \
  --member="serviceAccount:flux-git-access@PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/source.reader"
```

### Bind Kubernetes SA to GCP SA

```bash
# Allow Kubernetes service account to impersonate GCP service account
gcloud iam service-accounts add-iam-policy-binding \
  flux-git-access@PROJECT_ID.iam.gserviceaccount.com \
  --role roles/iam.workloadIdentityUser \
  --member "serviceAccount:PROJECT_ID.svc.id.goog[flux-system/source-controller]"
```

### Configure Flux ServiceAccount

```yaml
# flux-system/source-controller-sa-patch.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: source-controller
  namespace: flux-system
  annotations:
    iam.gke.io/gcp-service-account: flux-git-access@PROJECT_ID.iam.gserviceaccount.com
```

Apply:

```bash
kubectl apply -f flux-system/source-controller-sa-patch.yaml
kubectl rollout restart deployment source-controller -n flux-system
```

### Configure GitRepository

For Cloud Source Repositories, Flux still needs a supported Git authentication method. Cloud Source Repositories is also unavailable to new customers unless the organization used it before June 17, 2024:

```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: flux-system
  namespace: flux-system
spec:
  interval: 1m
  url: https://source.developers.google.com/p/PROJECT_ID/r/REPO_NAME
  ref:
    branch: main
```

This manifest is syntactically valid, but it is not secretless by itself because Flux `GitRepository` does not use the annotated GCP service account for Git authentication.

## GitHub App Authentication (All Clusters)

Flux supports GitHub App authentication through the `github` provider. This avoids personal access tokens, but it still requires storing the GitHub App private key in a Kubernetes secret.

### Create GitHub App

1. Go to GitHub Settings → Developer settings → GitHub Apps
2. Create new GitHub App
3. Repository permissions: Contents (Read-only)
4. Generate private key

### Create GitHub App Secret

Store the GitHub App credentials in the format expected by Flux:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: github-app
  namespace: flux-system
type: Opaque
stringData:
  githubAppID: "123456"
  githubAppInstallationID: "7891011"
  githubAppPrivateKey: |
    -----BEGIN RSA PRIVATE KEY-----
    ...
    -----END RSA PRIVATE KEY-----
```

Configure the `GitRepository` to use the GitHub provider:

```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: flux-system
  namespace: flux-system
spec:
  interval: 1m
  provider: github
  url: https://github.com/organization/repository
  ref:
    branch: main
  secretRef:
    name: github-app
```

This is not workload identity federation, but it is a tokenless alternative to personal access tokens.

## Verifying Configuration

Check workload identity is working:

```bash
# View service account
kubectl get sa source-controller -n flux-system -o yaml

# For Azure, check that the pod has the injected identity token
kubectl exec -n flux-system deploy/source-controller -- \
  cat /var/run/secrets/azure/tokens/azure-identity-token

# View Flux logs for authentication
kubectl logs -n flux-system deploy/source-controller -f | grep auth
```

## Troubleshooting

**AWS IRSA not working:**
- Verify OIDC provider is configured
- Check role trust policy matches service account
- Ensure pod has volume mount for token

**Azure workload identity failing:**
- Confirm federated credential subject matches
- Verify identity has repository permissions
- Check workload identity is enabled on cluster

**GCP workload identity issues:**
- Ensure workload pool is configured
- Verify IAM binding exists
- Check service account annotation is correct

## Security Best Practices

1. **Least privilege**: Grant only required permissions
2. **Scope to namespaces**: Limit which namespaces can use identity
3. **Audit access**: Monitor IAM audit logs
4. **Rotate identities**: Recreate identities periodically
5. **Separate per environment**: Different identities for dev/staging/prod
6. **Monitor failures**: Alert on authentication errors

## Conclusion

Workload identity eliminates long-lived secrets from Flux deployments where the source type and provider support it. For `GitRepository` resources, use the native Azure DevOps workload identity integration, or use GitHub App authentication when you want to avoid personal access tokens but can store an app private key. On AWS and GCP, use workload identity with Flux source types that support cloud IAM, such as OCI repositories or buckets. While initial setup is more complex than storing tokens, the security benefits are substantial when the provider integration is supported.
