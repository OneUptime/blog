# How to Create Istio Incident Response Playbook

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Incident Response, On-Call, Kubernetes, Operations, SRE

Description: Build a comprehensive Istio incident response playbook with triage workflows, diagnostic decision trees, communication templates, and post-incident processes.

---

When an Istio-related incident hits, you need a clear process that any on-call engineer can follow. The playbook is not a replacement for expertise, but it gives structure to the chaos of an active incident. It tells you what to check first, how to communicate, when to escalate, and how to recover. Without it, incident response degenerates into a group of people guessing at the problem while the outage extends.

## Playbook Structure

An effective incident response playbook has these sections:

1. **Detection and Triage**: How you know something is wrong and how to classify the severity
2. **Diagnostic Workflow**: Step-by-step diagnostic process
3. **Common Scenarios**: Pre-written responses for known failure modes
4. **Communication**: Templates and escalation paths
5. **Recovery Actions**: How to fix things
6. **Post-Incident**: What to do after the incident is resolved

## Detection and Triage

### Alert Categories

Define which alerts indicate Istio-related issues:

**P1 (Critical)**:
- Istio ingress gateway returning 5xx errors for > 1% of requests
- istiod is down with zero healthy replicas
- Mesh-wide mTLS failures detected
- Multiple services reporting connection failures simultaneously

**P2 (High)**:
- Sidecar injection failing for new pods
- Configuration push failures from istiod
- Individual service 5xx rate > 5%
- Certificate expiration warnings (< 12 hours remaining)

**P3 (Medium)**:
- Configuration analysis warnings
- Proxy sync delays > 60 seconds
- Individual service latency increase > 50%
- Sidecar resource limits being hit

### Initial Triage Checklist

When an alert fires, run through this checklist in order:

```bash
# 1. Is istiod healthy?
kubectl get pods -n istio-system -l app=istiod
# Expected: Multiple pods in Running state

# 2. Are proxies synced?
istioctl proxy-status | grep -v SYNCED | head -20
# Expected: All proxies SYNCED

# 3. Are there configuration errors?
istioctl analyze -A 2>&1 | grep "Error" | head -10
# Expected: No errors

# 4. Is the ingress gateway healthy?
kubectl get pods -n istio-system -l istio=ingressgateway
# Expected: Pods in Running state

# 5. What changed recently?
kubectl get events -A --sort-by='.lastTimestamp' | grep -i istio | tail -20
```

This takes about 2 minutes and gives you a high-level picture of mesh health.

## Diagnostic Decision Tree

Use this decision tree to narrow down the problem:

```
Is istiod healthy?
├── NO → Go to "Control Plane Down" scenario
└── YES
    ├── Are all proxies synced?
    │   ├── NO → Go to "Proxy Sync Failure" scenario
    │   └── YES
    │       ├── Is the issue affecting all services?
    │       │   ├── YES → Go to "Mesh-Wide Issue" scenario
    │       │   └── NO
    │       │       ├── Is the issue at the ingress gateway?
    │       │       │   ├── YES → Go to "Gateway Issue" scenario
    │       │       │   └── NO → Go to "Service-Specific Issue" scenario
```

## Scenario: Control Plane Down

**Symptoms**: istiod pods not running, sidecar injection failing, configuration changes not taking effect.

**Immediate impact assessment**:

```bash
# Check how long istiod has been down
kubectl get events -n istio-system --field-selector reason=Killing | tail -5

# Check certificate expiration (you have time until these expire)
istioctl proxy-config secret deploy/<any-service> -n <namespace> | grep "VALID TO"
```

**Recovery steps**:

1. Check why istiod crashed:

```bash
kubectl logs deploy/istiod -n istio-system --previous --tail=100
kubectl describe deploy/istiod -n istio-system
```

2. If resource limits are the cause:

```bash
kubectl patch deploy istiod -n istio-system --type='json' \
  -p='[{"op":"replace","path":"/spec/template/spec/containers/0/resources/limits/memory","value":"4Gi"}]'
```

3. If the deployment was deleted:

```bash
istioctl install --set profile=default -y
```

4. Verify recovery:

```bash
istioctl proxy-status
```

**Data plane impact**: Existing services continue working with cached configuration. New pods will not get sidecars until istiod is back.

## Scenario: Mesh-Wide mTLS Failure

**Symptoms**: Multiple services returning 503, connection reset errors across the mesh.

**Diagnostic steps**:

```bash
# Check PeerAuthentication policies
kubectl get peerauthentication -A

# Check if a recent change broke things
kubectl get peerauthentication -A -o json | jq '.items[] | {name: .metadata.name, ns: .metadata.namespace, mode: .spec.mtls.mode, created: .metadata.creationTimestamp}'

# Check certificate health
istioctl proxy-config secret deploy/<service> -n <namespace>
```

**Recovery steps**:

If a PeerAuthentication change caused this:

```bash
# Temporarily set mesh-wide to PERMISSIVE
kubectl apply -f - <<EOF
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: default
  namespace: istio-system
spec:
  mtls:
    mode: PERMISSIVE
EOF
```

This immediately allows both plain text and mTLS traffic, resolving the connectivity issue while you investigate the root cause.

## Scenario: Gateway Issue

**Symptoms**: External traffic not reaching services, 404 or 503 from the ingress gateway.

**Diagnostic steps**:

```bash
# Check gateway logs
kubectl logs -n istio-system -l istio=ingressgateway --tail=50

# Check gateway configuration
istioctl proxy-config listeners deploy/istio-ingressgateway -n istio-system
istioctl proxy-config routes deploy/istio-ingressgateway -n istio-system

# Check if TLS certificates are valid
istioctl proxy-config secret deploy/istio-ingressgateway -n istio-system

# Test internal connectivity
kubectl exec -it deploy/istio-ingressgateway -n istio-system -- \
  curl -s -o /dev/null -w "%{http_code}" http://<service>.<namespace>:8080/health
```

**Recovery steps**:

If routes are missing:

```bash
# Check VirtualService is bound to the correct gateway
kubectl get virtualservices -A -o json | jq '.items[] | select(.spec.gateways != null) | {name: .metadata.name, gateways: .spec.gateways}'
```

If TLS certificate expired:

```bash
# Check certificate details
kubectl get secret <cert-secret> -n istio-system -o json | jq '.data."tls.crt"' -r | base64 -d | openssl x509 -noout -dates

# Replace certificate
kubectl create secret tls <cert-secret> --cert=new-cert.pem --key=new-key.pem -n istio-system --dry-run=client -o yaml | kubectl apply -f -

# Restart gateway to pick up new cert
kubectl rollout restart deploy/istio-ingressgateway -n istio-system
```

## Scenario: Service-Specific Issue

**Symptoms**: One service returning errors, but the rest of the mesh is healthy.

**Diagnostic steps**:

```bash
# Check the service's proxy configuration
istioctl analyze -n <namespace>

# Check the service proxy logs
kubectl logs deploy/<service> -c istio-proxy --tail=50

# Check for configuration conflicts
istioctl proxy-config clusters deploy/<service> -n <namespace> | grep <destination>

# Check authorization policies
kubectl get authorizationpolicies -n <namespace>
```

**Common causes**:
- Port naming mismatch (check the Service port names)
- Missing DestinationRule for a VirtualService that uses subsets
- AuthorizationPolicy blocking legitimate traffic
- DestinationRule circuit breaker ejecting all endpoints

## Communication Templates

### Initial Notification

```
[INCIDENT] Istio-related service degradation detected

Severity: P[1/2/3]
Impact: [Description of user impact]
Start time: [Time]
Current status: Investigating

On-call: [Name]
Channel: #incident-[number]
```

### Status Update (every 30 minutes for P1)

```
[UPDATE] Istio incident - [Incident ID]

Current status: [Investigating/Identified/Mitigating/Resolved]
Root cause: [Known/Unknown] - [Description if known]
Impact: [Ongoing/Reduced/Resolved]
ETA for resolution: [Time or Unknown]
Next update: [Time]
```

### Resolution Notification

```
[RESOLVED] Istio incident - [Incident ID]

Duration: [Start time] to [End time]
Root cause: [Brief description]
Fix applied: [What was done]
Follow-up: [Tickets for permanent fix, post-incident review date]
```

## Escalation Matrix

| Scenario | First Responder | Escalate After | Escalate To |
|----------|----------------|----------------|-------------|
| Service 5xx errors | On-call engineer | 15 minutes | Service owner + platform engineer |
| istiod unhealthy | On-call engineer | 10 minutes | Platform team lead |
| Mesh-wide failure | On-call engineer | 5 minutes | Platform team lead + engineering manager |
| Certificate issues | Platform engineer | 30 minutes | Platform team lead |
| Gateway down | On-call engineer | 10 minutes | Platform engineer |

## Emergency Actions

Some actions can be taken immediately without approval during a P1 incident:

```bash
# Disable sidecar injection for a namespace (stops mesh from affecting new pods)
kubectl label namespace <namespace> istio-injection- --overwrite

# Switch mTLS to permissive (fixes mTLS-related connectivity issues)
kubectl apply -f emergency/permissive-mtls.yaml

# Restart gateway (fixes most gateway issues)
kubectl rollout restart deploy/istio-ingressgateway -n istio-system

# Remove a broken authorization policy
kubectl delete authorizationpolicy <name> -n <namespace>

# Restart istiod
kubectl rollout restart deploy/istiod -n istio-system
```

Keep these emergency commands documented and tested. Store the emergency YAML files in a known location.

## Post-Incident Process

After every Istio incident:

1. **Within 24 hours**: Write a brief incident summary (what happened, timeline, root cause, fix)

2. **Within 1 week**: Conduct a blameless post-incident review. Cover:
   - What went wrong?
   - How was it detected?
   - Was the playbook helpful? What was missing?
   - What prevented faster detection or recovery?
   - What changes would prevent recurrence?

3. **Action items**: Create tickets for:
   - Playbook updates based on the incident
   - Monitoring improvements
   - Configuration changes to prevent recurrence
   - Training needs identified during the incident

## Keeping the Playbook Current

The playbook is only useful if it is up to date:

- Review after every incident and update based on learnings
- Review after every Istio upgrade (commands and APIs may change)
- Test diagnostic commands quarterly to verify they still work
- Include the playbook in on-call onboarding

## Summary

An Istio incident response playbook gives structure to incident handling. It starts with triage to classify severity, follows a diagnostic decision tree to narrow down the problem, has pre-written procedures for common scenarios, includes communication templates and escalation paths, and ends with a post-incident process for continuous improvement. The playbook should be accessible from your alerting system (link it in alert descriptions), tested regularly, and updated after every incident.
