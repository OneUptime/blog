# How to Create Runbooks Based on Istio Configuration

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Runbooks, Operations, Troubleshooting, Incident Response

Description: Build operational runbooks that leverage Istio configuration and telemetry for faster incident response and systematic troubleshooting.

---

Runbooks are step-by-step guides that help on-call engineers respond to incidents. When your infrastructure runs on Istio, your runbooks need to account for the mesh. Most service issues in a mesh environment involve routing, mTLS, sidecar health, or resource exhaustion in the proxy. Having runbooks that specifically address these scenarios cuts your mean time to resolution significantly.

## Runbook Structure

A good runbook follows a consistent structure:

1. **Alert name and description**: What triggered this runbook
2. **Impact assessment**: What's broken and who's affected
3. **Diagnostic steps**: Commands to run to identify the root cause
4. **Remediation steps**: How to fix common causes
5. **Escalation path**: Who to contact if the runbook doesn't resolve it
6. **Post-incident**: What to check after resolution

## Runbook: High 5xx Error Rate

```markdown
# Runbook: High 5xx Error Rate on Istio Service

## Alert
`IstioService5xxRateHigh` - 5xx error rate > 1% for 5 minutes

## Impact
Service returning server errors to clients. User-facing impact likely.

## Diagnostic Steps

### Step 1: Identify which service and error codes
```

```bash
# Get the specific error codes
kubectl exec -n istio-system deploy/prometheus -- \
  promtool query instant http://localhost:9090 \
  'sum(rate(istio_requests_total{response_code=~"5.."}[5m])) by (destination_service, response_code, source_workload)'
```

```markdown
### Step 2: Check if the backend pods are healthy
```

```bash
# Get pod status for the affected service
kubectl get pods -n <namespace> -l app=<service-name>

# Check recent pod events
kubectl describe pods -n <namespace> -l app=<service-name> | grep -A10 Events
```

```markdown
### Step 3: Check sidecar proxy health
```

```bash
# Check proxy sync status
istioctl proxy-status | grep <service-name>

# Check proxy config is valid
istioctl analyze -n <namespace>
```

```markdown
### Step 4: Check for circuit breaker activation
```

```bash
# Check outlier detection ejections
kubectl exec deploy/<service-name> -n <namespace> -c istio-proxy -- \
  pilot-agent request GET /stats | grep "ejections_active\|ejections_total"
```

```markdown
### Step 5: Check upstream connection errors
```

```bash
# Check connection failures
kubectl exec deploy/<calling-service> -n <namespace> -c istio-proxy -- \
  pilot-agent request GET /stats | grep "upstream_cx\|upstream_rq"
```

```markdown
## Common Causes and Fixes

### Cause: Pod crash loop
- **Fix:** Check pod logs (`kubectl logs -n <ns> <pod>`) for application errors
- Restart the deployment: `kubectl rollout restart deploy/<name> -n <ns>`

### Cause: Circuit breaker tripped
- **Fix:** Check outlier detection settings in DestinationRule
- Temporarily increase thresholds: edit the DestinationRule

### Cause: mTLS mismatch
- **Fix:** Check PeerAuthentication mode matches between namespaces
- Temporary: Set mode to PERMISSIVE

### Cause: Connection pool exhausted
- **Fix:** Increase maxConnections in DestinationRule

## Escalation
If not resolved in 15 minutes, escalate to platform-team in #platform-oncall
```

## Runbook: Service Unreachable (503)

```markdown
# Runbook: Service Unreachable - 503 No Healthy Upstream

## Alert
`IstioNoHealthyUpstream` - Service returning persistent 503s

## Diagnostic Steps

### Step 1: Verify endpoints exist
```

```bash
# Check service endpoints
kubectl get endpoints <service-name> -n <namespace>

# Check what Envoy knows about the endpoints
istioctl proxy-config endpoints deploy/<calling-service> -n <namespace> | grep <service-name>
```

```markdown
### Step 2: Check if pods are passing readiness probes
```

```bash
kubectl get pods -n <namespace> -l app=<service-name> -o wide

# Look for pods that aren't Ready
kubectl get pods -n <namespace> -l app=<service-name> -o json | \
  jq '.items[] | select(.status.conditions[] | select(.type == "Ready" and .status == "False")) | .metadata.name'
```

```markdown
### Step 3: Verify protocol detection
```

```bash
# Check service port naming (must start with tcp-, http-, grpc-, etc.)
kubectl get svc <service-name> -n <namespace> -o json | jq '.spec.ports[]'
```

```markdown
### Step 4: Check mTLS compatibility
```

```bash
istioctl authn tls-check deploy/<calling-service>.<namespace> <service-name>.<namespace>.svc.cluster.local
```

```markdown
## Quick Fixes

1. **No endpoints:** Scale up the deployment or fix readiness probes
2. **Protocol mismatch:** Rename service port (add `tcp-` or `http-` prefix)
3. **mTLS mismatch:** Set PeerAuthentication to PERMISSIVE temporarily
4. **Sidecar not synced:** Restart the affected pods
```

## Generating Runbooks from Configuration

Automate runbook generation based on your actual Istio configuration:

```python
#!/usr/bin/env python3
# generate-runbooks.py

import json
import subprocess

def kubectl_get_json(resource, namespace=None):
    cmd = ["kubectl", "get", resource, "-o", "json"]
    if namespace:
        cmd.extend(["-n", namespace])
    else:
        cmd.append("-A")
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        return {"items": []}
    return json.loads(result.stdout)

def generate_service_runbook(vs, dr):
    name = vs["metadata"]["name"]
    ns = vs["metadata"]["namespace"]
    hosts = vs["spec"].get("hosts", [])

    runbook = f"""# Runbook: {name}

**Namespace:** {ns}
**Hosts:** {', '.join(hosts)}

## Health Check Commands

```bash
# Check pod status
kubectl get pods -n {ns} -l app={name}

# Check proxy status
istioctl proxy-status | grep {name}

# Check endpoints
istioctl proxy-config endpoints deploy/{name} -n {ns}

# Check recent errors
kubectl logs -n {ns} deploy/{name} -c istio-proxy --tail=50 | grep -i error
```

## Route Information

"""
    for i, route in enumerate(vs["spec"].get("http", [])):
        match = route.get("match", [{}])[0]
        uri = match.get("uri", {})
        path = uri.get("prefix", uri.get("exact", "/*"))
        timeout = route.get("timeout", "15s (default)")
        retries = route.get("retries", {})

        runbook += f"""### Route {i+1}: {path}
- Timeout: {timeout}
- Retries: {retries.get('attempts', 0)} attempts
- Retry on: {retries.get('retryOn', 'N/A')}

"""

    if dr:
        tp = dr["spec"].get("trafficPolicy", {})
        cp = tp.get("connectionPool", {})
        od = tp.get("outlierDetection", {})

        runbook += f"""## Traffic Policy

- Max TCP connections: {cp.get('tcp', {}).get('maxConnections', 'unlimited')}
- Connect timeout: {cp.get('tcp', {}).get('connectTimeout', 'default')}
- Circuit breaker: {od.get('consecutive5xxErrors', 'N/A')} consecutive 5xx errors
- Ejection time: {od.get('baseEjectionTime', 'N/A')}

## Circuit Breaker Troubleshooting

```bash
# Check if circuit breaker is active
kubectl exec deploy/{name} -n {ns} -c istio-proxy -- \\
  pilot-agent request GET /stats | grep ejections
```

"""

    return runbook

# Generate runbooks for all services
vs_list = kubectl_get_json("virtualservices")
dr_list = kubectl_get_json("destinationrules")

for vs in vs_list.get("items", []):
    name = vs["metadata"]["name"]
    ns = vs["metadata"]["namespace"]

    # Find matching DestinationRule
    dr = None
    for d in dr_list.get("items", []):
        if d["metadata"]["namespace"] == ns:
            if name in d["spec"].get("host", ""):
                dr = d
                break

    runbook = generate_service_runbook(vs, dr)

    filename = f"runbook-{ns}-{name}.md"
    with open(filename, "w") as f:
        f.write(runbook)
    print(f"Generated: {filename}")
```

## Runbook: Gateway Connection Failures

```markdown
# Runbook: Ingress Gateway Connection Failures

## Diagnostic Steps

### Step 1: Check gateway pod health
```

```bash
kubectl get pods -n istio-system -l istio=ingressgateway
kubectl logs -n istio-system deploy/istio-ingressgateway --tail=100
```

```markdown
### Step 2: Check TLS certificates
```

```bash
# List gateway secrets
kubectl get gateways -n istio-system -o json | \
  jq -r '.items[].spec.servers[].tls.credentialName' | sort -u

# Check each cert expiry
for SECRET in $(kubectl get gateways -n istio-system -o json | jq -r '.items[].spec.servers[].tls.credentialName' | sort -u); do
  echo "=== $SECRET ==="
  kubectl get secret $SECRET -n istio-system -o json | \
    jq -r '.data["tls.crt"]' | base64 -d | \
    openssl x509 -noout -dates
done
```

```markdown
### Step 3: Check listener configuration
```

```bash
istioctl proxy-config listeners -n istio-system deploy/istio-ingressgateway
```

```markdown
### Step 4: Test connectivity
```

```bash
# Test from outside the cluster
curl -v https://api.example.com/health

# Test from inside the cluster
kubectl run test --rm -it --image=curlimages/curl -- \
  curl -v http://istio-ingressgateway.istio-system.svc.cluster.local/health \
  -H "Host: api.example.com"
```

## Storing Runbooks Alongside Configuration

Keep runbooks in the same git repository as your Istio configuration:

```
k8s/
  production/
    istio/
      gateway.yaml
      gateway-vs.yaml
      runbooks/
        gateway-troubleshooting.md
        service-5xx.md
        mtls-issues.md
```

This way, when someone changes the configuration, they can update the corresponding runbook in the same pull request. The runbook stays synchronized with the configuration it describes.

Runbooks based on actual Istio configuration are more useful than generic troubleshooting guides because they contain the exact commands, service names, namespaces, and settings that apply to your environment. Generate the basics automatically, then add human knowledge for the edge cases that automation can't cover.
