# Auditing Cilium Security Policy Limitations

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, Network Security, Security Auditing

Description: A comprehensive guide to auditing your Cilium security policies for known limitations, ensuring compliance, and generating audit reports for your Kubernetes cluster.

---

## Introduction

Auditing Cilium security policies is a critical practice for maintaining compliance and ensuring that known limitations do not create unaddressed security gaps. Regular audits help teams understand their actual security posture versus their intended posture.

This guide establishes an auditing framework that accounts for Cilium's specific limitations, including identity-based policy constraints, DNS policy caveats, and L7 inspection overhead. You will learn to generate comprehensive audit reports and track policy coverage over time.

A well-structured audit process gives security teams the visibility they need to make informed decisions about risk acceptance and compensating controls.

## Prerequisites

- A running Kubernetes cluster with Cilium (v1.14+)
- `cilium` CLI and Hubble CLI installed
- `kubectl` and `jq` available
- Access to cluster audit logs
- Knowledge of your organization's compliance requirements

## Auditing Policy Coverage

Start by assessing what percentage of your workloads have explicit Cilium network policies applied.

```bash
# Count total endpoints vs endpoints with active policies
TOTAL=$(cilium endpoint list -o json | jq 'length')
WITH_POLICY=$(cilium endpoint list -o json | \
  jq '[.[] | select(.status.policy.realized."l4-ingress" != null or .status.policy.realized."l4-egress" != null)] | length')

echo "Total endpoints: $TOTAL"
echo "Endpoints with policies: $WITH_POLICY"
echo "Coverage: $(( WITH_POLICY * 100 / TOTAL ))%"

# List endpoints without any policy
cilium endpoint list -o json | \
  jq '.[] | select(.status.policy.realized."l4-ingress" == null and .status.policy.realized."l4-egress" == null) | {id: .id, labels: .status.labels.id}'
```

### Generating a Policy Inventory

Document all policies currently in effect across the cluster.

```bash
# List all CiliumNetworkPolicies across all namespaces
kubectl get ciliumnetworkpolicies --all-namespaces -o json | \
  jq '.items[] | {
    namespace: .metadata.namespace,
    name: .metadata.name,
    endpoint_selector: .spec.endpointSelector,
    has_ingress: (.spec.ingress != null),
    has_egress: (.spec.egress != null)
  }'

# List all CiliumClusterwideNetworkPolicies
kubectl get ciliumclusterwidenetworkpolicies -o json | \
  jq '.items[] | {
    name: .metadata.name,
    scope: "cluster-wide",
    has_ingress: (.spec.ingress != null),
    has_egress: (.spec.egress != null)
  }'
```

## Auditing for Known Limitation Gaps

Check for specific patterns that may be affected by Cilium's limitations.

```yaml
# Example: Audit for missing default-deny policies
# Every namespace should have a default-deny baseline
apiVersion: "cilium.io/v2"
kind: CiliumNetworkPolicy
metadata:
  name: audit-default-deny
  namespace: production
  annotations:
    audit.company.com/reviewed: "2026-03-14"
    audit.company.com/reviewer: "security-team"
spec:
  endpointSelector: {}
  ingress: []
  egress:
    - toEndpoints:
        - matchLabels:
            io.kubernetes.pod.namespace: kube-system
            k8s-app: kube-dns
      toPorts:
        - ports:
            - port: "53"
              protocol: ANY
```

```bash
# Check which namespaces lack a default-deny policy
for ns in $(kubectl get namespaces -o jsonpath='{.items[*].metadata.name}'); do
  DENY_COUNT=$(kubectl get ciliumnetworkpolicies -n "$ns" -o json 2>/dev/null | \
    jq '[.items[] | select(.spec.ingress == [] or .spec.ingress == null)] | length')
  if [ "$DENY_COUNT" -eq 0 ]; then
    echo "WARNING: Namespace '$ns' has no default-deny policy"
  fi
done
```

## Generating Audit Reports

Create structured audit reports from your Cilium policy data.

```bash
#!/bin/bash
# generate-cilium-audit-report.sh
# Generates a JSON audit report of Cilium policy status

REPORT_DATE=$(date -u +%Y-%m-%dT%H:%M:%SZ)
OUTPUT="cilium-audit-report-$(date +%Y%m%d).json"

echo "Generating Cilium security audit report..."

# Collect policy data
POLICIES=$(kubectl get ciliumnetworkpolicies --all-namespaces -o json)
CLUSTERWIDE=$(kubectl get ciliumclusterwidenetworkpolicies -o json 2>/dev/null || echo '{"items":[]}')
ENDPOINTS=$(cilium endpoint list -o json)

# Build report
jq -n \
  --arg date "$REPORT_DATE" \
  --argjson policies "$POLICIES" \
  --argjson clusterwide "$CLUSTERWIDE" \
  --argjson endpoints "$ENDPOINTS" \
  '{
    report_date: $date,
    total_policies: ($policies.items | length),
    clusterwide_policies: ($clusterwide.items | length),
    total_endpoints: ($endpoints | length),
    namespaces_covered: ($policies.items | [.[].metadata.namespace] | unique | length)
  }' > "$OUTPUT"

echo "Report saved to $OUTPUT"
```



### Compliance Documentation and Evidence Collection

Maintaining proper documentation of your audit findings is critical for compliance frameworks such as SOC 2, ISO 27001, and PCI DSS. Generate structured evidence that maps to specific control requirements.

```bash
# Generate a timestamped evidence package
EVIDENCE_DIR="audit-evidence-$(date +%Y%m%d)"
mkdir -p "$EVIDENCE_DIR"

# Capture policy state as evidence
kubectl get cnp --all-namespaces -o yaml > "$EVIDENCE_DIR/all-policies.yaml"
kubectl get ccnp -o yaml > "$EVIDENCE_DIR/clusterwide-policies.yaml"

# Capture endpoint security state
cilium endpoint list -o json > "$EVIDENCE_DIR/endpoint-state.json"

# Capture identity mappings
cilium identity list -o json > "$EVIDENCE_DIR/identities.json"

# Capture Cilium configuration
cilium config view > "$EVIDENCE_DIR/cilium-config.txt"

# Generate a summary for auditors
echo "Audit Evidence Generated: $(date -u)" > "$EVIDENCE_DIR/summary.txt"
echo "Policies: $(kubectl get cnp -A --no-headers | wc -l)" >> "$EVIDENCE_DIR/summary.txt"
echo "Endpoints: $(cilium endpoint list -o json | jq length)" >> "$EVIDENCE_DIR/summary.txt"

tar -czf "$EVIDENCE_DIR.tar.gz" "$EVIDENCE_DIR"
echo "Evidence package created: $EVIDENCE_DIR.tar.gz"
```

Store audit evidence in a tamper-proof location with proper access controls. Retain evidence according to your organization's data retention policies, typically for a minimum of one year for most compliance frameworks.

## Verification

```bash
# Verify audit findings against actual traffic
hubble observe --verdict DROPPED --last 500 -o json | \
  jq '.flow.drop_reason_desc' | sort | uniq -c | sort -rn

# Cross-reference policy inventory with running workloads
kubectl get pods --all-namespaces -l '!io.cilium.no-policy' -o json | \
  jq '.items | length'

# Verify Cilium agent configuration is consistent
cilium config view | grep -E "policy-audit|enable-l7"
```

## Troubleshooting

- **Audit script fails on large clusters**: Increase the kubectl timeout and process namespaces in batches.
- **Missing endpoint data**: Ensure Cilium agents are healthy on all nodes with `cilium status`.
- **Policy count discrepancy**: Some policies may be in a failed state. Check with `kubectl describe cnp -A | grep -A 5 "Status"`.
- **Cannot access Hubble data**: Verify Hubble relay is deployed and accessible from your audit workstation.

## Conclusion

Regular auditing of Cilium security policies ensures that known limitations are documented, tracked, and mitigated. By automating the audit process and integrating it with your compliance workflows, you maintain continuous visibility into your cluster's security posture. Schedule audits at regular intervals, review the reports with your security team, and use the findings to improve your policy coverage and address any gaps caused by Cilium's constraints.
