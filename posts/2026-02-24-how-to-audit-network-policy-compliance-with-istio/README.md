# How to Audit Network Policy Compliance with Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Audit, Compliance, Network Policies, Security, Observability

Description: How to audit and verify that your Istio network policies are correctly enforced and compliant with your organization's security requirements.

---

Having network policies in place is only half the battle. You also need to verify that they're actually working, that they cover all your services, and that they meet your compliance requirements. Whether you're working toward SOC 2, PCI DSS, HIPAA, or just following your own internal security standards, regular auditing of your Istio network policies is essential. Here's how to do it systematically.

## What to Audit

A network policy audit should answer several questions:

- Are all namespaces covered by authorization policies?
- Are default-deny policies in place where required?
- Are there services that can be reached by anyone in the mesh?
- Is mTLS enforced everywhere?
- Do the actual traffic patterns match the defined policies?
- Are there stale policies that reference services that no longer exist?

## Checking mTLS Enforcement

The foundation of policy enforcement in Istio is mutual TLS. If mTLS isn't enabled, your authorization policies based on service identity won't work correctly.

Check the mesh-wide PeerAuthentication policy:

```bash
kubectl get peerauthentication -A
```

Verify it's set to STRICT:

```bash
kubectl get peerauthentication default -n istio-system -o yaml
```

You should see:

```yaml
spec:
  mtls:
    mode: STRICT
```

Check for any namespace-level overrides that might weaken mTLS:

```bash
kubectl get peerauthentication -A -o jsonpath='{range .items[*]}{.metadata.namespace}/{.metadata.name}: {.spec.mtls.mode}{"\n"}{end}'
```

If any namespace has `PERMISSIVE` or `DISABLE`, flag it for review.

## Inventorying Authorization Policies

Get a full list of all authorization policies across your cluster:

```bash
kubectl get authorizationpolicy -A
```

For a more detailed view:

```bash
kubectl get authorizationpolicy -A -o yaml > all-auth-policies.yaml
```

Check which namespaces don't have a default-deny policy:

```bash
#!/bin/bash
NAMESPACES=$(kubectl get ns -o jsonpath='{.items[*].metadata.name}')
for ns in $NAMESPACES; do
  DENY=$(kubectl get authorizationpolicy -n $ns -o jsonpath='{range .items[*]}{.spec}{"\n"}{end}' 2>/dev/null | grep -c '{}')
  if [ "$DENY" -eq "0" ]; then
    echo "WARNING: No default-deny policy in namespace: $ns"
  fi
done
```

## Using istioctl for Configuration Analysis

Istio provides built-in analysis that catches common configuration issues:

```bash
istioctl analyze --all-namespaces
```

This will flag things like:

- Authorization policies that reference non-existent services
- Conflicting policies
- Missing sidecar injection
- Misconfigured mTLS settings

For a specific namespace:

```bash
istioctl analyze -n production
```

## Auditing Actual Traffic Against Policies

Your policies define what should be allowed. Your actual traffic tells you what's really happening. Compare the two.

Query Prometheus for all active service-to-service communication:

```text
sum(rate(istio_requests_total{reporter="destination"}[24h])) by (source_workload, source_workload_namespace, destination_workload, destination_workload_namespace, response_code) > 0
```

Export this data and compare it against your authorization policies. Look for:

1. **Traffic that flows but shouldn't**: A service communicating with another service that your policy intends to block. This could indicate a missing policy or a policy that's too permissive.

2. **Policies that allow traffic that never happens**: These are stale rules that should be tightened or removed. They increase your attack surface unnecessarily.

3. **Denied traffic (403 responses)**: Expected denials confirm your policies are working. Unexpected denials might indicate misconfigured policies that are breaking legitimate traffic.

```text
sum(rate(istio_requests_total{response_code="403",reporter="destination"}[24h])) by (source_workload, destination_workload) > 0
```

## Checking for Sidecar Injection Gaps

Authorization policies only work on pods with Istio sidecars. Any pod without a sidecar bypasses your policies entirely.

Find pods without sidecars:

```bash
kubectl get pods -A -o jsonpath='{range .items[?(@.spec.containers[*].name!="istio-proxy")]}{.metadata.namespace}/{.metadata.name}{"\n"}{end}'
```

A more reliable approach is to check for pods that have fewer containers than expected:

```bash
kubectl get pods -A -o custom-columns=NAMESPACE:.metadata.namespace,NAME:.metadata.name,CONTAINERS:.spec.containers[*].name | grep -v istio-proxy
```

Some namespaces (like `kube-system`) won't have sidecars, and that's expected. But any application namespace should have injection enabled.

Check namespace labels:

```bash
kubectl get ns -L istio-injection
```

Namespaces without the `istio-injection=enabled` label (or the newer `istio.io/rev` label for revision-based injection) won't get automatic sidecar injection.

## Generating Compliance Reports

For formal compliance, you need documented evidence. Create a script that generates a compliance report:

```bash
#!/bin/bash
echo "=== Istio Network Policy Compliance Report ==="
echo "Generated: $(date)"
echo ""

echo "=== mTLS Configuration ==="
kubectl get peerauthentication -A -o yaml
echo ""

echo "=== Authorization Policies ==="
kubectl get authorizationpolicy -A -o yaml
echo ""

echo "=== Sidecar Injection Status ==="
kubectl get ns -L istio-injection -L istio.io/rev
echo ""

echo "=== Pods Without Sidecars ==="
for ns in $(kubectl get ns -o jsonpath='{.items[*].metadata.name}'); do
  PODS=$(kubectl get pods -n $ns -o jsonpath='{range .items[*]}{.metadata.name}{" "}{.spec.containers[*].name}{"\n"}{end}' 2>/dev/null)
  echo "$PODS" | while read line; do
    if [[ ! "$line" == *"istio-proxy"* ]] && [[ ! -z "$line" ]]; then
      echo "  $ns: $line"
    fi
  done
done
echo ""

echo "=== Istio Configuration Analysis ==="
istioctl analyze --all-namespaces 2>&1
```

Save this as a script and run it regularly, piping the output to a file for your audit records.

## Automated Policy Validation in CI/CD

Don't wait for manual audits to catch problems. Validate policies as part of your CI/CD pipeline.

Use `istioctl analyze` in dry-run mode:

```bash
istioctl analyze --use-kube=false -A my-policies/*.yaml
```

This validates your policy YAML files without applying them to a live cluster.

You can also write OPA (Open Policy Agent) rules to enforce your organization's policy standards:

```rego
package istio.authz

deny[msg] {
  input.kind == "AuthorizationPolicy"
  input.metadata.namespace == "production"
  not has_deny_all(input.metadata.namespace)
  msg := sprintf("Namespace %s must have a default-deny policy", [input.metadata.namespace])
}

has_deny_all(ns) {
  some policy
  data.policies[policy].metadata.namespace == ns
  data.policies[policy].spec == {}
}
```

## Periodic Audit Checklist

Run through this checklist on a regular schedule (monthly or quarterly):

1. Verify mesh-wide STRICT mTLS is enabled
2. Confirm every application namespace has a default-deny policy
3. Review all ALLOW policies for unnecessary breadth
4. Check for pods without sidecars in application namespaces
5. Compare actual traffic patterns against defined policies
6. Remove policies that reference deleted services
7. Verify ingress gateway policies are restrictive
8. Check egress policies for data exfiltration risks
9. Run `istioctl analyze` and address all warnings
10. Update compliance documentation with findings

## Handling Audit Findings

When your audit reveals issues, prioritize them:

**Critical**: Pods without sidecars in secured namespaces, missing default-deny policies in production, mTLS not set to STRICT. Fix these immediately.

**High**: Overly broad ALLOW rules, stale policies, missing egress restrictions. Schedule fixes within the current sprint.

**Medium**: Minor policy optimizations, documentation gaps, missing monitoring alerts. Track in your backlog.

Regular auditing keeps your security posture from degrading over time. Services change, teams add new workloads, and configurations drift. An audit process catches these issues before they become incidents.
