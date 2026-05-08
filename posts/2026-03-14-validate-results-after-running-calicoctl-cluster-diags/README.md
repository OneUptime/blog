# Validating Results After Running calicoctl cluster diags

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Calicoctl, Cluster Diagnostics, Validation, Kubernetes

Description: Verify that calicoctl cluster diags collected complete data and learn how to analyze the cluster diagnostic bundle for configuration issues and security concerns.

---

## Introduction

After collecting cluster diagnostics, validating the bundle ensures you have complete data for troubleshooting. A partial or corrupt bundle delays incident resolution. Beyond completeness, analyzing the diagnostic data can reveal configuration issues, security concerns, and optimization opportunities.

## Prerequisites

- A diagnostic bundle from `calicoctl cluster diags`
- Python 3 and PyYAML for the YAML validation one-liner
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
echo "Size: $(du -h "$BUNDLE" | cut -f1)"

if ! CONTENTS=$(tar tzf "$BUNDLE"); then
  echo "Validation: FAIL - bundle could not be read as a gzip-compressed tar archive"
  exit 1
fi

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
while IFS= read -r f; do
  RESOURCE=$(basename "$f" | sed 's/\.\(yaml\|json\)//')
  COUNT=$(grep -Ec "^[[:space:]]+name:" "$f" 2>/dev/null || echo "?")
  echo "  $RESOURCE: $COUNT"
done < <(find "$WORK" -type f \( -name "*.yaml" -o -name "*.json" \))

# Check for common issues
echo ""
echo "--- Configuration Checks ---"

# Check IP pool utilization hints
mapfile -t POOL_FILES < <(find "$WORK" -type f -name "*ippool*")
if [ ${#POOL_FILES[@]} -gt 0 ]; then
  echo "IP Pools configured:"
  grep -h "cidr:" "${POOL_FILES[@]}" 2>/dev/null | sed 's/^/  /'
fi

# Check for explicit deny rules in global policies
mapfile -t GNP_FILES < <(find "$WORK" -type f -name "*globalnetworkpolic*")
if [ ${#GNP_FILES[@]} -gt 0 ]; then
  if grep -q "action: Deny" "${GNP_FILES[@]}" 2>/dev/null; then
    echo "GlobalNetworkPolicy deny rules: FOUND"
  else
    echo "GlobalNetworkPolicy deny rules: NOT FOUND"
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
- **YAML parsing errors**: Install PyYAML and use `python3 -c "import yaml; yaml.safe_load(open('file.yaml'))"` to validate a YAML file.
- **Missing network policies**: If no policies exist, the corresponding file may be empty or absent. This is normal for clusters without Calico network policies.

## Conclusion

Validating cluster diagnostic bundles ensures you have complete, usable data for troubleshooting. By checking for expected resources and analyzing the cluster configuration from the bundle, you can quickly identify issues and confirm the diagnostic collection captured everything needed.
