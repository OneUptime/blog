# How to Use flux tree artifact-generator to Visualize Dependencies

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Artifactgenerator, Flux-Tree, Visualization

Description: Learn how to use the flux tree command with ArtifactGenerator resources to visualize source dependencies and deployment relationships.

---

## Introduction

As your Flux deployment grows with multiple ArtifactGenerators, sources, and Kustomizations, understanding which generated artifacts are available becomes critical. The `flux tree artifact generator` command provides a visual representation of the ExternalArtifacts managed by an ArtifactGenerator. You can combine it with `flux get artifact generators`, `kubectl`, and `flux tree kustomization` to inspect generator status, source inputs, and deployed resources.

This guide demonstrates how to use `flux tree artifact generator` to visualize generated artifacts, debug reconciliation chains, and understand your deployment topology.

## Prerequisites

- A Kubernetes cluster running Flux v2.7 or later with the `source-watcher` component enabled
- ArtifactGenerator resources deployed in your cluster
- `flux` CLI (v2.7 or later) installed
- `kubectl` configured for cluster access

## Understanding flux tree

The `flux tree` command shows resources reconciled or managed by Flux resources in a tree format. For ArtifactGenerators, the `flux tree artifact generator` subcommand prints the ExternalArtifact inventory recorded in the ArtifactGenerator status. To inspect the input sources for a generator, read the ArtifactGenerator spec and status with `kubectl`.

## Step 1: Basic Tree View of an ArtifactGenerator

View the generated artifact inventory of a specific ArtifactGenerator:

```bash
flux tree artifact generator app-production -n flux-system
```

This produces output similar to:

```text
ArtifactGenerator/flux-system/app-production
├── ExternalArtifact/flux-system/app-production
└── ExternalArtifact/flux-system/app-production-manifests
```

## Step 2: View All ArtifactGenerators

List all ArtifactGenerators with their status:

```bash
flux get artifact generators -A
```

Sample output:

```text
NAMESPACE    NAME                  SUSPENDED  READY  MESSAGE
flux-system  app-production        False      True   stored artifact for revision 'latest@sha256:abc123'
flux-system  backend-staging       False      True   stored artifact for revision 'latest@sha256:def456'
flux-system  infra-controllers     False      True   stored artifact for revision 'latest@sha256:789abc'
flux-system  observability-stack   False      False  failed to fetch source artifact
```

For a detailed tree of all generators, run the tree command for each generator from the list above:

```bash
flux get artifact generators -A --no-header | while read -r namespace name _; do
  flux tree artifact generator "$name" -n "$namespace"
done
```

## Step 3: Trace Source to Deployment

To understand the deployed resources for a Kustomization that consumes a generated ExternalArtifact, start from the Kustomization:

```bash
flux tree kustomization app-deployment -n flux-system
```

Output showing the applied resources:

```text
Kustomization/flux-system/app-deployment
├── Deployment/production/frontend
├── Service/production/frontend
├── ConfigMap/production/app-config
└── HorizontalPodAutoscaler/production/frontend
```

Then check the Kustomization source reference to confirm which generated ExternalArtifact it consumes:

```bash
kubectl get kustomization app-deployment -n flux-system \
  -o jsonpath='{.spec.sourceRef.kind}/{.spec.sourceRef.name}{"\n"}'
```

## Step 4: Identify Stale or Failing Dependencies

Use the generator status to find which ArtifactGenerators are not ready:

```bash
flux get artifact generators -A --status-selector ready=false
```

For a specific generator that is not ready, inspect its generated artifact inventory:

```bash
flux tree artifact generator observability-stack -n flux-system
```

```text
ArtifactGenerator/flux-system/observability-stack
└── ExternalArtifact/flux-system/observability-stack
```

Then inspect the generator status and source references with `kubectl`:

```bash
kubectl describe artifactgenerator observability-stack -n flux-system
kubectl get artifactgenerator observability-stack -n flux-system \
  -o jsonpath='{range .spec.sources[*]}{.kind}/{.name}{"\n"}{end}'
```

This shows the source references and status messages you can use to find the failing input that prevents the ArtifactGenerator from reconciling.

## Step 5: Export Tree as JSON

For programmatic analysis, export the generated artifact inventory as JSON:

```bash
flux tree artifact generator app-production -n flux-system -o json
```

```json
{
  "resource": {
    "Namespace": "flux-system",
    "Name": "app-production",
    "GroupKind": {
      "Group": "source.extensions.fluxcd.io",
      "Kind": "ArtifactGenerator"
    }
  },
  "resources": [
    {
      "resource": {
        "Namespace": "flux-system",
        "Name": "app-production",
        "GroupKind": {
          "Group": "source.toolkit.fluxcd.io",
          "Kind": "ExternalArtifact"
        }
      }
    }
  ]
}
```

Use this with `jq` for filtering:

```bash
# List generated ExternalArtifacts for a generator

flux tree artifact generator app-production -n flux-system -o json | \
  jq -r '.resources[].resource | "\(.Namespace)/\(.Name)"'
```

## Step 6: Visualize Cross-Namespace Dependencies

When reviewing ArtifactGenerators in tenant namespaces, the tree shows the namespace path from the status inventory:

```bash
flux tree artifact generator multi-tenant-app -n tenant-a
```

```text
ArtifactGenerator/tenant-a/multi-tenant-app
├── ExternalArtifact/tenant-a/multi-tenant-app
└── ExternalArtifact/tenant-a/multi-tenant-config
```

For source references across namespaces, inspect `.spec.sources`:

```bash
kubectl get artifactgenerator multi-tenant-app -n tenant-a \
  -o jsonpath='{range .spec.sources[*]}{.kind}/{.namespace}/{.name}{"\n"}{end}'
```

## Step 7: Build Monitoring Dashboards

Use the ArtifactGenerator resource status to feed monitoring systems. Here is a script that generates Prometheus metrics from Kubernetes API data:

```bash
#!/bin/bash
# generate-metrics.sh

kubectl get artifactgenerators.source.extensions.fluxcd.io -A -o json | jq -r '
  .items[] |
  . as $generator |
  ($generator.status.conditions // [] | map(select(.type == "Ready")) | last | .status == "True") as $ready |
  "flux_artifactgenerator_ready{name=\"\($generator.metadata.name)\",namespace=\"\($generator.metadata.namespace)\"} \(if $ready then 1 else 0 end)",
  "flux_artifactgenerator_sources_total{name=\"\($generator.metadata.name)\",namespace=\"\($generator.metadata.namespace)\"} \(($generator.spec.sources // []) | length)",
  "flux_artifactgenerator_inventory_total{name=\"\($generator.metadata.name)\",namespace=\"\($generator.metadata.namespace)\"} \(($generator.status.inventory // []) | length)"
'
```

## Common Debugging Workflows

When a deployment is not updating, trace the full dependency chain:

```bash
# 1. Check the Kustomization
flux get kustomization app-deployment -n flux-system

# 2. Check the ExternalArtifact it references
kubectl get kustomization app-deployment -n flux-system \
  -o jsonpath='{.spec.sourceRef.kind}/{.spec.sourceRef.name}{"\n"}'

# 3. Check the ArtifactGenerator inventory
flux tree artifact generator app-production -n flux-system

# 4. Check individual source references
kubectl get artifactgenerator app-production -n flux-system \
  -o jsonpath='{range .spec.sources[*]}{.kind}/{.name}{"\n"}{end}'
```

When an ArtifactGenerator shows as ready but content seems stale:

```bash
# Compare generated ExternalArtifacts
flux tree artifact generator app-production -n flux-system -o json | \
  jq -r '.resources[].resource | "\(.GroupKind.Kind) \(.Namespace)/\(.Name)"'
```

## Conclusion

The `flux tree artifact generator` command provides a useful view into the ExternalArtifacts managed by each ArtifactGenerator. By visualizing generated artifacts and combining the tree output with `flux get artifact generators`, `kubectl`, and `flux tree kustomization`, you can identify reconciliation failures, verify the generated artifact inventory, and understand how generated artifacts are consumed by your Flux infrastructure. Combined with JSON output and scripting, the data can feed into monitoring dashboards and automated health checks.
