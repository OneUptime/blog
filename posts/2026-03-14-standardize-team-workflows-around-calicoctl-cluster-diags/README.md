# Standardizing Team Workflows Around calicoctl cluster diags

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, calicoctl, Cluster Diagnostics, Team Workflows, Best Practices

Description: Establish team-wide procedures for collecting, archiving, and analyzing cluster diagnostics to improve operational consistency and incident response.

---

## Introduction

Cluster-wide diagnostics provide the most complete picture of a Calico deployment. When every team member follows the same procedures for collecting and archiving these diagnostics, the team builds a valuable history of cluster states that accelerates troubleshooting and supports audit requirements.

## Prerequisites

- A team managing Calico clusters
- Shared storage for diagnostic archives
- Documented operational procedures

## Standard Collection Procedures

### When to Collect Cluster Diagnostics

```yaml
mandatory:
  - "Before any Calico upgrade"
  - "After any Calico upgrade"
  - "Before major policy changes"
  - "During incident response"
  - "Weekly baseline collection"

recommended:
  - "Before node scaling operations"
  - "After IP pool changes"
  - "When preparing support cases"
```

### Team Collection Script

```bash
#!/bin/bash
# team-cluster-diags.sh
# Usage: ./team-cluster-diags.sh <reason>

REASON="${1:?Usage: $0 <reason>}"
STORAGE="/shared/cluster-diags"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

DIAG_PATH="${STORAGE}/${TIMESTAMP}-${REASON}"
mkdir -p "$DIAG_PATH"

# Metadata
cat > "$DIAG_PATH/metadata.json" << EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "reason": "$REASON",
  "collector": "$USER",
  "cluster": "$(kubectl config current-context 2>/dev/null)",
  "calico_version": "$(calicoctl version 2>/dev/null | grep 'Cluster Version' | awk '{print $3}')"
}
EOF

# Collect
calicoctl cluster diags 2>/dev/null
mv calico-cluster-diags-*.tar.gz "$DIAG_PATH/" 2>/dev/null

# Additional context
calicoctl version > "$DIAG_PATH/version.txt" 2>&1
kubectl get nodes -o wide > "$DIAG_PATH/nodes.txt" 2>&1
kubectl get pods -n calico-system -o wide > "$DIAG_PATH/calico-pods.txt" 2>&1

echo "Cluster diagnostics saved to: $DIAG_PATH"
```

## Archive and Retention

```bash
#!/bin/bash
# manage-diag-archive.sh

STORAGE="/shared/cluster-diags"

# List available diagnostics
echo "=== Available Diagnostic Collections ==="
for d in $(ls -dt "$STORAGE"/*/); do
  META="$d/metadata.json"
  if [ -f "$META" ]; then
    REASON=$(python3 -c "import json; print(json.load(open('$META')).get('reason','unknown'))" 2>/dev/null)
    DATE=$(basename "$d" | cut -d- -f1-2)
    echo "  $DATE - $REASON"
  fi
done

# Cleanup old baselines (keep 4 weeks)
find "$STORAGE" -name "*weekly*" -maxdepth 1 -mtime +28 -exec rm -rf {} +
echo ""
echo "Cleanup complete."
```

## Verification

```bash
# Collect using team script
./team-cluster-diags.sh pre-upgrade

# List archives
./manage-diag-archive.sh

# Verify collection
ls -la /shared/cluster-diags/$(ls -t /shared/cluster-diags/ | head -1)/
```

## Troubleshooting

- **Storage full**: Implement automated cleanup with retention policies.
- **Team members not collecting before changes**: Add diagnostic collection as a required step in your change management checklist.
- **Different calicoctl versions producing different bundles**: Standardize the calicoctl version used for diagnostic collection.

## Conclusion

Standardized cluster diagnostic workflows create a valuable historical record of your Calico deployment state. By following consistent collection, archiving, and analysis procedures, your team always has the diagnostic data needed for effective troubleshooting and maintains an audit trail of cluster configuration over time.
