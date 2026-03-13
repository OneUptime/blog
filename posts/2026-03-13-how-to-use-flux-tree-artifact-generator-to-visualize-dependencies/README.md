# How to Use flux tree artifact-generator to Visualize Dependencies

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: flux, kubernetes, gitops, artifactgenerator, flux-tree, visualization

Description: Learn how to use the flux tree command with ArtifactGenerator resources to visualize source dependencies and deployment relationships.

---

## Introduction

As your Flux deployment grows with multiple ArtifactGenerators, sources, and Kustomizations, understanding the dependency graph becomes critical. The `flux tree` command provides a visual representation of how resources relate to each other. When used with ArtifactGenerator resources, it shows which input sources feed into each generator and which Kustomizations consume the generated artifacts.

This guide demonstrates how to use `flux tree` to visualize ArtifactGenerator dependencies, debug reconciliation chains, and understand your deployment topology.

## Prerequisites

- A Kubernetes cluster running Flux v2.4 or later
- ArtifactGenerator resources deployed in your cluster
- `flux` CLI (v2.4 or later) installed
- `kubectl` configured for cluster access

## Understanding flux tree

The `flux tree` command traverses the dependency graph of Flux resources and displays them in a tree format. For ArtifactGenerators, it shows the input sources that feed into the generator and the Kustomizations or other resources that consume the generated artifact.

## Step 1: Basic Tree View of an ArtifactGenerator

View the dependency tree of a specific ArtifactGenerator:

```bash
flux tree artifactgenerator app-production -n flux-system
```

This produces output similar to:

```
ArtifactGenerator/flux-system/app-production
├── GitRepository/flux-system/platform-base (input: base)
│   └── url: https://github.com/your-org/platform-base
├── GitRepository/flux-system/app-overlay (input: overlay)
│   └── url: https://github.com/your-org/app-overlays
└── Kustomization/flux-system/app-deployment (consumer)
    └── path: ./overlay
```

## Step 2: View All ArtifactGenerators

List all ArtifactGenerators with their dependency status:

```bash
flux tree artifactgenerator -A
```

Sample output:

```
NAMESPACE    NAME                  READY  INPUTS  CONSUMERS
flux-system  app-production        True   2       1
flux-system  backend-staging       True   3       2
flux-system  infra-controllers     True   1       1
flux-system  observability-stack   False  4       3
```

For a detailed tree of all generators:

```bash
flux tree artifactgenerator -A --output=tree
```

## Step 3: Trace Source to Deployment

To understand the full path from a source to deployed resources, start from the source:

```bash
flux tree kustomization app-deployment -n flux-system
```

Output showing the full chain:

```
Kustomization/flux-system/app-deployment
├── ArtifactGenerator/flux-system/app-production (source)
│   ├── GitRepository/flux-system/platform-base (input)
│   └── GitRepository/flux-system/app-overlay (input)
├── Deployment/production/frontend
│   └── Ready: True
├── Service/production/frontend
│   └── Ready: True
├── ConfigMap/production/app-config
│   └── Ready: True
└── HorizontalPodAutoscaler/production/frontend
    └── Ready: True
```

## Step 4: Identify Stale or Failing Dependencies

Use the tree view to find which input sources are causing issues:

```bash
flux tree artifactgenerator -A --status-selector ready=false
```

For a specific generator that is not ready:

```bash
flux tree artifactgenerator observability-stack -n flux-system --verbose
```

```
ArtifactGenerator/flux-system/observability-stack
├── HelmChart/flux-system/kube-prometheus-stack (input: prometheus)
│   ├── Status: True
│   └── Revision: 60.3.0
├── HelmChart/flux-system/loki (input: loki)
│   ├── Status: False
│   └── Message: chart pull error: failed to fetch chart
├── GitRepository/flux-system/dashboards (input: dashboards)
│   ├── Status: True
│   └── Revision: main@sha1:abc123
└── GitRepository/flux-system/alert-rules (input: alerts)
    ├── Status: True
    └── Revision: main@sha1:def456
```

This immediately shows that the `loki` HelmChart is the failing input preventing the ArtifactGenerator from reconciling.

## Step 5: Export Tree as JSON

For programmatic analysis, export the dependency tree as JSON:

```bash
flux tree artifactgenerator app-production -n flux-system -o json
```

```json
{
  "kind": "ArtifactGenerator",
  "name": "app-production",
  "namespace": "flux-system",
  "ready": true,
  "inputs": [
    {
      "name": "base",
      "kind": "GitRepository",
      "sourceRef": "platform-base",
      "ready": true,
      "revision": "main@sha1:abc123"
    },
    {
      "name": "overlay",
      "kind": "GitRepository",
      "sourceRef": "app-overlay",
      "ready": true,
      "revision": "main@sha1:def456"
    }
  ],
  "consumers": [
    {
      "kind": "Kustomization",
      "name": "app-deployment",
      "ready": true
    }
  ]
}
```

Use this with `jq` for filtering:

```bash
# Find all generators with failing inputs
flux tree artifactgenerator -A -o json | \
  jq '.[] | select(.inputs[] | .ready == false) | .name'
```

## Step 6: Visualize Cross-Namespace Dependencies

When ArtifactGenerators reference sources across namespaces, the tree shows the full namespace path:

```bash
flux tree artifactgenerator multi-tenant-app -n tenant-a
```

```
ArtifactGenerator/tenant-a/multi-tenant-app
├── GitRepository/flux-system/shared-platform (input: platform)
│   └── CrossNamespaceRef: allowed by policy
├── GitRepository/tenant-a/app-config (input: config)
│   └── url: https://github.com/tenant-a/app-config
└── Kustomization/tenant-a/app-deploy (consumer)
    └── path: ./deploy
```

## Step 7: Build Monitoring Dashboards

Use the JSON output to feed monitoring systems. Here is a script that generates Prometheus metrics from the tree data:

```bash
#!/bin/bash
# generate-metrics.sh

flux tree artifactgenerator -A -o json | jq -r '
  .[] |
  "flux_artifactgenerator_ready{name=\"\(.name)\",namespace=\"\(.namespace)\"} \(if .ready then 1 else 0 end)",
  "flux_artifactgenerator_inputs_total{name=\"\(.name)\",namespace=\"\(.namespace)\"} \(.inputs | length)",
  "flux_artifactgenerator_consumers_total{name=\"\(.name)\",namespace=\"\(.namespace)\"} \(.consumers | length)"
'
```

## Common Debugging Workflows

When a deployment is not updating, trace the full dependency chain:

```bash
# 1. Check the Kustomization
flux get kustomization app-deployment -n flux-system

# 2. Check the ArtifactGenerator it references
flux tree artifactgenerator app-production -n flux-system --verbose

# 3. Check individual failing sources
flux get source git platform-base -n flux-system
flux get source git app-overlay -n flux-system
```

When an ArtifactGenerator shows as ready but content seems stale:

```bash
# Compare input revisions
flux tree artifactgenerator app-production -n flux-system -o json | \
  jq '.inputs[] | {name: .name, revision: .revision}'
```

## Conclusion

The `flux tree` command for ArtifactGenerator resources provides an essential view into your deployment dependency graph. By visualizing which sources feed into each generator and which Kustomizations consume the output, you can quickly identify the root cause of reconciliation failures, verify that all inputs are at the expected revisions, and understand the full deployment topology. Combined with JSON output and scripting, the tree data can feed into monitoring dashboards and automated health checks for your Flux infrastructure.
