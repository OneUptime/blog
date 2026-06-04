# How to Implement GitOps for Infrastructure with Crossplane and ArgoCD

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GitOps, Crossplane, ArgoCD, Infrastructure as Code, Kubernetes

Description: Learn how to implement GitOps for infrastructure provisioning using Crossplane and ArgoCD to manage cloud resources through Git workflows and declarative manifests.

---

GitOps has transformed how we deploy applications to Kubernetes, but what about the infrastructure itself? Crossplane extends Kubernetes to manage cloud resources, and when combined with ArgoCD, you get a complete GitOps workflow for both infrastructure and applications.

This guide walks you through setting up a practical GitOps infrastructure workflow using Crossplane and ArgoCD.

## Why Crossplane for Infrastructure GitOps

Traditional infrastructure as code tools operate outside the Kubernetes control loop. Crossplane brings infrastructure into Kubernetes as custom resources, giving you:

- Unified control plane for apps and infrastructure
- Continuous reconciliation of desired state
- Native Kubernetes RBAC for infrastructure
- Composition for reusable infrastructure patterns

When you add ArgoCD to this mix, Git becomes your single source of truth for everything running in your clusters and the cloud resources they depend on.

## Installing Crossplane

Start by installing Crossplane into your cluster. Use the official Helm chart:

```bash
# Add the Crossplane Helm repository

helm repo add crossplane-stable https://charts.crossplane.io/stable
helm repo update

# Install Crossplane
helm install crossplane \
  crossplane-stable/crossplane \
  --namespace crossplane-system \
  --create-namespace \
  --wait
```

Verify the installation:

```bash
kubectl get pods -n crossplane-system
```

You should see the crossplane and crossplane-rbac-manager pods running.

## Installing Cloud Provider

Next, install providers for your cloud platform. This example uses AWS RDS and EC2, but Crossplane supports Azure, GCP, and many others:

```yaml
# provider-aws.yaml
apiVersion: pkg.crossplane.io/v1
kind: Provider
metadata:
  name: provider-aws-rds
spec:
  package: xpkg.upbound.io/upbound/provider-aws-rds:v2.1.1
---
apiVersion: pkg.crossplane.io/v1
kind: Provider
metadata:
  name: provider-aws-ec2
spec:
  package: xpkg.upbound.io/upbound/provider-aws-ec2:v2.1.1
```

Apply this manifest:

```bash
kubectl apply -f provider-aws.yaml
```

Wait for the provider to become healthy:

```bash
kubectl get providers
```

## Configuring Cloud Credentials

Create a Kubernetes secret with your AWS credentials:

```bash
# Create AWS credentials file
cat > aws-credentials.txt <<EOF
[default]
aws_access_key_id = YOUR_ACCESS_KEY
aws_secret_access_key = YOUR_SECRET_KEY
EOF

# Create secret
kubectl create secret generic aws-secret \
  -n crossplane-system \
  --from-file=creds=./aws-credentials.txt

# Clean up credentials file
rm aws-credentials.txt
```

Create a ProviderConfig to use these credentials:

```yaml
# provider-config-aws.yaml
apiVersion: aws.m.upbound.io/v1beta1
kind: ClusterProviderConfig
metadata:
  name: default
spec:
  credentials:
    source: Secret
    secretRef:
      namespace: crossplane-system
      name: aws-secret
      key: creds
```

Apply the configuration:

```bash
kubectl apply -f provider-config-aws.yaml
```

## Creating Infrastructure Compositions

Compositions let you define reusable infrastructure patterns. Install Function Patch and Transform first:

```yaml
# function-patch-and-transform.yaml
apiVersion: pkg.crossplane.io/v1
kind: Function
metadata:
  name: function-patch-and-transform
spec:
  package: xpkg.crossplane.io/crossplane-contrib/function-patch-and-transform:v0.8.2
```

Here's a composition for an RDS database setup:

```yaml
# composition-rds.yaml
apiVersion: apiextensions.crossplane.io/v1
kind: Composition
metadata:
  name: production-rds
  labels:
    environment: production
spec:
  compositeTypeRef:
    apiVersion: database.example.com/v1alpha1
    kind: PostgreSQLInstance
  mode: Pipeline
  pipeline:
    - step: patch-and-transform
      functionRef:
        name: function-patch-and-transform
      input:
        apiVersion: pt.fn.crossplane.io/v1beta1
        kind: Resources
        resources:
          - name: subnet-group
            base:
              apiVersion: rds.aws.m.upbound.io/v1beta1
              kind: SubnetGroup
              spec:
                forProvider:
                  region: us-east-1
                  subnetIds: []
            patches:
              - type: FromCompositeFieldPath
                fromFieldPath: spec.parameters.region
                toFieldPath: spec.forProvider.region
              - type: FromCompositeFieldPath
                fromFieldPath: spec.parameters.subnetIds
                toFieldPath: spec.forProvider.subnetIds
          - name: security-group
            base:
              apiVersion: ec2.aws.m.upbound.io/v1beta1
              kind: SecurityGroup
              spec:
                forProvider:
                  region: us-east-1
                  description: "PostgreSQL RDS security group"
                  vpcId: ""
            patches:
              - type: FromCompositeFieldPath
                fromFieldPath: spec.parameters.region
                toFieldPath: spec.forProvider.region
              - type: FromCompositeFieldPath
                fromFieldPath: spec.parameters.vpcId
                toFieldPath: spec.forProvider.vpcId
          - name: db-instance
            base:
              apiVersion: rds.aws.m.upbound.io/v1beta1
              kind: Instance
              spec:
                forProvider:
                  region: us-east-1
                  engine: postgres
                  engineVersion: "14.7"
                  username: postgres
                  manageMasterUserPassword: true
                  instanceClass: db.t3.medium
                  allocatedStorage: 100
                  storageType: gp3
                  storageEncrypted: true
                  skipFinalSnapshot: false
                  publiclyAccessible: false
                  multiAz: true
                  dbSubnetGroupNameSelector:
                    matchControllerRef: true
                  vpcSecurityGroupIdSelector:
                    matchControllerRef: true
                writeConnectionSecretToRef:
                  name: postgres-connection
            patches:
              - type: FromCompositeFieldPath
                fromFieldPath: spec.parameters.region
                toFieldPath: spec.forProvider.region
              - type: FromCompositeFieldPath
                fromFieldPath: spec.parameters.size
                toFieldPath: spec.forProvider.instanceClass
                transforms:
                  - type: map
                    map:
                      small: db.t3.small
                      medium: db.t3.medium
                      large: db.t3.large
```

Create the XRD (composite resource definition):

```yaml
# xrd-postgresql.yaml
apiVersion: apiextensions.crossplane.io/v2
kind: CompositeResourceDefinition
metadata:
  name: postgresqlinstances.database.example.com
spec:
  scope: Namespaced
  group: database.example.com
  names:
    kind: PostgreSQLInstance
    plural: postgresqlinstances
  versions:
    - name: v1alpha1
      served: true
      referenceable: true
      schema:
        openAPIV3Schema:
          type: object
          properties:
            spec:
              type: object
              properties:
                parameters:
                  type: object
                  properties:
                    size:
                      type: string
                      enum: ["small", "medium", "large"]
                    region:
                      type: string
                    vpcId:
                      type: string
                    subnetIds:
                      type: array
                      items:
                        type: string
                  required:
                    - size
                    - region
                    - vpcId
                    - subnetIds
              required:
                - parameters
```

## Setting Up GitOps Repository Structure

Organize your infrastructure Git repository like this:

```text
infrastructure/
├── bootstrap/
│   ├── crossplane/
│   │   └── install.yaml
│   └── providers/
│       └── provider-aws.yaml
├── compositions/
│   ├── database/
│   │   └── postgresql.yaml
│   └── networking/
│       └── vpc.yaml
├── environments/
│   ├── production/
│   │   ├── databases/
│   │   │   └── main-db.yaml
│   │   └── networking/
│   │       └── vpc.yaml
│   └── staging/
│       ├── databases/
│       │   └── test-db.yaml
│       └── networking/
│           └── vpc.yaml
└── resources/
    └── kustomization.yaml
```

## Integrating with ArgoCD

Install ArgoCD if you haven't already:

```bash
kubectl create namespace argocd
kubectl apply -n argocd --server-side --force-conflicts -f \
  https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
```

Create an ArgoCD Application for Crossplane bootstrap:

```yaml
# argocd-crossplane-bootstrap.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: crossplane-bootstrap
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/yourorg/infrastructure
    targetRevision: main
    path: bootstrap
  destination:
    server: https://kubernetes.default.svc
    namespace: crossplane-system
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
```

Create Applications for compositions and infrastructure resources:

```yaml
# argocd-infrastructure.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: infrastructure-compositions
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/yourorg/infrastructure
    targetRevision: main
    path: compositions
  destination:
    server: https://kubernetes.default.svc
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
---
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: production-infrastructure
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/yourorg/infrastructure
    targetRevision: main
    path: environments/production
  destination:
    server: https://kubernetes.default.svc
  syncPolicy:
    automated:
      prune: false  # Be careful with infrastructure deletion
      selfHeal: true
```

## Creating Infrastructure Resources

Now you can provision infrastructure through Git commits. Create a composite resource for a database:

```yaml
# environments/production/databases/main-db.yaml
apiVersion: database.example.com/v1alpha1
kind: PostgreSQLInstance
metadata:
  name: main-database
  namespace: production
spec:
  parameters:
    size: medium
    region: us-east-1
    vpcId: vpc-12345678
    subnetIds:
      - subnet-abc123
      - subnet-def456
      - subnet-ghi789
```

Commit this file to your Git repository. ArgoCD will sync it to the cluster, and Crossplane will provision the actual RDS instance in AWS. The RDS connection details will be written to the `postgres-connection` secret in the same namespace.

## Monitoring Reconciliation

Check the status of your infrastructure:

```bash
# View all managed resources
kubectl get managed

# Check composite resource status
kubectl get postgresqlinstances -n production

# View detailed status
kubectl describe postgresqlinstance main-database -n production
```

Watch ArgoCD for sync status:

```bash
# Get ArgoCD password
kubectl -n argocd get secret argocd-initial-admin-secret \
  -o jsonpath="{.data.password}" | base64 -d

# Port forward to ArgoCD UI
kubectl port-forward svc/argocd-server -n argocd 8080:443
```

## Handling Deletions Safely

Infrastructure deletions are dangerous. Configure ArgoCD to avoid automatic pruning:

```yaml
syncPolicy:
  automated:
    prune: false  # Do not automatically delete infrastructure
```

When you need ArgoCD to require confirmation before pruning a specific infrastructure object, use ArgoCD's prune confirmation sync option:

```yaml
apiVersion: database.example.com/v1alpha1
kind: PostgreSQLInstance
metadata:
  name: main-database
  annotations:
    argocd.argoproj.io/sync-options: Prune=confirm
```

## Conclusion

Combining Crossplane with ArgoCD gives you true GitOps for infrastructure. Your cloud resources become Kubernetes objects managed through Git commits with full audit trails and automated reconciliation. Start with non-production environments to build confidence, then expand to production workloads once your team is comfortable with the workflow.
