# How to Conduct Istio Architecture Reviews

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Architecture Review, Platform Engineering, Kubernetes, Best Practices

Description: Run effective Istio architecture reviews to catch configuration issues, evaluate mesh design decisions, and ensure your service mesh scales with your organization.

---

An Istio architecture review is a structured evaluation of your mesh configuration, design decisions, and operational practices. It is the mesh equivalent of a code review, but instead of looking at application code, you are reviewing how services communicate, how traffic is managed, and how security policies are enforced. Running these reviews regularly catches issues before they become incidents and helps your mesh evolve cleanly as your organization grows.

## When to Do an Architecture Review

Schedule architecture reviews at these points:

- **Before production launch**: Review the entire mesh setup before going live
- **Quarterly**: Regular reviews to catch drift and reassess decisions
- **Before major changes**: Adding a new cluster, upgrading Istio, onboarding a large number of services
- **After incidents**: Part of the post-incident process to prevent recurrence
- **When onboarding new teams**: Review their planned Istio usage before they start deploying

## Review Checklist: Control Plane

Start with the Istio control plane itself:

### Istiod Health

```bash
# Check istiod pods
kubectl get pods -n istio-system -l app=istiod

# Check istiod resource usage
kubectl top pods -n istio-system -l app=istiod

# Check for configuration push errors
kubectl logs deploy/istiod -n istio-system --tail=100 | grep -c "error"

# Check proxy sync status
istioctl proxy-status | grep -v "SYNCED"
```

**Review questions**:
- Is istiod running with enough replicas for your cluster size?
- Are resource limits set appropriately?
- Is there a PodDisruptionBudget for istiod?
- Is the istiod deployment spread across availability zones?

### Istiod Configuration

```bash
# Check mesh configuration
kubectl get configmap istio -n istio-system -o yaml
```

**Review questions**:
- Is access logging enabled?
- Is the tracing sampling rate appropriate (not too high for production)?
- Is the protocol detection timeout set correctly?
- Is outbound traffic policy set to `REGISTRY_ONLY` or `ALLOW_ANY`? (REGISTRY_ONLY is more secure but requires ServiceEntries for every external dependency)

## Review Checklist: Data Plane

### Sidecar Injection

```bash
# Check which namespaces have injection enabled
kubectl get namespaces -l istio-injection=enabled

# Check for pods without sidecars in injected namespaces
for ns in $(kubectl get namespaces -l istio-injection=enabled -o jsonpath='{.items[*].metadata.name}'); do
  echo "=== $ns ==="
  kubectl get pods -n $ns -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{range .spec.containers[*]}{.name}{","}{end}{"\n"}{end}' | grep -v istio-proxy
done
```

**Review questions**:
- Are all application namespaces injected?
- Are there pods that should have sidecars but do not?
- Are there pods with injection explicitly disabled that should not be?
- Are sidecar resource limits configured appropriately?

### Sidecar Resource Configuration

```bash
# Check sidecar resource settings
kubectl get pods -n <namespace> -o json | jq '.items[].spec.containers[] | select(.name=="istio-proxy") | {name: .name, resources: .resources}'
```

**Review questions**:
- Are CPU and memory limits set on sidecar containers?
- Are the limits appropriate for the traffic volume?
- Has anyone set resource requests without limits or vice versa?

## Review Checklist: Traffic Management

### VirtualServices

```bash
# List all VirtualServices
kubectl get virtualservices -A

# Check for common issues
istioctl analyze -A 2>&1 | grep "VirtualService"
```

**Review questions**:
- Are there VirtualServices with overlapping hosts?
- Do all VirtualService routes have timeouts configured?
- Are retries configured appropriately (not on non-idempotent operations)?
- Are there VirtualServices referencing subsets that do not exist in DestinationRules?

### DestinationRules

```bash
# List all DestinationRules
kubectl get destinationrules -A

# Check for conflicts
istioctl analyze -A 2>&1 | grep "DestinationRule"
```

**Review questions**:
- Are there multiple DestinationRules for the same host?
- Is circuit breaking configured for critical services?
- Are connection pool limits set for services with known capacity constraints?
- Are TCP keepalives configured for long-lived connections?

### ServiceEntries

```bash
# List all external service dependencies
kubectl get serviceentries -A
```

**Review questions**:
- Are all external dependencies declared as ServiceEntries?
- If outbound traffic policy is REGISTRY_ONLY, is anything missing?
- Are ServiceEntry ports named correctly?
- Are DestinationRules with TLS settings configured for external HTTPS services?

## Review Checklist: Security

### mTLS Configuration

```bash
# Check mesh-wide mTLS
kubectl get peerauthentication -A

# Check actual mTLS status
istioctl authn tls-check deploy/<sample-service> -n <namespace> | head -20
```

**Review questions**:
- Is mTLS mode STRICT or PERMISSIVE? If PERMISSIVE, is there a plan to move to STRICT?
- Are there namespace or service-level exceptions to the mesh-wide policy? Are they documented?
- Are there services that need to communicate with non-meshed services? How is that handled?

### Authorization Policies

```bash
# List all authorization policies
kubectl get authorizationpolicies -A

# Check for overly permissive policies
kubectl get authorizationpolicies -A -o json | jq '.items[] | select(.spec.rules == null or .spec.rules == []) | {name: .metadata.name, namespace: .metadata.namespace}'
```

**Review questions**:
- Does every service have an authorization policy?
- Are there any ALLOW-all policies (no rules specified)?
- Are policies using service accounts or namespace selectors rather than IP-based matching?
- Is the default behavior deny-all or allow-all? Which is appropriate?

### Request Authentication

```bash
kubectl get requestauthentications -A
```

**Review questions**:
- Are external-facing services protected by JWT validation?
- Are the JWT issuers and JWKS URIs correct and up to date?
- Is there a plan for JWT key rotation?

## Review Checklist: Observability

### Telemetry Configuration

```bash
# Check telemetry settings
kubectl get telemetry -A
```

**Review questions**:
- Are access logs enabled for debugging?
- Is the tracing sampling rate balanced between observability needs and performance impact?
- Are custom metrics configured for business-critical paths?
- Is the Prometheus scrape configuration collecting Istio metrics?

### Dashboards and Alerts

**Review questions**:
- Are there dashboards for mesh-level metrics (request rate, error rate, latency)?
- Are there alerts for common failure modes (high error rate, sidecar injection failure, istiod unhealthy)?
- Can the on-call team identify Istio-related issues from the dashboards?
- Are there service-level dashboards that include Istio metrics?

## Review Checklist: Operational Readiness

### Upgrade Plan

**Review questions**:
- What version of Istio are you running? Is it still supported?
- Is there a documented upgrade procedure?
- Have you tested the upgrade path in a non-production environment?
- Is canary upgrade (running two control plane versions) possible with your setup?

### Disaster Recovery

**Review questions**:
- Can you rebuild the Istio installation from scratch?
- Is the Istio configuration backed up (in Git)?
- What is the recovery time if istiod becomes unavailable?
- What happens if the mesh configuration is deleted?

### Capacity Planning

```bash
# Check current mesh size
istioctl proxy-status | wc -l

# Check istiod memory usage
kubectl top pods -n istio-system -l app=istiod
```

**Review questions**:
- How many proxies is istiod managing?
- Is there headroom for growth?
- What is the plan if you need to scale beyond the current istiod capacity?
- Are Sidecar resources configured to limit the scope of configuration pushed to each proxy?

## Running the Review

### Preparation

1. Generate a current state report using the commands above
2. Collect the list of recent incidents related to Istio
3. Review any pending architectural changes
4. Invite the right people: platform team, service owners of critical services, security team

### During the Review

Work through each checklist section. For every finding:
- Classify it as critical, important, or nice-to-have
- Assign an owner for remediation
- Set a target date

### After the Review

1. Write up findings in a shared document
2. Create tickets for action items
3. Schedule follow-up to verify critical items are addressed
4. Update documentation with any new decisions made during the review

## Review Report Template

```markdown
# Istio Architecture Review - [Date]

## Participants
- [Names and roles]

## Summary
[1-2 paragraph overview of findings]

## Critical Findings
1. [Finding]: [Description, impact, remediation, owner, target date]

## Important Findings
1. [Finding]: [Description, impact, remediation, owner, target date]

## Nice-to-Have Improvements
1. [Finding]: [Description]

## Decisions Made
1. [Decision]: [Context and rationale]

## Action Items
| Item | Owner | Priority | Target Date |
|------|-------|----------|-------------|

## Next Review Date
[Date]
```

## Summary

Istio architecture reviews are structured evaluations covering the control plane, data plane, traffic management, security, observability, and operational readiness. Use the checklists in this post as a starting point and customize them for your environment. Run reviews quarterly, before major changes, and after incidents. The goal is not perfection but continuous improvement: each review should find fewer critical issues than the last.
