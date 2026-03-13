# How to Set Up Flux Multi-Account Deployment on AWS

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, AWS, EKS, Multi-Account, Cross-Account, IAM, Organizations

Description: Learn how to set up Flux for multi-account deployments on AWS, managing multiple EKS clusters across different AWS accounts from a single Git repository.

---

Organizations running workloads on AWS typically use multiple accounts to isolate environments (development, staging, production), separate teams, or enforce security boundaries. Flux enables you to manage EKS clusters across all these accounts from a centralized Git repository. This guide covers setting up Flux for multi-account deployments on AWS, including cross-account IAM configuration, repository structure, and environment promotion strategies.

## Prerequisites

- Multiple AWS accounts set up with AWS Organizations
- EKS clusters in at least two AWS accounts
- Flux CLI installed
- AWS CLI configured with cross-account access
- kubectl configured for each cluster
- A Git repository for fleet management

## Architecture Overview

The multi-account setup uses the following structure:

- **Management Account**: Hosts the Git repository and CI/CD pipeline
- **Development Account**: Runs the development EKS cluster
- **Staging Account**: Runs the staging EKS cluster
- **Production Account**: Runs the production EKS cluster

Each cluster runs its own Flux instance, all pointing to the same Git repository but reconciling different paths.

## Step 1: Set Up the Git Repository Structure

Organize your repository to support multiple clusters across accounts:

```text
fleet-infra/
  ├── base/                          # Shared base configurations
  │   ├── sources/                   # Shared Helm repositories
  │   │   └── kustomization.yaml
  │   ├── infrastructure/            # Shared infrastructure components
  │   │   └── kustomization.yaml
  │   └── apps/                      # Shared application definitions
  │       └── kustomization.yaml
  ├── infrastructure/                # Infrastructure per environment
  │   ├── dev/
  │   │   └── kustomization.yaml
  │   ├── staging/
  │   │   └── kustomization.yaml
  │   └── production/
  │       └── kustomization.yaml
  └── clusters/                      # Cluster-specific entry points
      ├── dev-cluster/
      │   ├── flux-system/
      │   └── kustomization.yaml
      ├── staging-cluster/
      │   ├── flux-system/
      │   └── kustomization.yaml
      └── production-cluster/
          ├── flux-system/
          └── kustomization.yaml
```

## Step 2: Configure Cross-Account IAM Roles

Create IAM roles in each target account that Flux can assume for accessing shared resources like ECR in the management account.

In the management account, create a trust policy:

```bash
# In the management account - create ECR access role
cat <<EOF > flux-ecr-trust-policy.json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": [
          "arn:aws:iam::111111111111:root",
          "arn:aws:iam::222222222222:root",
          "arn:aws:iam::333333333333:root"
        ]
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

aws iam create-role \
  --role-name FluxECRCrossAccountAccess \
  --assume-role-policy-document file://flux-ecr-trust-policy.json

aws iam attach-role-policy \
  --role-name FluxECRCrossAccountAccess \
  --policy-arn arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly
```

In each target account, create an IRSA role for Flux:

```bash
# In each target account (dev, staging, production)
eksctl create iamserviceaccount \
  --cluster=<cluster-name> \
  --namespace=flux-system \
  --name=source-controller \
  --attach-policy-arn=arn:aws:iam::<target-account-id>:policy/FluxAssumeRolePolicy \
  --override-existing-serviceaccounts \
  --approve
```

Create the assume role policy in each target account:

```bash
cat <<EOF > flux-assume-role-policy.json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "sts:AssumeRole",
      "Resource": "arn:aws:iam::<management-account-id>:role/FluxECRCrossAccountAccess"
    }
  ]
}
EOF

aws iam create-policy \
  --policy-name FluxAssumeRolePolicy \
  --policy-document file://flux-assume-role-policy.json
```

## Step 3: Bootstrap Flux on Each Cluster

Bootstrap Flux on each cluster, pointing to the appropriate path in the shared repository.

Development cluster:

```bash
export GITHUB_TOKEN=<your-github-token>

# Switch to dev cluster context
kubectl config use-context dev-cluster

flux bootstrap github \
  --owner=my-org \
  --repository=fleet-infra \
  --branch=main \
  --path=clusters/dev-cluster \
  --personal=false
```

Staging cluster:

```bash
kubectl config use-context staging-cluster

flux bootstrap github \
  --owner=my-org \
  --repository=fleet-infra \
  --branch=main \
  --path=clusters/staging-cluster \
  --personal=false
```

Production cluster:

```bash
kubectl config use-context production-cluster

flux bootstrap github \
  --owner=my-org \
  --repository=fleet-infra \
  --branch=main \
  --path=clusters/production-cluster \
  --personal=false
```

## Step 4: Define Shared Base Configurations

Create shared Helm repository sources that all clusters reference:

```yaml
# base/sources/helm-repos.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: prometheus-community
  namespace: flux-system
spec:
  interval: 24h
  url: https://prometheus-community.github.io/helm-charts
---
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: ingress-nginx
  namespace: flux-system
spec:
  interval: 24h
  url: https://kubernetes.github.io/ingress-nginx
```

## Step 5: Create Environment-Specific Kustomizations

Configure each cluster to apply the correct environment overlays.

Development cluster entry point:

```yaml
# clusters/dev-cluster/kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: infrastructure
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./infrastructure/dev
  prune: true
  wait: true
---
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: apps
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./apps/dev
  prune: true
  dependsOn:
    - name: infrastructure
```

Production cluster entry point with stricter settings:

```yaml
# clusters/production-cluster/kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: infrastructure
  namespace: flux-system
spec:
  interval: 30m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./infrastructure/production
  prune: true
  wait: true
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: ingress-nginx-controller
      namespace: ingress-nginx
---
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: apps
  namespace: flux-system
spec:
  interval: 30m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./apps/production
  prune: true
  dependsOn:
    - name: infrastructure
```

## Step 6: Configure Environment-Specific Values

Use Kustomize overlays to customize configurations per environment:

```yaml
# infrastructure/dev/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../../base/infrastructure
patches:
  - target:
      kind: HelmRelease
      name: ingress-nginx
    patch: |
      - op: replace
        path: /spec/values/controller/replicaCount
        value: 1
      - op: replace
        path: /spec/values/controller/resources/requests/cpu
        value: "100m"
```

```yaml
# infrastructure/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../../base/infrastructure
patches:
  - target:
      kind: HelmRelease
      name: ingress-nginx
    patch: |
      - op: replace
        path: /spec/values/controller/replicaCount
        value: 3
      - op: replace
        path: /spec/values/controller/resources/requests/cpu
        value: "500m"
      - op: add
        path: /spec/values/controller/topologySpreadConstraints
        value:
          - maxSkew: 1
            topologyKey: topology.kubernetes.io/zone
            whenUnsatisfiable: DoNotSchedule
```

## Step 7: Set Up Cross-Account ECR Image Access

Configure Flux to pull images from a shared ECR registry in the management account:

```yaml
# base/sources/ecr-registry.yaml
apiVersion: source.toolkit.fluxcd.io/v1beta2
kind: OCIRepository
metadata:
  name: shared-charts
  namespace: flux-system
spec:
  interval: 12h
  url: oci://<management-account-id>.dkr.ecr.us-west-2.amazonaws.com/charts
  provider: aws
```

## Step 8: Implement Environment Promotion

Set up a promotion strategy that moves changes from dev to staging to production through Git.

Create a promotion workflow:

```yaml
# .github/workflows/promote.yaml
name: Promote to Production
on:
  workflow_dispatch:
    inputs:
      version:
        description: "Application version to promote"
        required: true

jobs:
  promote:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Update production image tag
        run: |
          cd apps/production
          kustomize edit set image my-app=<account-id>.dkr.ecr.us-west-2.amazonaws.com/my-app:${{ inputs.version }}
      - name: Commit and push
        run: |
          git config user.name "GitHub Actions"
          git config user.email "actions@github.com"
          git add .
          git commit -m "Promote my-app ${{ inputs.version }} to production"
          git push
```

## Step 9: Set Up Notifications Across Accounts

Configure Flux notifications to alert on deployments across all clusters:

```yaml
# clusters/production-cluster/notifications/provider.yaml
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Provider
metadata:
  name: slack
  namespace: flux-system
spec:
  type: slack
  channel: production-deployments
  secretRef:
    name: slack-webhook-url
---
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: production-alerts
  namespace: flux-system
spec:
  providerRef:
    name: slack
  eventSeverity: info
  eventSources:
    - kind: Kustomization
      name: "*"
    - kind: HelmRelease
      name: "*"
  summary: "Production cluster event"
```

## Step 10: Commit and Push

Push all configurations to the shared repository:

```bash
git add -A
git commit -m "Set up Flux multi-account deployment"
git push origin main
```

## Verifying Multi-Account Setup

Check each cluster independently:

```bash
# Verify dev cluster
kubectl config use-context dev-cluster
flux get kustomizations
flux get helmreleases -A

# Verify staging cluster
kubectl config use-context staging-cluster
flux get kustomizations
flux get helmreleases -A

# Verify production cluster
kubectl config use-context production-cluster
flux get kustomizations
flux get helmreleases -A
```

## Troubleshooting

If cross-account access is not working:

```bash
# Test assume role from target account
aws sts assume-role \
  --role-arn arn:aws:iam::<management-account-id>:role/FluxECRCrossAccountAccess \
  --role-session-name test

# Check Flux source-controller logs for auth errors
kubectl logs -n flux-system deployment/source-controller --tail=50

# Verify IRSA configuration
kubectl describe sa source-controller -n flux-system
```

Common issues include incorrect trust policies, missing IRSA annotations on service accounts, or SCP (Service Control Policies) in AWS Organizations blocking cross-account access.

## Conclusion

Setting up Flux for multi-account deployments on AWS provides a centralized, Git-driven approach to managing infrastructure across your entire organization. Each cluster runs independently with its own Flux instance while sharing a common repository structure. Environment-specific customizations are handled through Kustomize overlays, and promotion between environments follows a clear Git-based workflow. Cross-account IAM roles enable secure resource sharing, and Flux notifications keep all teams informed about deployment status across accounts.
