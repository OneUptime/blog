# Automating Cilium Agent Hive Dependency Graph Analysis

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Hive, Automation, Kubernetes, Monitoring, DevOps

Description: Automate the collection and analysis of cilium-agent hive dependency graphs to monitor component health, detect regressions, and integrate with CI/CD pipelines.

---

## Introduction

The cilium-agent hive subsystem exposes the agent's internal dependency graph, which reveals how components are wired together and initialized. Manually inspecting this graph is useful for debugging, but automating the collection and analysis enables continuous monitoring and regression detection.

By scripting hive output collection across cluster nodes, you can compare dependency graphs between Cilium versions, detect missing components after upgrades, and integrate structural health checks into your deployment pipelines.

This guide covers practical automation patterns for the cilium-agent hive command.

## Prerequisites

- Kubernetes cluster with Cilium v1.14+
- `kubectl` configured with cluster access
- Bash scripting environment
- `jq` and `dot` (graphviz) for processing output
- Optional: CI/CD system (GitHub Actions, GitLab CI, etc.)

## Collecting Hive Data Across All Nodes

To audit the entire cluster, iterate over all Cilium pods:

```bash
#!/bin/bash
# collect-hive-graphs.sh
# Collect hive dependency graphs from all Cilium agent pods

set -euo pipefail

OUTPUT_DIR="/tmp/cilium-hive-graphs"
mkdir -p "$OUTPUT_DIR"

PODS=$(kubectl -n kube-system get pods -l k8s-app=cilium \
  -o jsonpath='{.items[*].metadata.name}')

for pod in $PODS; do
  NODE=$(kubectl -n kube-system get pod "$pod" \
    -o jsonpath='{.spec.nodeName}')
  echo "Collecting hive graph from $pod (node: $NODE)..."

  kubectl -n kube-system exec "$pod" -c cilium-agent -- \
    cilium-agent hive dot-graph > "$OUTPUT_DIR/${NODE}.dot" 2>/dev/null || \
    echo "WARNING: Failed to collect from $pod"
done

echo "Collected $(ls "$OUTPUT_DIR"/*.dot 2>/dev/null | wc -l) graphs"
ls -la "$OUTPUT_DIR"/
```

## Automated Comparison Between Versions

Track changes in the dependency graph across Cilium upgrades:

```bash
#!/bin/bash
# compare-hive-versions.sh
# Compare hive graphs between saved baseline and current cluster

set -euo pipefail

BASELINE_DIR="/tmp/cilium-hive-baseline"
CURRENT_DIR="/tmp/cilium-hive-current"

mkdir -p "$CURRENT_DIR"

# Collect current graph
CILIUM_POD=$(kubectl -n kube-system get pods -l k8s-app=cilium \
  -o jsonpath='{.items[0].metadata.name}')

kubectl -n kube-system exec "$CILIUM_POD" -c cilium-agent -- \
  cilium-agent hive dot-graph > "$CURRENT_DIR/graph.dot" 2>/dev/null

if [ ! -f "$BASELINE_DIR/graph.dot" ]; then
  echo "No baseline found. Saving current as baseline."
  mkdir -p "$BASELINE_DIR"
  cp "$CURRENT_DIR/graph.dot" "$BASELINE_DIR/graph.dot"
  exit 0
fi

# Extract node names (components) from both graphs
grep -oP 'label="[^"]*"' "$BASELINE_DIR/graph.dot" | sort > /tmp/baseline_components.txt
grep -oP 'label="[^"]*"' "$CURRENT_DIR/graph.dot" | sort > /tmp/current_components.txt

# Find additions and removals
ADDED=$(comm -13 /tmp/baseline_components.txt /tmp/current_components.txt)
REMOVED=$(comm -23 /tmp/baseline_components.txt /tmp/current_components.txt)

if [ -n "$ADDED" ]; then
  echo "=== New Components ==="
  echo "$ADDED"
fi

if [ -n "$REMOVED" ]; then
  echo "=== Removed Components ==="
  echo "$REMOVED"
fi

if [ -z "$ADDED" ] && [ -z "$REMOVED" ]; then
  echo "No component changes detected"
fi
```

## CI/CD Integration with GitHub Actions

Add hive validation to your deployment pipeline:

```yaml
# .github/workflows/cilium-hive-check.yaml
name: Cilium Hive Validation
on:
  workflow_dispatch:
  schedule:
    - cron: '0 6 * * 1'

jobs:
  validate-hive:
    runs-on: ubuntu-latest
    steps:
      - name: Set up kubectl
        uses: azure/setup-kubectl@v3

      - name: Configure kubeconfig
        run: |
          echo "${{ secrets.KUBECONFIG }}" > /tmp/kubeconfig
          export KUBECONFIG=/tmp/kubeconfig

      - name: Collect hive graph
        run: |
          CILIUM_POD=$(kubectl -n kube-system get pods -l k8s-app=cilium \
            -o jsonpath='{.items[0].metadata.name}')
          kubectl -n kube-system exec "$CILIUM_POD" -c cilium-agent -- \
            cilium-agent hive dot-graph > /tmp/hive-graph.dot

      - name: Validate expected components
        run: |
          REQUIRED="Datapath IPAM Endpoint Policy"
          for comp in $REQUIRED; do
            if grep -qi "$comp" /tmp/hive-graph.dot; then
              echo "PASS: $comp found"
            else
              echo "FAIL: $comp missing"
              exit 1
            fi
          done

      - name: Upload graph artifact
        uses: actions/upload-artifact@v4
        with:
          name: hive-graph
          path: /tmp/hive-graph.dot
```

## Rendering Graphs as Images

Convert the DOT output to visual diagrams automatically:

```bash
#!/bin/bash
# render-hive-graph.sh
# Convert hive DOT graph to PNG/SVG images

set -euo pipefail

INPUT="${1:-/tmp/cilium-hive-graphs}"
OUTPUT="${2:-/tmp/cilium-hive-images}"
mkdir -p "$OUTPUT"

for dotfile in "$INPUT"/*.dot; do
  basename=$(basename "$dotfile" .dot)
  echo "Rendering $basename..."

  # Generate PNG
  dot -Tpng "$dotfile" -o "$OUTPUT/${basename}.png" 2>/dev/null || \
    echo "WARNING: Failed to render $dotfile (install graphviz)"

  # Generate SVG for web embedding
  dot -Tsvg "$dotfile" -o "$OUTPUT/${basename}.svg" 2>/dev/null
done

echo "Rendered $(ls "$OUTPUT"/*.png 2>/dev/null | wc -l) images"
```

## Scheduled Monitoring with CronJob

Deploy an in-cluster job that regularly validates the hive state:

```yaml
# hive-monitor-cronjob.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: cilium-hive-monitor
  namespace: kube-system
spec:
  schedule: "0 */6 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: cilium
          containers:
          - name: hive-check
            image: bitnami/kubectl:latest
            command:
            - /bin/sh
            - -c
            - |
              CILIUM_POD=$(kubectl -n kube-system get pods -l k8s-app=cilium \
                -o jsonpath='{.items[0].metadata.name}')
              GRAPH=$(kubectl -n kube-system exec "$CILIUM_POD" -c cilium-agent -- \
                cilium-agent hive dot-graph 2>/dev/null)
              if [ -z "$GRAPH" ]; then
                echo "ALERT: Hive graph is empty"
                exit 1
              fi
              NODES=$(echo "$GRAPH" | grep -c "->")
              echo "Hive graph contains $NODES dependency edges"
          restartPolicy: OnFailure
```

## Verification

```bash
# Verify automation scripts work
bash collect-hive-graphs.sh
ls -la /tmp/cilium-hive-graphs/

# Verify comparison works
bash compare-hive-versions.sh

# Verify rendering (requires graphviz)
which dot && bash render-hive-graph.sh
```

## Troubleshooting

- **kubectl exec timeout on large clusters**: Add `--request-timeout=120s` and consider running collections in parallel with `xargs -P`.
- **DOT output not valid graphviz syntax**: Some Cilium versions may output non-standard DOT. Preprocess with `sed` to fix syntax issues.
- **CI pipeline cannot reach cluster**: Ensure your kubeconfig secret is current and the CI runner has network access to the API server.
- **Graph differences after every collection**: Ordering may vary. Normalize by sorting edges before comparing.

## Conclusion

Automating cilium-agent hive analysis transforms a manual debugging tool into a continuous monitoring and regression detection system. By collecting graphs across nodes, comparing versions, and integrating with CI/CD, you maintain visibility into the structural health of your Cilium deployment across upgrades and configuration changes.
