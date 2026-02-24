# How to Set Up Incident Management for Istio with OneUptime

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, OneUptime, Incident Management, On-Call, Reliability

Description: Configure a complete incident management workflow for Istio service mesh issues using OneUptime alerting, escalation, and post-mortem tools.

---

When something breaks in your Istio service mesh, having a solid incident management process makes the difference between a 5-minute fix and a 2-hour scramble. OneUptime provides the tools to detect, escalate, manage, and learn from incidents. Here's how to wire it all up for an Istio environment.

## Incident Severity Definitions

First, define what each severity level means in the context of your Istio mesh:

| Severity | Definition | Example |
|---|---|---|
| SEV-1 (Critical) | Complete service outage or data loss | Ingress gateway down, all external traffic blocked |
| SEV-2 (High) | Major functionality impaired | mTLS broken between critical services, 50%+ error rate |
| SEV-3 (Medium) | Minor functionality impaired | Elevated latency, non-critical service degraded |
| SEV-4 (Low) | Cosmetic or minor issue | Configuration warning, non-blocking deprecation |

Write these down and make sure everyone on the team agrees. Severity definitions that live only in someone's head are useless during an actual incident.

## Setting Up On-Call Rotations

In OneUptime, create on-call schedules for the teams that manage your Istio infrastructure:

### Platform Team Schedule

The platform team handles mesh-level issues: istiod problems, gateway outages, mesh-wide misconfigurations.

```yaml
# On-call rotation configuration concept:
schedule:
  name: "Istio Platform On-Call"
  timezone: "America/New_York"
  rotation:
    type: weekly
    handoff_time: "09:00"
    handoff_day: Monday
  members:
    - alice@company.com  # Week 1
    - bob@company.com    # Week 2
    - carol@company.com  # Week 3
  escalation:
    - level: 1
      timeout: 10m  # Escalate if not acknowledged in 10 minutes
      targets: [current_on_call]
    - level: 2
      timeout: 15m
      targets: [platform_team_lead]
    - level: 3
      timeout: 30m
      targets: [engineering_director]
```

### Service Team Schedule

Individual service teams handle issues specific to their services running in the mesh:

```yaml
schedule:
  name: "Payments Service On-Call"
  timezone: "America/Los_Angeles"
  rotation:
    type: weekly
    handoff_time: "10:00"
    handoff_day: Monday
  members:
    - dave@company.com
    - eve@company.com
```

## Connecting Alerts to Incidents

Configure OneUptime to automatically create incidents from Istio alerts. Map alert severities to incident severities:

### Auto-Create Rules

```yaml
# When critical alerts fire, automatically create a SEV-1 incident
auto_incident_rules:
  - alert_match: "High Error Rate - Mesh Wide"
    severity: SEV-1
    assigned_team: "Istio Platform"
    notification: immediate

  - alert_match: "Service Outage - *"
    severity: SEV-1
    assigned_team: "Service Owner"
    notification: immediate

  - alert_match: "istiod Down"
    severity: SEV-1
    assigned_team: "Istio Platform"
    notification: immediate

  - alert_match: "Elevated Latency - *"
    severity: SEV-3
    assigned_team: "Service Owner"
    notification: business_hours

  - alert_match: "Certificate Expiry Warning"
    severity: SEV-2
    assigned_team: "Istio Platform"
    notification: business_hours
```

## Incident Response Workflow

When an incident is created, follow this workflow:

### Step 1: Acknowledge

The on-call engineer acknowledges the incident within the escalation timeout. This signals to the team that someone is looking at it.

### Step 2: Triage

Run through the initial diagnostic checklist:

```bash
# Quick mesh health check
istioctl proxy-status

# Check control plane
kubectl get pods -n istio-system

# Check for configuration issues
istioctl analyze --all-namespaces

# Check gateway status
kubectl get pods -n istio-system -l istio=ingressgateway

# Look at recent changes
kubectl get events -n istio-system --sort-by='.lastTimestamp' | tail -20

# Check for recent deployments across all namespaces
kubectl get deployments --all-namespaces -o json | jq -r '.items[] | select(.status.updatedReplicas != .status.replicas) | "\(.metadata.namespace)/\(.metadata.name)"'
```

### Step 3: Communicate

Update the incident in OneUptime with your findings. This creates a timeline that's invaluable for post-mortems:

- "Acknowledged. Starting investigation."
- "istiod is running but showing high memory usage. Checking proxy-status for stale connections."
- "Found the issue: misconfigured AuthorizationPolicy deployed 20 minutes ago is blocking traffic to the payments service."

### Step 4: Mitigate

Fix the immediate problem. In Istio, common mitigations include:

```bash
# Rollback a bad configuration
kubectl delete authorizationpolicy bad-policy -n default

# Rollback a VirtualService change
kubectl apply -f last-known-good-virtualservice.yaml

# Restart istiod if it's in a bad state
kubectl rollout restart deployment istiod -n istio-system

# Restart sidecar proxies if they're out of sync
kubectl rollout restart deployment affected-service -n default
```

### Step 5: Resolve

Once the issue is mitigated and confirmed resolved:

```bash
# Verify the fix
istioctl analyze --all-namespaces

# Check error rates are back to normal
# (monitor your OneUptime dashboard)

# Verify all proxies are in sync
istioctl proxy-status
```

Mark the incident as resolved in OneUptime.

## Building Runbooks

Every common incident type should have a runbook. Store these in OneUptime and link them to the corresponding alerts.

### Runbook: Ingress Gateway Not Responding

```markdown
## Symptoms
- External monitoring probes failing
- 502/503 errors from the gateway IP

## Diagnosis
1. Check gateway pods:
   kubectl get pods -n istio-system -l istio=ingressgateway
2. Check gateway logs:
   kubectl logs -n istio-system -l istio=ingressgateway --tail=50
3. Check gateway configuration:
   istioctl proxy-config routes deploy/istio-ingressgateway -n istio-system
4. Check if the gateway has the right certificates:
   istioctl proxy-config secret deploy/istio-ingressgateway -n istio-system

## Common Fixes
- Gateway pod OOMKilled: Increase memory limits
- TLS certificate expired: Renew the certificate secret
- Missing route: Check VirtualService and Gateway resources
- Envoy crash: Check for bad configuration, rollback recent changes
```

### Runbook: mTLS Failures Between Services

```markdown
## Symptoms
- 503 errors with "upstream connect error" in logs
- Services unable to communicate

## Diagnosis
1. Check PeerAuthentication policies:
   kubectl get peerauthentication --all-namespaces
2. Check DestinationRule TLS settings:
   kubectl get destinationrule --all-namespaces -o yaml | grep -A5 tls
3. Verify certificates:
   istioctl proxy-config secret <pod-name>
4. Check if both pods have sidecars:
   kubectl get pods -o jsonpath='{.spec.containers[*].name}'

## Common Fixes
- Mismatched mTLS modes: Align PeerAuthentication and DestinationRule
- Missing sidecar: Re-enable injection and restart the pod
- Expired certificate: Restart istiod to trigger cert rotation
```

## Post-Mortem Process

After every SEV-1 and SEV-2 incident, run a blameless post-mortem. OneUptime's incident timeline makes this easier because you already have a record of what happened and when.

### Post-Mortem Template

```markdown
## Incident Summary
- Duration: 45 minutes (14:30 - 15:15 UTC)
- Severity: SEV-1
- Impact: Payment processing unavailable for all users

## Timeline
- 14:28 - Developer deployed new AuthorizationPolicy
- 14:30 - Error rate alert fired
- 14:32 - On-call acknowledged
- 14:35 - Identified AuthorizationPolicy as root cause
- 14:37 - Rolled back the policy
- 14:40 - Error rate returning to normal
- 15:15 - Confirmed resolution, incident closed

## Root Cause
An AuthorizationPolicy was applied that denied all traffic to the payments
namespace. The policy was missing a "from" rule, which caused it to deny
all sources instead of allowing specific ones.

## What Went Well
- Alert fired within 2 minutes
- On-call responded quickly
- Root cause identified in 3 minutes

## What Could Be Improved
- No validation of AuthorizationPolicy before deployment
- No canary deployment for security policies

## Action Items
1. Add istioctl analyze to CI/CD pipeline (owner: Alice, due: March 1)
2. Create staging environment for security policy testing (owner: Bob, due: March 15)
3. Add pre-deploy validation for all Istio resources (owner: Carol, due: March 1)
```

## Testing Your Incident Response

Run regular game day exercises to test the entire incident management pipeline:

```bash
# Simulate an incident by injecting faults
kubectl apply -f - <<EOF
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: fault-test
  namespace: staging
spec:
  hosts:
  - test-service
  http:
  - fault:
      abort:
        percentage:
          value: 100
        httpStatus: 503
    route:
    - destination:
        host: test-service
EOF

# Verify the alert fires and the incident is created
# Walk through the entire response process
# Then clean up
kubectl delete virtualservice fault-test -n staging
```

Do this quarterly at minimum. The worst time to discover your incident process is broken is during an actual incident.

A well-oiled incident management process reduces downtime, stress, and finger-pointing. Combined with the observability data Istio provides, you can detect and resolve problems fast, and more importantly, prevent them from happening again.
