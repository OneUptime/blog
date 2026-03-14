# Standardizing Team Workflows Around calicoctl node diags

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Calicoctl, Diagnostics, Team Workflows, Best Practices

Description: Establish team-wide standards for collecting, storing, and analyzing Calico node diagnostics to improve incident response and troubleshooting efficiency.

---

## Introduction

When every team member collects diagnostics differently, stores them in random locations, and analyzes them with ad-hoc commands, critical information gets lost. Standardizing your team's use of `calicoctl node diags` ensures that diagnostic data is consistently collected, properly archived, and readily available when incidents occur.

This guide establishes team standards for the complete diagnostic lifecycle: collection procedures, storage conventions, analysis playbooks, and retention policies.

## Prerequisites

- A team managing Calico deployments
- Shared storage for diagnostic bundles
- Documentation system for runbooks
- Agreement on standard procedures

## Diagnostic Collection Standards

### When to Collect

```yaml
# diagnostic-collection-policy.yaml
mandatory_collection:
  - trigger: "Before any Calico configuration change"
    type: "pre-change baseline"
    
  - trigger: "After any Calico configuration change"
    type: "post-change verification"
    
  - trigger: "When network connectivity issue reported"
    type: "incident diagnostic"
    
  - trigger: "Weekly scheduled collection"
    type: "routine baseline"

optional_collection:
  - trigger: "Before cluster upgrades"
  - trigger: "After node additions or removals"
  - trigger: "During performance investigations"
```

### Standard Collection Script

```bash
#!/bin/bash
# team-collect-diags.sh
# Team-standard diagnostic collection script
# Usage: ./team-collect-diags.sh <reason> [node-name]

REASON="${1:?Usage: $0 <reason> [node-name]}"
NODE="${2:-$(hostname)}"
STORAGE="/shared/calico-diags"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
COLLECTOR="${USER}"

# Create structured directory
DIAG_PATH="${STORAGE}/${TIMESTAMP}-${REASON}"
mkdir -p "$DIAG_PATH"

# Collect metadata
cat > "$DIAG_PATH/metadata.json" << EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "reason": "$REASON",
  "node": "$NODE",
  "collector": "$COLLECTOR",
  "calico_version": "$(calicoctl version 2>/dev/null | grep 'Client Version' | awk '{print $3}')",
  "cluster": "$(kubectl config current-context 2>/dev/null)"
}
EOF

# Collect node diagnostics
echo "Collecting diagnostics from $NODE..."
if [ "$NODE" = "$(hostname)" ]; then
  sudo calicoctl node diags
  mv /tmp/calico-diags-*.tar.gz "$DIAG_PATH/" 2>/dev/null
else
  POD=$(kubectl get pod -n calico-system -l k8s-app=calico-node \
    --field-selector spec.nodeName="$NODE" \
    -o jsonpath='{.items[0].metadata.name}' 2>/dev/null)
  kubectl exec -n calico-system "$POD" -- calicoctl node diags
  DIAG_FILE=$(kubectl exec -n calico-system "$POD" -- \
    sh -c 'ls -t /tmp/calico-diags-*.tar.gz | head -1')
  kubectl cp "calico-system/${POD}:${DIAG_FILE}" "$DIAG_PATH/diags.tar.gz"
fi

# Also collect cluster-level information
calicoctl get nodes -o yaml > "$DIAG_PATH/calico-nodes.yaml" 2>/dev/null
calicoctl get ippools -o yaml > "$DIAG_PATH/ippools.yaml" 2>/dev/null
calicoctl get bgpconfigurations -o yaml > "$DIAG_PATH/bgp-config.yaml" 2>/dev/null

echo ""
echo "Diagnostics saved to: $DIAG_PATH"
echo "Contents:"
ls -la "$DIAG_PATH"
```

## Storage and Naming Conventions

```text
/shared/calico-diags/
  ├── 20260314-103000-pre-upgrade/
  │   ├── metadata.json
  │   ├── calico-diags-20260314_103000.tar.gz
  │   ├── calico-nodes.yaml
  │   ├── ippools.yaml
  │   └── bgp-config.yaml
  ├── 20260314-120000-post-upgrade/
  ├── 20260314-143000-incident-connectivity/
  └── 20260315-090000-weekly-baseline/
```

## Analysis Playbook

Standard steps for analyzing diagnostic bundles:

```bash
#!/bin/bash
# team-analyze-diags.sh
# Standard analysis script for diagnostic bundles

DIAG_PATH="${1:?Usage: $0 <diagnostic-directory>}"

echo "=== Diagnostic Analysis Report ==="
echo ""

# Read metadata
if [ -f "$DIAG_PATH/metadata.json" ]; then
  echo "--- Collection Info ---"
  cat "$DIAG_PATH/metadata.json" | python3 -m json.tool
  echo ""
fi

# Extract and analyze the bundle
BUNDLE=$(ls "$DIAG_PATH"/*.tar.gz 2>/dev/null | head -1)
if [ -z "$BUNDLE" ]; then
  echo "No diagnostic bundle found in $DIAG_PATH"
  exit 1
fi

WORK_DIR=$(mktemp -d)
tar xzf "$BUNDLE" -C "$WORK_DIR"

echo "--- System Info ---"
cat $(find "$WORK_DIR" -name hostname) 2>/dev/null
cat $(find "$WORK_DIR" -name date) 2>/dev/null
echo ""

echo "--- Network Summary ---"
ROUTES=$(find "$WORK_DIR" -name ip-route)
if [ -n "$ROUTES" ]; then
  echo "Total routes: $(wc -l < $ROUTES)"
  echo "BGP routes: $(grep -c 'proto bird' $ROUTES 2>/dev/null || echo 0)"
fi
echo ""

echo "--- Error Summary ---"
find "$WORK_DIR" -type f | while read -r f; do
  ERRS=$(grep -ci "error" "$f" 2>/dev/null || echo 0)
  if [ "$ERRS" -gt 0 ]; then
    echo "  $(basename $f): $ERRS errors"
  fi
done

rm -rf "$WORK_DIR"
```

## Retention Policy

```bash
#!/bin/bash
# cleanup-diags.sh
# Enforces retention policy for diagnostic bundles

STORAGE="/shared/calico-diags"

# Keep incident diagnostics for 90 days
find "$STORAGE" -name "*incident*" -mtime +90 -exec rm -rf {} +

# Keep pre/post change diagnostics for 30 days
find "$STORAGE" -name "*pre-*" -o -name "*post-*" | while read -r d; do
  if [ $(find "$d" -maxdepth 0 -mtime +30 | wc -l) -gt 0 ]; then
    rm -rf "$d"
  fi
done

# Keep weekly baselines for 14 days
find "$STORAGE" -name "*weekly*" -mtime +14 -exec rm -rf {} +

echo "Cleanup complete."
```

## Verification

Test the team workflows:

```bash
# Collect using team script
./team-collect-diags.sh test-collection

# Analyze the collection
./team-analyze-diags.sh /shared/calico-diags/$(ls -t /shared/calico-diags/ | head -1)
```

## Troubleshooting

- **Shared storage not accessible**: Ensure all team members have write access to the diagnostic storage directory.
- **Metadata file incomplete**: Verify kubectl and calicoctl are configured in the collection environment.
- **Analysis script fails on older bundles**: Different Calico versions may produce bundles with different structures. Add version-aware logic to the analysis script.

## Conclusion

Standardized diagnostic collection and analysis transforms troubleshooting from an individual effort into a team capability. By following consistent procedures for when and how to collect diagnostics, where to store them, and how to analyze them, your team builds a diagnostic knowledge base that accelerates incident resolution and improves operational maturity.
