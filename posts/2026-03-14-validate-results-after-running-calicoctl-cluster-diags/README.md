# Validating Results After Running calicoctl cluster diags

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, calicoctl, Cluster Diagnostics, Validation, Kubernetes

Description: Verify that calicoctl cluster diags collected complete data and learn how to analyze the cluster diagnostic bundle for configuration issues and security concerns.

---

## Introduction

After collecting cluster diagnostics, validating the bundle ensures you have complete data for troubleshooting. A partial or corrupt bundle delays incident resolution. Beyond completeness, analyzing the diagnostic data can reveal configuration issues, security concerns, and optimization opportunities.

## Prerequisites

- A diagnostic bundle from `calicoctl cluster diags`
- Python 3 for analysis scripts
- Understanding of Calico resource types

## Validating Bundle Completeness

```bash
#!/bin/bash
# validate-cluster-diags.sh

BUNDLE="$1"
if [ -z "$BUNDLE" ]; then
  echo "Usage: $0 <cluster-diags.tar.gz>"
  exit 1
fi

echo "=== Cluster Diagnostics Validation ==="
echo "Bundle: $BUNDLE"
echo "Size: $(du -h $BUNDLE | cut -f1)"

CONTENTS=$(tar tzf "$BUNDLE")

# Check for expected resource types
EXPECTED="nodes ippools felixconfiguration bgpconfiguration"
MISSING=0

for RES in $EXPECTED; do
  if echo "$CONTENTS" | grep -qi "$RES"; then
    echo "FOUND: $RES"
  else
    echo "MISSING: $RES"
    MISSING=$((MISSING + 1))
  fi
done

echo ""
if [ $MISSING -eq 0 ]; then
  echo "Validation: PASS - all expected resources present"
else
  echo "Validation: INCOMPLETE - $MISSING resource types missing"
fi
```

## Analyzing Cluster Health from Diagnostics

```bash
#!/bin/bash
# analyze-cluster-health.sh

BUNDLE="$1"
WORK=$(mktemp -d)
tar xzf "$BUNDLE" -C "$WORK"

echo "=== Cluster Health Analysis ==="

# Count resources
echo "--- Resource Counts ---"
for f in $(find "$WORK" -name "*.yaml" -o -name "*.json"); do
  RESOURCE=$(basename "$f" | sed 's/\.\(yaml\|json\)//')
  COUNT=$(grep -c "^  name:" "$f" 2>/dev/null || echo "?")
  echo "  $RESOURCE: $COUNT"
done

# Check for common issues
echo ""
echo "--- Configuration Checks ---"

# Check IP pool utilization hints
POOL_FILES=$(find "$WORK" -name "*ippool*")
if [ -n "$POOL_FILES" ]; then
  echo "IP Pools configured:"
  grep "cidr:" $POOL_FILES 2>/dev/null | sed 's/^/  /'
fi

# Check for default-deny policies
GNP_FILES=$(find "$WORK" -name "*globalnetworkpolic*")
if [ -n "$GNP_FILES" ]; then
  if grep -q "action: Deny" $GNP_FILES 2>/dev/null; then
    echo "Default deny policies: FOUND"
  else
    echo "Default deny policies: NOT FOUND (consider adding)"
  fi
fi

rm -rf "$WORK"
```

## Verification

```bash
./validate-cluster-diags.sh calico-cluster-diags-*.tar.gz
./analyze-cluster-health.sh calico-cluster-diags-*.tar.gz
```

## Troubleshooting

- **Bundle too small**: May indicate RBAC issues prevented collection of some resources. Check the collection logs.
- **YAML parsing errors**: Some resources may have special characters. Use `python3 -c "import yaml; yaml.safe_load(open('file.yaml'))"` to validate.
- **Missing network policies**: If no policies exist, the file will be empty. This is normal for clusters without Calico network policies.

## Conclusion

Validating cluster diagnostic bundles ensures you have complete, usable data for troubleshooting. By checking for expected resources and analyzing the cluster configuration from the bundle, you can quickly identify issues and confirm the diagnostic collection captured everything needed.
