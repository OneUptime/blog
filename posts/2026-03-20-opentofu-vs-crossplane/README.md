# OpenTofu vs Crossplane: Choosing the Right IaC Approach

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Crossplane, Kubernetes, Comparison, Infrastructure as Code, DevOps

Description: Compare OpenTofu and Crossplane - their operational models, team fit, and use cases - to decide which infrastructure provisioning approach fits your organization.

## Introduction

OpenTofu and Crossplane both provision cloud infrastructure, but through fundamentally different models. OpenTofu is a CLI-driven, plan-apply workflow. Crossplane is a Kubernetes operator that manages infrastructure through Kubernetes Custom Resource Definitions (CRDs) using a continuous reconciliation loop.

## How They Work

OpenTofu (CLI-driven):

```hcl
# Define resources in HCL

resource "aws_s3_bucket" "data" {
  bucket = "my-data-bucket"
}
```

```bash
# Run manually or in CI
tofu plan
tofu apply
# Runs once, exits
```

Crossplane (Kubernetes-native):

```yaml
# Define resources as Kubernetes manifests
apiVersion: s3.aws.crossplane.io/v1beta1
kind: Bucket
metadata:
  name: my-data-bucket
spec:
  forProvider:
    region: us-east-1
  providerConfigRef:
    name: aws-provider
```

```bash
# Apply to Kubernetes cluster
kubectl apply -f bucket.yaml
# Crossplane controller reconciles continuously
```

## Comparison Matrix

| Feature | OpenTofu | Crossplane |
|---------|----------|------------|
| Execution model | Plan-apply CLI | Kubernetes operator (continuous reconciliation) |
| State storage | .tfstate files (local/remote) | Kubernetes etcd |
| Drift detection | Manual (`tofu plan -refresh-only`) | Automatic (reconciliation loop) |
| Language | HCL | YAML / Kubernetes manifests |
| Learning curve | HCL + IaC concepts | Kubernetes + CRDs |
| Provider ecosystem | 3,000+ providers | Growing (AWS, Azure, GCP, Helm) |
| RBAC | CI/CD IAM roles | Kubernetes RBAC |
| Self-service | Via CI/CD pipelines | Via `kubectl apply` |
| Composites | Modules | Composite Resources (XRDs) |
| License | MPL 2.0 | Apache 2.0 |

## When OpenTofu Wins

**Operations/platform teams** - The plan-apply workflow, state management, and rich provider ecosystem suit teams that manage infrastructure as a dedicated function.

**Non-Kubernetes environments** - OpenTofu doesn't require a Kubernetes cluster to provision infrastructure.

**Broad provider coverage** - OpenTofu has 3,000+ providers. Crossplane has fewer, though the ecosystem is growing.

**Existing Terraform investment** - Drop-in compatibility with existing Terraform configs, modules, and tooling.

## When Crossplane Wins

**Kubernetes-native organizations** - If your platform is built on Kubernetes, managing infrastructure with `kubectl` and GitOps fits naturally into existing workflows (Flux, ArgoCD).

**Self-service infrastructure** - Platform teams expose `CompositeResourceDefinitions` (XRDs) that developers consume like Kubernetes objects - without needing to know OpenTofu or IAM.

**Continuous drift remediation** - Crossplane's reconciliation loop automatically corrects drift; OpenTofu requires scheduled drift detection jobs.

**GitOps workflows** - Store infrastructure manifests in Git and let ArgoCD/Flux sync them to the cluster, which provisions cloud resources.

## Crossplane Composite Resource (Equivalent to OpenTofu Module)

```yaml
# Crossplane: CompositeResourceDefinition (XRD) - like a module interface
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
                    size:
                      type: string
                      enum: [small, medium, large]
```

## Using Both Together

Some organizations use OpenTofu for foundational infrastructure and Crossplane for developer self-service:

```text
Platform team: OpenTofu manages
  - VPCs, subnets, route tables
  - EKS clusters
  - IAM baseline

Developer self-service: Crossplane manages
  - Databases (PostgreSQL, MySQL)
  - Object storage buckets
  - Message queues
```

## Conclusion

OpenTofu is the better choice for dedicated platform/operations teams managing broad cloud infrastructure with rich provider coverage. Crossplane is the better choice for Kubernetes-native organizations that want continuous reconciliation, GitOps integration, and developer self-service via familiar `kubectl` workflows. Many organizations use both: OpenTofu for foundational infrastructure that rarely changes, Crossplane for developer-facing services that need self-service provisioning.
