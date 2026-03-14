# How to Use CEL Expressions for Crossplane Resource Health in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, GitOps, Kubernetes, CEL, Crossplane, Health Check, Infrastructure

Description: Learn how to use CEL expressions in Flux to evaluate Crossplane managed resource health, ensuring cloud infrastructure is provisioned before dependent workloads deploy.

---

## Introduction

Crossplane extends Kubernetes to manage cloud infrastructure through custom resources. When you create a Crossplane managed resource like an RDS database instance or an S3 bucket, the Crossplane provider provisions the actual cloud resource. This provisioning can take minutes to hours depending on the resource type. CEL expressions in Flux let you define precise health criteria for Crossplane resources, verifying both that the resource is ready and that the cloud state is synchronized before dependent applications deploy.

## Prerequisites

- A Kubernetes cluster running version 1.25 or later
- Flux v2.3 or later installed on the cluster
- Crossplane installed with appropriate providers (AWS, GCP, Azure)
- kubectl configured to access the cluster
- A Git repository connected to Flux via a GitRepository source
- Provider credentials configured for Crossplane

## Crossplane Resource Status Structure

Crossplane managed resources report their state through two key conditions:

```yaml
status:
  conditions:
    - type: Ready
      status: "True"
      reason: Available
      lastTransitionTime: "2026-03-13T10:00:00Z"
    - type: Synced
      status: "True"
      reason: ReconcileSuccess
      lastTransitionTime: "2026-03-13T10:00:00Z"
  atProvider:
    # Cloud-specific status fields
```

- **Ready**: Indicates the cloud resource is provisioned and available
- **Synced**: Indicates the Crossplane controller has successfully reconciled the desired state with the actual cloud state

## Basic Crossplane Health Check with CEL

Check both `Ready` and `Synced` conditions for a managed resource:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: cloud-database
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure/database
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  timeout: 30m
  healthChecks:
    - apiVersion: rds.aws.upbound.io/v1beta1
      kind: Instance
      name: production-db
      namespace: crossplane-system
      cel:
        healthyWhen: >-
          status.conditions.exists(c, c.type == 'Ready' && c.status == 'True')
          && status.conditions.exists(c, c.type == 'Synced' && c.status == 'True')
```

The corresponding Crossplane managed resource:

```yaml
apiVersion: rds.aws.upbound.io/v1beta1
kind: Instance
metadata:
  name: production-db
  namespace: crossplane-system
spec:
  forProvider:
    region: us-east-1
    instanceClass: db.r6g.large
    engine: postgres
    engineVersion: "16"
    allocatedStorage: 100
    dbName: myapp
    masterUsername: admin
    masterPasswordSecretRef:
      name: db-master-password
      namespace: crossplane-system
      key: password
    skipFinalSnapshot: false
    publiclyAccessible: false
    vpcSecurityGroupIdRefs:
      - name: db-security-group
  providerConfigRef:
    name: aws-provider
```

Note the 30-minute timeout. RDS instance provisioning typically takes 10-20 minutes.

## Health Checking S3 Buckets

S3 buckets provision quickly but still benefit from health verification:

```yaml
healthChecks:
  - apiVersion: s3.aws.upbound.io/v1beta1
    kind: Bucket
    name: app-assets
    namespace: crossplane-system
    cel:
      healthyWhen: >-
        status.conditions.exists(c, c.type == 'Ready' && c.status == 'True')
        && status.conditions.exists(c, c.type == 'Synced' && c.status == 'True')
```

## Health Checking Multiple Cloud Resources

When your application depends on several cloud resources, check them all:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: cloud-infrastructure
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure/cloud
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  timeout: 45m
  healthChecks:
    - apiVersion: rds.aws.upbound.io/v1beta1
      kind: Instance
      name: production-db
      namespace: crossplane-system
      cel:
        healthyWhen: >-
          status.conditions.exists(c, c.type == 'Ready' && c.status == 'True')
          && status.conditions.exists(c, c.type == 'Synced' && c.status == 'True')
    - apiVersion: elasticache.aws.upbound.io/v1beta1
      kind: ReplicationGroup
      name: production-redis
      namespace: crossplane-system
      cel:
        healthyWhen: >-
          status.conditions.exists(c, c.type == 'Ready' && c.status == 'True')
          && status.conditions.exists(c, c.type == 'Synced' && c.status == 'True')
    - apiVersion: s3.aws.upbound.io/v1beta1
      kind: Bucket
      name: app-uploads
      namespace: crossplane-system
      cel:
        healthyWhen: >-
          status.conditions.exists(c, c.type == 'Ready' && c.status == 'True')
          && status.conditions.exists(c, c.type == 'Synced' && c.status == 'True')
```

The timeout is set to 45 minutes to accommodate the slowest resource (typically RDS instances or ElastiCache clusters).

## Crossplane Compositions and Claims

When using Crossplane Compositions, health check the Claim (XR) rather than individual managed resources:

```yaml
apiVersion: database.example.com/v1alpha1
kind: PostgreSQLInstance
metadata:
  name: production-db
  namespace: production
spec:
  parameters:
    storageGB: 100
    instanceSize: large
  compositionSelector:
    matchLabels:
      provider: aws
```

```yaml
healthChecks:
  - apiVersion: database.example.com/v1alpha1
    kind: PostgreSQLInstance
    name: production-db
    namespace: production
    cel:
      healthyWhen: >-
        status.conditions.exists(c, c.type == 'Ready' && c.status == 'True')
        && status.conditions.exists(c, c.type == 'Synced' && c.status == 'True')
```

The Claim's `Ready` condition reflects the aggregate health of all composed resources.

## Cloud Infrastructure Before Application Deployment

Chain cloud infrastructure provisioning with application deployment:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: crossplane-providers
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure/crossplane/providers
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  wait: true
  timeout: 10m
---
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: cloud-infra
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure/cloud
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  dependsOn:
    - name: crossplane-providers
  timeout: 45m
  healthChecks:
    - apiVersion: rds.aws.upbound.io/v1beta1
      kind: Instance
      name: production-db
      namespace: crossplane-system
      cel:
        healthyWhen: >-
          status.conditions.exists(c, c.type == 'Ready' && c.status == 'True')
          && status.conditions.exists(c, c.type == 'Synced' && c.status == 'True')
---
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: connection-secrets
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure/connection-secrets
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  dependsOn:
    - name: cloud-infra
  wait: true
  timeout: 2m
---
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: application
  namespace: flux-system
spec:
  interval: 10m
  path: ./apps/main
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  dependsOn:
    - name: connection-secrets
  wait: true
  timeout: 5m
```

## Setting Timeouts for Different Cloud Resources

Different cloud resources have vastly different provisioning times:

```yaml
# S3 Bucket: 1-2 minutes
timeout: 5m

# Security Group: 1-2 minutes
timeout: 5m

# RDS Instance: 10-20 minutes
timeout: 30m

# ElastiCache Cluster: 10-15 minutes
timeout: 30m

# EKS Cluster: 15-25 minutes
timeout: 45m

# CloudFront Distribution: 10-30 minutes
timeout: 45m
```

## GCP Resources

For GCP Crossplane resources, the CEL expressions are the same since Crossplane uses the same condition types across providers:

```yaml
healthChecks:
  - apiVersion: sql.gcp.upbound.io/v1beta1
    kind: DatabaseInstance
    name: production-db
    namespace: crossplane-system
    cel:
      healthyWhen: >-
        status.conditions.exists(c, c.type == 'Ready' && c.status == 'True')
        && status.conditions.exists(c, c.type == 'Synced' && c.status == 'True')
  - apiVersion: storage.gcp.upbound.io/v1beta1
    kind: Bucket
    name: app-storage
    namespace: crossplane-system
    cel:
      healthyWhen: >-
        status.conditions.exists(c, c.type == 'Ready' && c.status == 'True')
        && status.conditions.exists(c, c.type == 'Synced' && c.status == 'True')
```

## Debugging Crossplane Health Check Failures

When a Crossplane resource health check fails:

```bash
# Check Kustomization status
flux get kustomization cloud-infra

# Check managed resource status
kubectl get instance.rds production-db -n crossplane-system -o yaml

# Check conditions
kubectl get instance.rds production-db -n crossplane-system -o jsonpath='{.status.conditions}' | jq .

# Check Crossplane provider logs
kubectl logs -n crossplane-system -l pkg.crossplane.io/revision -c package-runtime --tail=50

# Check events
kubectl get events -n crossplane-system --field-selector involvedObject.name=production-db

# Check provider config
kubectl get providerconfig aws-provider -o yaml
```

Common Crossplane health check failure causes:

- Provider credentials expired or insufficient permissions
- Cloud service quota limits reached
- Invalid resource configuration (unsupported instance type, region)
- Network connectivity issues between the cluster and cloud API
- Crossplane provider not installed or not running
- Resource dependencies not met (VPC, subnet, security group)

## Conclusion

CEL expressions for Crossplane resource health in Flux bridge the gap between your GitOps pipeline and cloud infrastructure provisioning. By checking both `Ready` and `Synced` conditions, you verify that cloud resources are not just provisioned but also in sync with your desired state. Setting generous timeouts for slow-provisioning resources like databases and using Kustomization dependencies to order cloud infrastructure before application deployment creates a reliable end-to-end pipeline from infrastructure provisioning through application readiness.
