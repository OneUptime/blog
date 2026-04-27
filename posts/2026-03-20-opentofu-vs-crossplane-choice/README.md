# OpenTofu vs Crossplane: Choosing the Right Infrastructure Provisioning Tool

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Crossplane, Kubernetes, Infrastructure as Code, Comparison

Description: Learn the key differences between OpenTofu and Crossplane for infrastructure provisioning, and when to choose each for managing cloud resources from Kubernetes.

## Introduction

OpenTofu and Crossplane both provision cloud infrastructure as code, but from very different paradigms. OpenTofu is a standalone IaC tool; Crossplane is a Kubernetes-native control plane that extends the Kubernetes API to manage cloud resources. This guide helps you understand when to use each.

## Core Approaches

### OpenTofu: Standalone IaC Tool

```hcl
resource "aws_db_instance" "db" {
  identifier     = "production-db"
  engine         = "postgres"
  engine_version = "15.4"
  instance_class = "db.t3.medium"
  username       = var.db_username
  password       = var.db_password
  storage_type   = "gp3"
  allocated_storage = 100
}
```

Run with:
```bash
tofu apply
```

### Crossplane: Kubernetes-Native Control Plane

```yaml
apiVersion: rds.aws.crossplane.io/v1alpha1
kind: DBInstance
metadata:
  name: production-db
spec:
  forProvider:
    region: us-east-1
    engine: postgres
    engineVersion: "15.4"
    dbInstanceClass: db.t3.medium
    allocatedStorage: 100
    storageType: gp3
  providerConfigRef:
    name: aws-provider-config
```

Applied with:
```bash
kubectl apply -f rds-instance.yaml
```

## Key Differences

| Aspect | OpenTofu | Crossplane |
|---|---|---|
| Interface | CLI + HCL files | Kubernetes API + YAML |
| Runtime | Stateless CLI | Kubernetes controllers |
| State management | tfstate file/backend | Kubernetes etcd |
| Drift correction | Manual (`tofu apply`) | Continuous (controllers) |
| Team model | IaC specialists | Platform engineering |
| Learning curve | HCL syntax | Kubernetes-native |
| Multi-cloud | Yes (3,000+ providers) | Yes (Kubernetes-based providers) |
| Self-service | Modules + workspace | Composite Resources (XRD) |

## Continuous Reconciliation: Crossplane's Key Advantage

Crossplane controllers continuously reconcile the desired state with actual state. If someone manually modifies a resource outside of Crossplane, the controller will detect and fix the drift automatically:

```yaml
# Crossplane periodically checks and corrects drift

# No manual "tofu apply" needed to restore desired state
spec:
  forProvider:
    allocatedStorage: 100
  # If storage was manually changed to 50GB, Crossplane restores it to 100GB
```

OpenTofu requires a manual `tofu apply` or a scheduled CI/CD run to detect and fix drift.

## Self-Service Infrastructure with Crossplane

Crossplane enables platform teams to create self-service infrastructure APIs:

```yaml
# Platform team defines a CompositeResourceDefinition
apiVersion: apiextensions.crossplane.io/v1
kind: CompositeResourceDefinition
metadata:
  name: xpostgresqlinstances.platform.example.com
spec:
  group: platform.example.com
  names:
    kind: XPostgreSQLInstance
    plural: xpostgresqlinstances
  versions:
    - name: v1alpha1
      served: true
      referenceable: true
      schema:
        openAPIV3Schema:
          properties:
            spec:
              properties:
                parameters:
                  properties:
                    storageGB: { type: integer }
                    size: { enum: [small, medium, large] }
```

App teams claim resources without knowing AWS details:

```yaml
# App team creates a database using the platform API
apiVersion: platform.example.com/v1alpha1
kind: XPostgreSQLInstance
metadata:
  name: my-app-db
spec:
  parameters:
    storageGB: 50
    size: medium
  compositionSelector:
    matchLabels:
      provider: aws
      region: us-east-1
```

## OpenTofu's Strengths

### Workflow Familiarity

```bash
tofu plan  # See exactly what will change
tofu apply # Apply changes
tofu destroy # Clean up
```

The plan/apply workflow is intuitive and provides a clear change preview.

### Rich Module Ecosystem

OpenTofu has thousands of community modules for every AWS, Azure, GCP, and SaaS service. Crossplane's composition library is less mature.

### Non-Kubernetes Environments

OpenTofu works everywhere without requiring a Kubernetes cluster. Crossplane requires Kubernetes to be installed and managed.

## When to Choose Crossplane

- Your team is already deeply invested in Kubernetes
- You need **continuous reconciliation** (automatic drift correction without CI/CD runs)
- You're building a **platform engineering team** offering self-service infrastructure
- You want to manage infrastructure using standard Kubernetes RBAC and tooling
- You're running **GitOps** with Argo CD or Flux and want cloud resources in the same model

## When to Choose OpenTofu

- Your team manages infrastructure without Kubernetes
- You want **explicit plan/apply workflow** with human review before changes
- You need **multi-cloud coverage** across providers Crossplane doesn't support well
- Your infrastructure engineers prefer files and CLI over Kubernetes YAML
- You have existing Terraform/OpenTofu modules to reuse

## Using Both Together

Some organizations use both:
- **OpenTofu**: Provisions the Kubernetes clusters and VPC infrastructure
- **Crossplane**: Runs inside Kubernetes to manage application-level cloud resources

```hcl
# OpenTofu creates the EKS cluster
resource "aws_eks_cluster" "main" { ... }

# Then Crossplane is installed into that cluster via Helm
resource "helm_release" "crossplane" {
  name       = "crossplane"
  repository = "https://charts.crossplane.io/stable"
  chart      = "crossplane"
  namespace  = "crossplane-system"
}
```

## Best Practices

- Choose Crossplane if platform self-service and continuous reconciliation are primary requirements.
- Choose OpenTofu if multi-cloud coverage, simplicity, and explicit change preview matter most.
- Avoid running both for the same resources - this creates conflicting control loops.
- Evaluate your team's Kubernetes expertise before committing to Crossplane.

## Conclusion

OpenTofu and Crossplane solve different problems in the infrastructure provisioning space. Crossplane's Kubernetes-native model and continuous reconciliation shine in platform engineering contexts. OpenTofu's explicit workflow, multi-cloud breadth, and module ecosystem make it the more versatile general-purpose IaC tool. Many mature teams end up using both at different layers of their stack.
