# Automating Cilium Agent Hive Dot-Graph Collection and Rendering

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Hive, Graphviz, Automation, Kubernetes, CI/CD

Description: Automate the collection, rendering, and comparison of cilium-agent hive dot-graph outputs to track dependency changes across cluster upgrades and deployments.

---

## Introduction

Manually collecting and rendering cilium-agent hive dot-graphs is straightforward for a single inspection, but teams managing multiple clusters and frequent Cilium upgrades need automation. Scripted collection, rendering, and diffing of dependency graphs ensures you catch architectural changes early.

Automated dot-graph pipelines integrate into CI/CD workflows, generating visual artifacts with every deployment and alerting on unexpected component changes. This transforms the hive dot-graph from a debugging tool into a continuous architecture monitoring system.

This guide covers end-to-end automation of the hive dot-graph workflow.

## Prerequisites

- Kubernetes cluster with Cilium v1.14+
- `kubectl` with cluster access
- Graphviz installed on the automation host
- CI/CD platform (GitHub Actions, GitLab CI, or Jenkins)
- Optional: S3 or artifact storage for graph history

## Automated Collection Script

```bash
#!/bin/bash
# collect-and-render-hive.sh
# Collect hive dot-graphs from all Cilium pods and render them

set -euo pipefail

TIMESTAMP=$(date +%Y%m%d-%H%M%S)
OUTPUT_DIR="/tmp/hive-graphs/$TIMESTAMP"
mkdir -p "$OUTPUT_DIR"

# Get all Cilium pods
PODS=$(kubectl -n kube-system get pods -l k8s-app=cilium \
  -o jsonpath='{range .items[*]}{.metadata.name},{.spec.nodeName}{"\n"}{end}')

echo "Collecting hive dot-graphs..."
while IFS=',' read -r pod node; do
  [ -z "$pod" ] && continue
  echo "  Pod: $pod (Node: $node)"

  # Collect dot-graph
  if kubectl -n kube-system exec "$pod" -c cilium-agent -- \
    cilium-agent hive dot-graph > "$OUTPUT_DIR/${node}.dot" 2>/dev/null; then

    # Render to SVG
    if command -v dot &> /dev/null; then
      dot -Tsvg "$OUTPUT_DIR/${node}.dot" -o "$OUTPUT_DIR/${node}.svg"
      dot -Tpng "$OUTPUT_DIR/${node}.dot" -o "$OUTPUT_DIR/${node}.png"
    fi
    echo "    Collected and rendered"
  else
    echo "    WARNING: Failed to collect"
  fi
done <<< "$PODS"

# Create a summary
COLLECTED=$(ls "$OUTPUT_DIR"/*.dot 2>/dev/null | wc -l)
echo ""
echo "Collected $COLLECTED graphs to $OUTPUT_DIR"
echo "Timestamp: $TIMESTAMP"
```

## Scheduled Collection with Kubernetes CronJob

Deploy an in-cluster automation that stores graphs to a PVC:

```yaml
# hive-graph-collector.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: hive-graph-collector
  namespace: kube-system
spec:
  schedule: "0 0 * * *"
  successfulJobsHistoryLimit: 7
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: cilium
          containers:
          - name: collector
            image: bitnami/kubectl:latest
            command:
            - /bin/sh
            - -c
            - |
              TIMESTAMP=$(date +%Y%m%d)
              OUTDIR="/data/hive-graphs/$TIMESTAMP"
              mkdir -p "$OUTDIR"
              PODS=$(kubectl -n kube-system get pods -l k8s-app=cilium \
                -o jsonpath='{range .items[*]}{.metadata.name} {end}')
              for pod in $PODS; do
                kubectl -n kube-system exec "$pod" -c cilium-agent -- \
                  cilium-agent hive dot-graph > "$OUTDIR/${pod}.dot" 2>/dev/null || true
              done
              echo "Collected $(ls $OUTDIR/*.dot | wc -l) graphs"
            volumeMounts:
            - name: graph-storage
              mountPath: /data
          volumes:
          - name: graph-storage
            persistentVolumeClaim:
              claimName: hive-graph-storage
          restartPolicy: OnFailure
```

## CI/CD Integration with GitHub Actions

```yaml
# .github/workflows/hive-graph-check.yaml
name: Cilium Hive Graph Monitor
on:
  schedule:
    - cron: '0 8 * * 1-5'
  workflow_dispatch:

jobs:
  collect-and-compare:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install Graphviz
        run: sudo apt-get install -y graphviz

      - name: Setup kubectl
        uses: azure/setup-kubectl@v3

      - name: Configure cluster access
        run: echo "${{ secrets.KUBECONFIG }}" | base64 -d > /tmp/kubeconfig
        env:
          KUBECONFIG: /tmp/kubeconfig

      - name: Collect hive graph
        run: |
          export KUBECONFIG=/tmp/kubeconfig
          CILIUM_POD=$(kubectl -n kube-system get pods -l k8s-app=cilium \
            -o jsonpath='{.items[0].metadata.name}')
          kubectl -n kube-system exec "$CILIUM_POD" -c cilium-agent -- \
            cilium-agent hive dot-graph > /tmp/current-hive.dot

      - name: Render graph
        run: |
          dot -Tsvg /tmp/current-hive.dot -o /tmp/hive-graph.svg
          dot -Tpng /tmp/current-hive.dot -o /tmp/hive-graph.png

      - name: Compare with baseline
        run: |
          if [ -f docs/hive-baseline.dot ]; then
            BASELINE_NODES=$(grep -c '\[label=' docs/hive-baseline.dot)
            CURRENT_NODES=$(grep -c '\[label=' /tmp/current-hive.dot)
            echo "Baseline: $BASELINE_NODES components"
            echo "Current: $CURRENT_NODES components"
            DIFF=$((CURRENT_NODES - BASELINE_NODES))
            if [ ${DIFF#-} -gt 5 ]; then
              echo "::warning::Significant change in component count: $DIFF"
            fi
          fi

      - name: Upload artifacts
        uses: actions/upload-artifact@v4
        with:
          name: hive-graphs
          path: |
            /tmp/hive-graph.svg
            /tmp/hive-graph.png
            /tmp/current-hive.dot
```

## Historical Comparison Script

```bash
#!/bin/bash
# compare-graph-history.sh
# Compare hive graphs over time and report changes

GRAPH_DIR="/tmp/hive-graphs"
REPORT="/tmp/hive-history-report.txt"

echo "Hive Graph History Report" > "$REPORT"
echo "========================" >> "$REPORT"
echo "" >> "$REPORT"

PREV=""
for dir in $(ls -d "$GRAPH_DIR"/*/ 2>/dev/null | sort); do
  TIMESTAMP=$(basename "$dir")
  DOT_FILE=$(ls "$dir"/*.dot 2>/dev/null | head -1)
  [ -z "$DOT_FILE" ] && continue

  NODES=$(grep -c '\[label=' "$DOT_FILE" 2>/dev/null || echo 0)
  EDGES=$(grep -c '\->' "$DOT_FILE" 2>/dev/null || echo 0)

  echo "$TIMESTAMP: $NODES components, $EDGES dependencies" >> "$REPORT"

  if [ -n "$PREV" ]; then
    PREV_FILE=$(ls "$PREV"/*.dot 2>/dev/null | head -1)
    if [ -n "$PREV_FILE" ]; then
      ADDED=$(comm -13 \
        <(grep '\[label=' "$PREV_FILE" | sort) \
        <(grep '\[label=' "$DOT_FILE" | sort) | wc -l)
      REMOVED=$(comm -23 \
        <(grep '\[label=' "$PREV_FILE" | sort) \
        <(grep '\[label=' "$DOT_FILE" | sort) | wc -l)
      [ "$ADDED" -gt 0 ] && echo "  +$ADDED components added" >> "$REPORT"
      [ "$REMOVED" -gt 0 ] && echo "  -$REMOVED components removed" >> "$REPORT"
    fi
  fi
  PREV="$dir"
done

cat "$REPORT"
```

## Verification

```bash
# Test the collection script
bash collect-and-render-hive.sh

# Verify outputs exist
ls -la /tmp/hive-graphs/*/

# Verify SVGs are valid
file /tmp/hive-graphs/*/*.svg | head -5

# Test the comparison script
bash compare-graph-history.sh
```

## Troubleshooting

- **Graphviz not available in CI**: Add `apt-get install graphviz` to your pipeline or use a Docker image that includes it.
- **Collection fails on some pods**: Pods may be restarting or not yet ready. Add retry logic with `--request-timeout`.
- **Large SVGs are slow to open**: Use `sfdp` engine for very large graphs or filter to specific component subtrees.
- **Storage fills up with history**: Implement retention policies in your CronJob or CI to delete graphs older than N days.

## Conclusion

Automating cilium-agent hive dot-graph collection and rendering builds a continuous monitoring layer over the Cilium agent's architecture. With scheduled collection, visual rendering, and historical comparison integrated into your CI/CD pipeline, you maintain full visibility into how the agent's internal structure evolves across upgrades and configuration changes.
