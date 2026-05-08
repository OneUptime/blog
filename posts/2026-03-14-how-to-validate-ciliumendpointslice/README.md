# Validating CiliumEndpointSlice Configuration and Health

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, Validation, EndpointSlice, Networking

Description: How to validate CiliumEndpointSlice resources to ensure proper endpoint batching, data consistency, and correctness in large Kubernetes clusters.

---

## Introduction

CiliumEndpointSlice validation ensures endpoint batching works correctly and no endpoints are lost or stale. CES validation must check the relationship between individual endpoints and their slice representation, confirm the operator maintains slices correctly, and verify downstream consumers see a consistent view.

Validation is especially important after Cilium upgrades, operator restarts, or CES configuration changes.

This guide provides comprehensive validation checks for CES resources.

## Prerequisites

- Kubernetes cluster with Cilium and CES enabled
- kubectl and Cilium CLI configured
- jq installed for JSON processing

## Validating CES Feature Enablement

```bash
# Check the CRD is established

kubectl get crd ciliumendpointslices.cilium.io \
  -o jsonpath='{.status.conditions[?(@.type=="Established")].status}'

# Check Cilium configuration
kubectl get configmap cilium-config -n kube-system \
  -o jsonpath='{.data.enable-cilium-endpoint-slice}'
```

## Validating Endpoint Coverage

```bash
#!/bin/bash
# validate-ces-coverage.sh

echo "=== CES Coverage Validation ==="

CEP_NAMES=$(kubectl get ciliumendpoints --all-namespaces -o json | \
  jq -r '.items[] | "\(.metadata.namespace)/\(.metadata.name)"' | sort)
CEP_COUNT=$(printf '%s\n' "$CEP_NAMES" | sed '/^$/d' | wc -l)

CES_NAMES=$(kubectl get ciliumendpointslices --all-namespaces -o json | \
  jq -r '.items[] | .namespace as $ns | .endpoints[]? | "\($ns)/\(.name)"' | sort)
CES_EP_COUNT=$(printf '%s\n' "$CES_NAMES" | sed '/^$/d' | wc -l)

echo "Individual CiliumEndpoints: $CEP_COUNT"
echo "Endpoints in CiliumEndpointSlices: $CES_EP_COUNT"

DUPES=$(echo "$CES_NAMES" | sort | uniq -d)
if [ -n "$DUPES" ]; then
  echo "FAIL: Duplicate endpoints found in slices"
else
  echo "PASS: No duplicate endpoints in slices"
fi

MISSING=$(comm -23 <(printf '%s\n' "$CEP_NAMES") <(printf '%s\n' "$CES_NAMES"))
STALE=$(comm -13 <(printf '%s\n' "$CEP_NAMES") <(printf '%s\n' "$CES_NAMES"))
if [ -n "$MISSING" ]; then
  echo "FAIL: CiliumEndpoints missing from slices"
  echo "$MISSING"
fi
if [ -n "$STALE" ]; then
  echo "FAIL: Stale endpoints found in slices"
  echo "$STALE"
fi
if [ -z "$MISSING" ] && [ -z "$STALE" ]; then
  echo "PASS: Slice coverage matches CiliumEndpoints"
fi
```

```mermaid
graph TD
    A[Start Validation] --> B[Check CRD Exists]
    B --> C[Check Feature Enabled]
    C --> D[Validate Coverage]
    D --> E[Check for Duplicates]
    E --> F[Validate Slice Sizes]
    F --> G{All Pass?}
    G -->|Yes| H[Validation Complete]
    G -->|No| I[Report Issues]
```

## Validating Slice Size Distribution

```bash
# Show distribution of endpoints per slice
kubectl get ciliumendpointslices --all-namespaces -o json | \
  jq '[.items[] | {name: .metadata.name, count: (.endpoints // [] | length)}] |
  sort_by(.count) | reverse | .[:10]'

# Check for empty slices
kubectl get ciliumendpointslices --all-namespaces -o json | \
  jq '[.items[] | select((.endpoints // []) | length == 0)] | length'
```

## Validating Data Consistency

```bash
#!/bin/bash
# validate-ces-data.sh - Sample endpoints and compare

SAMPLE=$(kubectl get ciliumendpoints -n default \
  -o jsonpath='{.items[:3].metadata.name}')

for ep in $SAMPLE; do
  CEP_ID=$(kubectl get ciliumendpoint "$ep" -n default \
    -o jsonpath='{.status.identity.id}')
  CES_ID=$(kubectl get ciliumendpointslices --all-namespaces -o json | \
    jq -r --arg name "$ep" \
    '.items[] | select(.namespace == "default") | .endpoints[]? | select(.name == $name) | .id')
  if [ "$CEP_ID" = "$CES_ID" ]; then
    echo "PASS: $ep identity matches (ID: $CEP_ID)"
  else
    echo "FAIL: $ep identity mismatch (CEP: $CEP_ID, CES: $CES_ID)"
  fi
done
```

## Verification

```bash
cilium status
echo "CES total: $(kubectl get ciliumendpointslices --all-namespaces -o json | \
  jq '[.items[].endpoints[]?] | length')"
echo "CEP total: $(kubectl get ciliumendpoints --all-namespaces --no-headers | wc -l)"
```

## Troubleshooting

- **Missing endpoints in slices**: Operator may be behind on reconciliation. Wait or restart operator.
- **Empty slices persist**: Check operator logs for GC errors.
- **Data consistency failures**: Restart operator and re-validate.
- **Large variance in slice sizes**: Normal during scaling events. Re-validate after stabilization.

## Conclusion

Validating CiliumEndpointSlice ensures the scalability optimization works correctly without losing endpoint data. Run coverage checks after upgrades and data consistency checks during audits.
