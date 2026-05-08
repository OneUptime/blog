# Auditing DaemonSet Deployment in Cilium

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, Network Security, DaemonSet, Security Auditing

Description: Learn how to audit DaemonSet deployment model in Cilium for Kubernetes. This guide covers practical compliance verification with real examples and commands.

---

## Introduction

Auditing DaemonSet deployment model in Cilium is essential for maintaining compliance, tracking policy changes, and ensuring that your security controls meet organizational requirements. Regular audits help identify gaps, unused policies, and potential misconfigurations.

A comprehensive audit examines policy coverage, endpoint identity assignments, traffic patterns, and configuration consistency across all cluster nodes. This guide provides a structured auditing framework for your agent deployment configuration.

By establishing regular audit procedures, your security team can maintain continuous visibility into the cluster's network security posture and demonstrate compliance with internal and external standards.

## Prerequisites

- Kubernetes cluster with Cilium (v1.14+) installed
- `cilium` CLI, `cilium-dbg` in the Cilium agent pods, and Hubble CLI available
- `kubectl` and `jq` installed
- Access to cluster audit logs
- Knowledge of your compliance requirements

## Policy Inventory Audit

Start by creating a complete inventory of all Cilium network policies:

```bash
# Inventory all policies across the cluster

kubectl get cnp --all-namespaces -o json | jq '.items[] | {ns: .metadata.namespace, name: .metadata.name}'
kubectl get ccnp -o json | jq '.items[] | {name: .metadata.name}'
```

```mermaid
graph TD
    A[Start Audit] --> B[Inventory All Policies]
    B --> C[Check Policy Coverage]
    C --> D[Review Endpoint Identities]
    D --> E[Analyze Traffic Patterns]
    E --> F[Check for Default-Deny]
    F --> G[Review Drop Statistics]
    G --> H[Generate Audit Report]
    H --> I{Gaps Found?}
    I -->|Yes| J[Document Remediation Plan]
    I -->|No| K[Audit Complete]
    J --> K
```

### Checking Policy Coverage

```bash
# Check policy coverage for all endpoints
kubectl get cep --all-namespaces -o json | jq '[.items[] | .status.policy.realized] | length'

# Identify endpoints without any policy
kubectl get cep --all-namespaces -o json | \
  jq '.items[] | select(
    .status.policy.realized."policy-enabled" == "none"
  ) | {id: .status.id, labels: .status.labels.id}'
```

## Configuration Audit

Verify that Cilium is configured with the expected security settings:

```bash
# Review Cilium configuration for security settings
cilium config view | grep -E 'policy|audit|monitor'

# Check for consistent configuration across nodes
kubectl -n kube-system get pods -l k8s-app=cilium -o name | while read pod; do
  echo "=== $pod ==="
  kubectl -n kube-system exec "$pod" -c cilium-agent -- \
    sh -c 'for key in enable-policy enable-l7-proxy enable-hubble; do cilium-dbg config get "$key"; done'
done
```

## Auditing Existing Policies

Review the policies currently in place for completeness and correctness:

```yaml
# Example of a host policy with audit annotations
apiVersion: "cilium.io/v2"
kind: CiliumClusterwideNetworkPolicy
metadata:
  name: daemonset-agent-policy
  annotations:
    audit.oneuptime.com/owner: "platform-security"
    audit.oneuptime.com/reviewed: "2026-03-14"
spec:
  nodeSelector:
    matchLabels:
      node-role.kubernetes.io/worker: ""
  ingress:
    - fromEntities:
        - cluster
        - health
    - fromCIDR:
        - 10.0.0.0/8
      toPorts:
        - ports:
            - port: "4240"
              protocol: TCP
            - port: "4244"
              protocol: TCP
            - port: "9962"
              protocol: TCP
            - port: "9963"
              protocol: TCP
```

```bash
# Check for policies without proper annotations
kubectl get cnp --all-namespaces -o json | \
  jq '.items[] | select(.metadata.annotations == null) | {
    namespace: .metadata.namespace,
    name: .metadata.name,
    warning: "Missing audit annotations"
  }'
```

## Generating Audit Reports

Create structured audit reports for compliance documentation:

```bash
#!/bin/bash
# generate-audit-report.sh
# Creates a comprehensive Cilium audit report

REPORT_DATE=$(date -u +%Y-%m-%dT%H:%M:%SZ)
OUTPUT="cilium-audit-$(date +%Y%m%d).json"

# Gather audit data
TOTAL_ENDPOINTS=$(kubectl get cep --all-namespaces -o json | jq '.items | length')
TOTAL_POLICIES=$(kubectl get cnp --all-namespaces -o json | jq '.items | length')
TOTAL_CCNP=$(kubectl get ccnp -o json 2>/dev/null | jq '.items | length' 2>/dev/null || echo 0)

# Count endpoints with policies
COVERED=$(kubectl get cep --all-namespaces -o json | \
  jq '[.items[] | select(
    .status.policy.realized."policy-enabled" != null and
    .status.policy.realized."policy-enabled" != "none"
  )] | length')

# Build JSON report
jq -n \
  --arg date "$REPORT_DATE" \
  --argjson endpoints "$TOTAL_ENDPOINTS" \
  --argjson policies "$TOTAL_POLICIES" \
  --argjson ccnp "$TOTAL_CCNP" \
  --argjson covered "$COVERED" \
  '{
    audit_date: $date,
    summary: {
      total_endpoints: $endpoints,
      total_namespace_policies: $policies,
      total_clusterwide_policies: $ccnp,
      endpoints_with_policy: $covered,
      coverage_percentage: (if $endpoints > 0 then ($covered * 100 / $endpoints) else 0 end)
    }
  }' > "$OUTPUT"

echo "Audit report saved to $OUTPUT"
cat "$OUTPUT" | jq .
```

## Verification

```bash
# Generate audit summary
kubectl get cnp --all-namespaces -o json | jq -r '.items[].metadata.name'
kubectl get ccnp -o json | jq -r '.items[].metadata.name'
```

```bash
# Review drop statistics
hubble observe --verdict DROPPED --last 100 -o json | jq -r '.flow.drop_reason_desc' | sort | uniq -c | sort -rn
```

```bash
# Verify endpoint identity assignments
kubectl get cep --all-namespaces -o json | \
  jq -r '.items[] | [.metadata.namespace, .metadata.name, .status.identity.id] | @tsv' | head -30
```

## Troubleshooting

- **Audit script times out on large clusters**: Process namespaces in batches and increase kubectl request timeout.
- **Inconsistent data across nodes**: Ensure all Cilium agents are running the same version with `cilium version`.
- **Cannot access Hubble metrics**: Verify Hubble is enabled and the relay is healthy.
- **Policy count mismatch**: Some policies may be in a failed state. Check Cilium policy status with `kubectl describe cnp -A` and `kubectl describe ccnp`.

## Conclusion

Regular auditing of DaemonSet deployment model in Cilium provides the visibility needed to maintain a strong security posture. By automating audit report generation and integrating it into your compliance workflows, you can ensure that policy coverage remains comprehensive and that no gaps go undetected. Schedule audits at regular intervals, review findings with your security team, and use the results to drive continuous improvement in your network security configuration.
