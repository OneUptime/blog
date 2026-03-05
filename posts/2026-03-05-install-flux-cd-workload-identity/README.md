# How to Install Flux CD with Workload Identity

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Workload Identity, AWS IRSA, GCP Workload Identity, Azure Workload Identity, Cloud Security

Description: Learn how to install Flux CD using cloud-native workload identity federation on AWS, GCP, and Azure to eliminate long-lived credentials for accessing container registries and cloud services.

---

Workload identity allows Kubernetes pods to authenticate with cloud services without storing long-lived credentials like access keys or service account JSON files. Instead, pods receive short-lived tokens through identity federation. Flux CD supports workload identity on all major cloud providers, enabling its controllers to pull OCI artifacts from private container registries, access cloud-hosted Git repositories, and interact with cloud secrets managers without static credentials. This guide covers setting up Flux CD with workload identity on AWS, GCP, and Azure.

## Why Use Workload Identity with Flux CD

Traditional authentication with cloud services requires storing secrets (access keys, service account JSON files) in the cluster. This creates security risks:

- Secrets can be leaked through misconfigured RBAC, log exposure, or backup systems
- Long-lived credentials are harder to audit and rotate
- Shared credentials make it difficult to trace access back to specific workloads

Workload identity eliminates these risks by using short-lived, automatically rotated tokens tied to specific Kubernetes ServiceAccounts.

## AWS: Flux CD with IAM Roles for Service Accounts (IRSA)

On Amazon EKS, workload identity is implemented through IRSA (IAM Roles for Service Accounts). This allows Flux controllers to assume IAM roles for accessing ECR, S3, and CodeCommit.

### Step 1: Enable IRSA on Your EKS Cluster

Ensure your EKS cluster has an OIDC provider configured:

```bash
# Check if OIDC provider is configured
aws eks describe-cluster --name my-cluster \
  --query "cluster.identity.oidc.issuer" --output text

# If not configured, create the OIDC provider
eksctl utils associate-iam-oidc-provider --cluster my-cluster --approve
```

### Step 2: Create an IAM Policy for Flux

Create an IAM policy that grants Flux access to ECR:

```bash
# Create the IAM policy document
cat > flux-ecr-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ecr:GetDownloadUrlForLayer",
        "ecr:BatchGetImage",
        "ecr:BatchCheckLayerAvailability",
        "ecr:GetAuthorizationToken",
        "ecr:ListImages",
        "ecr:DescribeImages"
      ],
      "Resource": "*"
    }
  ]
}
EOF

# Create the IAM policy
aws iam create-policy \
  --policy-name FluxECRReadOnly \
  --policy-document file://flux-ecr-policy.json
```

### Step 3: Create an IAM Role for Flux Service Accounts

```bash
# Create the IAM role with IRSA trust relationship
eksctl create iamserviceaccount \
  --name source-controller \
  --namespace flux-system \
  --cluster my-cluster \
  --role-name flux-source-controller-role \
  --attach-policy-arn arn:aws:iam::ACCOUNT_ID:policy/FluxECRReadOnly \
  --approve \
  --override-existing-serviceaccounts
```

### Step 4: Bootstrap Flux with IRSA

Bootstrap Flux and then patch the ServiceAccount annotation:

```bash
# Bootstrap Flux
flux bootstrap github \
  --owner=your-org \
  --repository=fleet-infra \
  --branch=main \
  --path=clusters/my-cluster \
  --personal
```

Create a Kustomize patch to annotate the source-controller ServiceAccount with the IAM role:

```yaml
# clusters/my-cluster/flux-system/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - gotk-components.yaml
  - gotk-sync.yaml
patches:
  - patch: |
      apiVersion: v1
      kind: ServiceAccount
      metadata:
        name: source-controller
        namespace: flux-system
        annotations:
          eks.amazonaws.com/role-arn: arn:aws:iam::ACCOUNT_ID:role/flux-source-controller-role
```

### Step 5: Configure an OCI Repository Source with IRSA

```yaml
# Use the AWS provider for ECR authentication via IRSA
apiVersion: source.toolkit.fluxcd.io/v1beta2
kind: OCIRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 5m
  url: oci://ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/my-app
  ref:
    tag: latest
  provider: aws
```

The `provider: aws` field tells the source-controller to use IRSA for authentication instead of a static Secret.

## GCP: Flux CD with GKE Workload Identity

On Google Kubernetes Engine, Workload Identity maps Kubernetes ServiceAccounts to Google Cloud IAM service accounts.

### Step 1: Enable Workload Identity on GKE

```bash
# Enable Workload Identity on an existing cluster
gcloud container clusters update my-cluster \
  --workload-pool=MY_PROJECT_ID.svc.id.goog \
  --zone=us-central1-a

# Enable Workload Identity on the node pool
gcloud container node-pools update default-pool \
  --cluster=my-cluster \
  --workload-metadata=GKE_METADATA \
  --zone=us-central1-a
```

### Step 2: Create a GCP Service Account and Bind It

```bash
# Create a GCP service account for Flux
gcloud iam service-accounts create flux-source-controller \
  --display-name="Flux Source Controller"

# Grant the service account access to Artifact Registry
gcloud projects add-iam-policy-binding MY_PROJECT_ID \
  --member="serviceAccount:flux-source-controller@MY_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/artifactregistry.reader"

# Bind the GCP service account to the Kubernetes ServiceAccount
gcloud iam service-accounts add-iam-policy-binding \
  flux-source-controller@MY_PROJECT_ID.iam.gserviceaccount.com \
  --role="roles/iam.workloadIdentityUser" \
  --member="serviceAccount:MY_PROJECT_ID.svc.id.goog[flux-system/source-controller]"
```

### Step 3: Annotate the Flux ServiceAccount

```yaml
# Patch the source-controller ServiceAccount for GCP Workload Identity
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - gotk-components.yaml
  - gotk-sync.yaml
patches:
  - patch: |
      apiVersion: v1
      kind: ServiceAccount
      metadata:
        name: source-controller
        namespace: flux-system
        annotations:
          iam.gke.io/gcp-service-account: flux-source-controller@MY_PROJECT_ID.iam.gserviceaccount.com
```

### Step 4: Use GCP Provider for OCI Sources

```yaml
# Source from Google Artifact Registry using Workload Identity
apiVersion: source.toolkit.fluxcd.io/v1beta2
kind: OCIRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 5m
  url: oci://us-central1-docker.pkg.dev/MY_PROJECT_ID/my-repo/my-app
  ref:
    tag: latest
  provider: gcp
```

## Azure: Flux CD with Azure Workload Identity

On AKS, Azure Workload Identity (replacing AAD Pod Identity) uses federated credentials.

### Step 1: Enable Workload Identity on AKS

```bash
# Enable workload identity and OIDC issuer on AKS
az aks update \
  --name my-cluster \
  --resource-group my-rg \
  --enable-oidc-issuer \
  --enable-workload-identity

# Get the OIDC issuer URL
export AKS_OIDC_ISSUER=$(az aks show \
  --name my-cluster \
  --resource-group my-rg \
  --query "oidcIssuerProfile.issuerUrl" -o tsv)
```

### Step 2: Create a Managed Identity and Federated Credential

```bash
# Create a managed identity for Flux
az identity create \
  --name flux-source-controller \
  --resource-group my-rg

# Get the managed identity client ID
export IDENTITY_CLIENT_ID=$(az identity show \
  --name flux-source-controller \
  --resource-group my-rg \
  --query clientId -o tsv)

# Create a federated credential linking the Kubernetes ServiceAccount
az identity federated-credential create \
  --name flux-source-controller-federated \
  --identity-name flux-source-controller \
  --resource-group my-rg \
  --issuer "$AKS_OIDC_ISSUER" \
  --subject "system:serviceaccount:flux-system:source-controller" \
  --audiences "api://AzureADTokenExchange"

# Grant the identity access to Azure Container Registry
az role assignment create \
  --assignee "$IDENTITY_CLIENT_ID" \
  --role "AcrPull" \
  --scope /subscriptions/SUBSCRIPTION_ID/resourceGroups/my-rg/providers/Microsoft.ContainerRegistry/registries/myacr
```

### Step 3: Annotate the Flux ServiceAccount

```yaml
# Patch for Azure Workload Identity
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - gotk-components.yaml
  - gotk-sync.yaml
patches:
  - patch: |
      apiVersion: v1
      kind: ServiceAccount
      metadata:
        name: source-controller
        namespace: flux-system
        annotations:
          azure.workload.identity/client-id: <IDENTITY_CLIENT_ID>
        labels:
          azure.workload.identity/use: "true"
```

### Step 4: Use Azure Provider for OCI Sources

```yaml
# Source from Azure Container Registry using Workload Identity
apiVersion: source.toolkit.fluxcd.io/v1beta2
kind: OCIRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 5m
  url: oci://myacr.azurecr.io/my-app
  ref:
    tag: latest
  provider: azure
```

## Verifying Workload Identity Configuration

After configuring workload identity on any provider, verify it is working:

```bash
# Check that the ServiceAccount has the correct annotation
kubectl get serviceaccount source-controller -n flux-system -o yaml

# Reconcile a source to test authentication
flux reconcile source oci my-app

# Check the source status for authentication errors
flux get sources oci my-app

# Check source-controller logs for identity-related messages
kubectl logs -n flux-system deployment/source-controller | grep -i "auth\|identity\|token"
```

## Summary

Workload identity eliminates the need for long-lived credentials in your Flux CD installation. On AWS, use IRSA to map Kubernetes ServiceAccounts to IAM roles. On GCP, use GKE Workload Identity to bind to Google Cloud service accounts. On Azure, use Azure Workload Identity with federated credentials. In all cases, the pattern is the same: annotate the Flux controller ServiceAccount with the cloud identity reference and set `provider` on your source resources. This approach is more secure, easier to audit, and aligns with cloud-native best practices.
