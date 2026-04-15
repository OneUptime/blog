# How to Document Dapr Architecture for Compliance

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Compliance, Documentation, Architecture, Audit

Description: Learn how to generate and maintain accurate Dapr architecture documentation for compliance audits, including data flow diagrams and component inventories.

---

## Why Architecture Documentation Matters for Compliance

Compliance frameworks like SOC 2, ISO 27001, and PCI-DSS require organizations to maintain up-to-date documentation of their system architecture, data flows, and access controls. In a dynamic Kubernetes environment, manually maintaining this documentation quickly becomes inaccurate. Automated documentation generation from live cluster state ensures compliance documentation reflects reality.

## Generating a Dapr Component Inventory

Create a script that generates a current component inventory from the cluster:

```bash
#!/bin/bash
# generate-dapr-inventory.sh

echo "# Dapr Component Inventory"
echo "Generated: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo ""
echo "## Components by Namespace"
echo ""

for ns in $(kubectl get namespaces -o jsonpath='{.items[*].metadata.name}'); do
    components=$(kubectl get components -n "$ns" 2>/dev/null)
    if [ -n "$components" ]; then
        echo "### Namespace: $ns"
        echo ""
        echo "| Name | Type | Scopes |"
        echo "| --- | --- | --- |"
        kubectl get components -n "$ns" -o json | jq -r '
          .items[] |
          "| \(.metadata.name) | \(.spec.type) | \(.scopes // [] | join(", ")) |"
        '
        echo ""
    fi
done
```

## Extracting Data Flow Diagrams with kubectl

Generate a Mermaid data flow diagram from Dapr subscriptions and components:

```python
#!/usr/bin/env python3
# generate-dapr-dataflow.py
import subprocess
import json

def get_components():
    result = subprocess.run(
        ["kubectl", "get", "components", "--all-namespaces", "-o", "json"],
        capture_output=True, text=True
    )
    return json.loads(result.stdout)["items"]

def get_subscriptions():
    result = subprocess.run(
        ["kubectl", "get", "subscriptions", "--all-namespaces", "-o", "json"],
        capture_output=True, text=True
    )
    return json.loads(result.stdout)["items"]

components = get_components()
subscriptions = get_subscriptions()

print("```mermaid")
print("graph LR")
for comp in components:
    name = comp["metadata"]["name"]
    comp_type = comp["spec"]["type"]
    scopes = comp.get("scopes", [])
    for scope in scopes:
        print(f'  {scope} --> {name}["{name}\\n{comp_type}"]')
for sub in subscriptions:
    pubsub = sub["spec"]["pubsubname"]
    topic = sub["spec"]["topic"]
    scopes = sub.get("scopes", [])
    for scope in scopes:
        print(f'  {pubsub}["{pubsub}\\ntopic: {topic}"] --> {scope}')
print("```")
```

## Automated Documentation Pipeline

Run documentation generation in a scheduled CI job:

```yaml
# .github/workflows/dapr-docs.yaml
name: Generate Dapr Architecture Docs
on:
  schedule:
  - cron: "0 0 * * 1"
  workflow_dispatch: {}

jobs:
  generate-docs:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    - name: Configure kubectl
      uses: azure/k8s-set-context@v3
      with:
        kubeconfig: ${{ secrets.KUBECONFIG }}
    - name: Generate component inventory
      run: bash scripts/generate-dapr-inventory.sh > docs/dapr-component-inventory.md
    - name: Generate data flow diagram
      run: python3 scripts/generate-dapr-dataflow.py > docs/dapr-dataflow.md
    - name: Commit updated docs
      run: |
        git config user.name "docs-bot"
        git config user.email "docs-bot@myorg.com"
        git add docs/
        git commit -m "chore: update Dapr architecture docs $(date +%Y-%m-%d)" || true
        git push
```

## Configuration Snapshot for Audit Evidence

Capture a point-in-time snapshot of all Dapr configurations as audit evidence:

```bash
#!/bin/bash
# snapshot-dapr-config.sh
SNAPSHOT_DIR="audit-evidence/$(date +%Y-%m-%d)"
mkdir -p "$SNAPSHOT_DIR"

kubectl get components --all-namespaces -o yaml > "$SNAPSHOT_DIR/components.yaml"
kubectl get configurations --all-namespaces -o yaml > "$SNAPSHOT_DIR/configurations.yaml"
kubectl get subscriptions --all-namespaces -o yaml > "$SNAPSHOT_DIR/subscriptions.yaml"

# Generate SHA256 checksums for evidence integrity
sha256sum "$SNAPSHOT_DIR"/*.yaml > "$SNAPSHOT_DIR/checksums.sha256"
echo "Snapshot saved to $SNAPSHOT_DIR"
```

## Summary

Maintaining accurate Dapr architecture documentation for compliance requires automating documentation generation from live cluster state rather than relying on hand-maintained diagrams. Schedule weekly CI jobs to regenerate component inventories and data flow diagrams from kubectl output, store them in Git for version history, and capture periodic snapshots with cryptographic checksums as audit evidence. This approach ensures compliance documentation is always current and traceable to actual cluster configuration.
