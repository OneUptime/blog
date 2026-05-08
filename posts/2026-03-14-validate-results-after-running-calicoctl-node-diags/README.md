# Validating Results After Running calicoctl node diags

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Calicoctl, Diagnostic, Validation, Kubernetes

Description: Learn how to validate diagnostic bundles from calicoctl node diags are complete and how to analyze the collected data to identify networking issues.

---

## Introduction

After collecting diagnostics with `calicoctl node diags`, you need to validate that the bundle is complete and then analyze its contents to find the information you need. An incomplete bundle wastes time during critical troubleshooting, while an unanalyzed bundle is worthless.

This guide covers how to verify diagnostic bundle completeness and how to extract actionable insights from the collected data.

## Prerequisites

- A diagnostic bundle collected with `calicoctl node diags`
- Linux tools: tar, grep, awk
- Understanding of Calico networking components

## Validating Bundle Completeness

```bash
#!/bin/bash
# validate-diag-bundle.sh

# Validates that a Calico diagnostic bundle contains all expected files

BUNDLE="$1"

if [ -z "$BUNDLE" ] || [ ! -f "$BUNDLE" ]; then
  echo "Usage: $0 <calico-diags.tar.gz>"
  exit 1
fi

echo "Validating bundle: $BUNDLE"
echo "Size: $(du -h $BUNDLE | cut -f1)"
echo ""

CONTENTS=$(tar tzf "$BUNDLE")

EXPECTED_FILES=(
  "diagnostics/date"
  "diagnostics/hostname"
  "diagnostics/ipv4_addr"
  "diagnostics/ipv4_route"
  "diagnostics/ipv4_tables"
)

WARNINGS=0
for FILE in "${EXPECTED_FILES[@]}"; do
  if echo "$CONTENTS" | grep -qx "$FILE"; then
    echo "FOUND: $FILE"
  else
    echo "MISSING: $FILE"
    WARNINGS=$((WARNINGS + 1))
  fi
done

# Check for log directories
echo ""
echo "Log files:"
LOG_COUNT=$(echo "$CONTENTS" | grep -c "log" || true)
echo "  Total log entries: $LOG_COUNT"

echo ""
if [ $WARNINGS -eq 0 ]; then
  echo "Bundle validation: PASS"
else
  echo "Bundle validation: INCOMPLETE ($WARNINGS missing files)"
fi
```

## Analyzing Key Diagnostic Data

### Extracting and Reviewing iptables

```bash
# Extract the bundle
DIAG_DIR=$(mktemp -d)
tar xzf calico-diags.tar.gz -C "$DIAG_DIR"

# Analyze iptables rules
echo "=== iptables Summary ==="
IPTABLES_FILE=$(find "$DIAG_DIR" -name "ipv4_tables" | head -1)
echo "Total rules: $(wc -l < "$IPTABLES_FILE")"
echo "Calico chains: $(grep -c 'cali-' "$IPTABLES_FILE" || true)"
echo "DROP rules: $(grep -c 'DROP' "$IPTABLES_FILE" || true)"
echo "ACCEPT rules: $(grep -c 'ACCEPT' "$IPTABLES_FILE" || true)"
```

### Analyzing Routes

```bash
echo "=== Route Summary ==="
ROUTES_FILE=$(find "$DIAG_DIR" -name "ipv4_route" | head -1)
echo "Total routes: $(wc -l < "$ROUTES_FILE")"
echo "BGP routes: $(grep -c 'proto bird' "$ROUTES_FILE" || true)"
echo "Blackhole routes: $(grep -c 'blackhole' "$ROUTES_FILE" || true)"
echo "Default route: $(grep '^default' "$ROUTES_FILE")"
```

### Checking for Errors in Logs

```bash
echo "=== Error Summary ==="
find "$DIAG_DIR" -name "*.log" -o -name "current" | while read -r logfile; do
  ERRORS=$(grep -ci "error" "$logfile" 2>/dev/null || true)
  if [ "$ERRORS" -gt 0 ]; then
    echo "  $logfile: $ERRORS errors"
    grep -i "error" "$logfile" | tail -3 | sed 's/^/    /'
  fi
done
```

## Comparing Diagnostic Bundles

Compare two bundles to identify what changed:

```bash
#!/bin/bash
# compare-diags.sh
# Compares two diagnostic bundles

BEFORE="$1"
AFTER="$2"

BEFORE_DIR=$(mktemp -d)
AFTER_DIR=$(mktemp -d)

tar xzf "$BEFORE" -C "$BEFORE_DIR"
tar xzf "$AFTER" -C "$AFTER_DIR"

echo "=== Route Changes ==="
diff <(find "$BEFORE_DIR" -name ipv4_route -exec cat {} + | sort) <(find "$AFTER_DIR" -name ipv4_route -exec cat {} + | sort)

echo ""
echo "=== iptables Rule Count Changes ==="
BEFORE_RULES=$(find "$BEFORE_DIR" -name ipv4_tables -exec cat {} + | wc -l)
AFTER_RULES=$(find "$AFTER_DIR" -name ipv4_tables -exec cat {} + | wc -l)
echo "Before: $BEFORE_RULES rules, After: $AFTER_RULES rules"

rm -rf "$BEFORE_DIR" "$AFTER_DIR"
```

## Verification

Verify your analysis process:

```bash
# Validate the bundle
./validate-diag-bundle.sh calico-diags.tar.gz

# Extract and check key files
tar tzf calico-diags.tar.gz | head -20
```

## Troubleshooting

- **Bundle appears empty**: Check if calicoctl had the right permissions during collection. Re-collect with sudo.
- **Log files are truncated**: Logs may have rotated since the issue occurred. Collect diagnostics as soon as an issue is detected.
- **Cannot compare bundles**: Ensure both bundles are from the same node or at least the same cluster for meaningful comparison.

## Conclusion

Validating and analyzing `calicoctl node diags` bundles is a skill that directly impacts troubleshooting speed. By systematically checking bundle completeness, analyzing key files, and comparing before-and-after snapshots, you extract maximum value from the diagnostic data and resolve issues faster.
