# How to Create Runbook for Istio Incident Response

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Kubernetes, Runbook, Incident Response, Troubleshooting

Description: A comprehensive incident response runbook for Istio service mesh issues covering triage, diagnosis, mitigation, and communication procedures.

---

When something goes wrong with your Istio mesh, the clock is ticking. Services might be unable to communicate, latency could be spiking, or your entire ingress might be down. Having a structured incident response process means your on-call team can triage and resolve issues faster, without relying on tribal knowledge or hunting through documentation.

This runbook provides a framework for responding to Istio-related incidents.

## Runbook: Istio Incident Response

### Purpose
Provide a structured process for identifying, triaging, and resolving incidents related to the Istio service mesh.

### Severity Classification

| Severity | Description | Response Time | Examples |
|---|---|---|---|
| SEV1 | Complete mesh failure, all traffic affected | Immediate | istiod down, global mTLS failure |
| SEV2 | Partial mesh failure, multiple services affected | 15 minutes | Gateway down, cert expiry |
| SEV3 | Single service or namespace affected | 30 minutes | Misconfigured VirtualService |
| SEV4 | Performance degradation | 1 hour | Increased latency, elevated error rate |

### Initial Triage (First 5 Minutes)

When an Istio-related alert fires, start here:

#### Step 1: Assess Scope

```bash
# Check if istiod is running
kubectl get pods -n istio-system -l app=istiod

# Check if gateways are running
kubectl get pods -n istio-system -l app=istio-ingressgateway

# Quick health check of the mesh
istioctl proxy-status | head -20

# Count pods not in Ready state
kubectl get pods --all-namespaces --field-selector=status.phase!=Running | wc -l
```

#### Step 2: Check for Obvious Problems

```bash
# Recent events in istio-system
kubectl get events -n istio-system --sort-by='.lastTimestamp' | tail -20

# istiod logs for errors
kubectl logs -n istio-system deploy/istiod --tail=50 | grep -i "error\|warn\|fatal"

# Check resource pressure
kubectl top pods -n istio-system
```

#### Step 3: Determine if the Issue is Istio or Application

```bash
# Bypass the sidecar to test direct connectivity
kubectl exec <pod> -c <app-container> -- curl -s --connect-timeout 5 http://<service>:<port>/health

# Check if the app container itself is healthy
kubectl exec <pod> -c <app-container> -- curl -s localhost:<app-port>/health

# If direct connectivity works but mesh traffic fails, the issue is Istio
# If direct connectivity also fails, the issue might be application or network
```

### Diagnostic Procedures by Symptom

#### Symptom: All Service-to-Service Traffic Failing

This is a SEV1 situation. Most likely causes: istiod down, global mTLS issue, or DNS problem.

```bash
# Check istiod health
kubectl get pods -n istio-system -l app=istiod -o wide
kubectl describe pods -n istio-system -l app=istiod

# Check if sidecar injection webhook is present
kubectl get mutatingwebhookconfiguration | grep istio

# Verify the Istio root certificate
kubectl get secret istio-ca-secret -n istio-system
istioctl proxy-config secret <any-pod> | head -10

# Check for certificate expiry
kubectl exec <pod> -c istio-proxy -- curl -s localhost:15000/certs | head -30
```

Mitigation:
```bash
# If istiod is down, restart it
kubectl rollout restart deployment/istiod -n istio-system

# If certificates are expired, restart istiod to trigger reissuance
kubectl delete pods -n istio-system -l app=istiod

# Nuclear option: disable mTLS temporarily
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

#### Symptom: Ingress Traffic Not Reaching Services

```bash
# Check the gateway pod
kubectl get pods -n istio-system -l app=istio-ingressgateway
kubectl logs -n istio-system -l app=istio-ingressgateway --tail=50

# Check Gateway resource configuration
kubectl get gateways --all-namespaces
istioctl analyze -n istio-system

# Check the gateway's listener configuration
istioctl proxy-config listener deploy/istio-ingressgateway -n istio-system

# Check routes on the gateway
istioctl proxy-config route deploy/istio-ingressgateway -n istio-system

# Verify the external IP/hostname
kubectl get svc istio-ingressgateway -n istio-system
```

Mitigation:
```bash
# If gateway pod is unhealthy, restart it
kubectl rollout restart deployment/istio-ingressgateway -n istio-system

# If routes are missing, check VirtualService resources
kubectl get virtualservices --all-namespaces

# If the Service is missing its external IP, check cloud provider integration
kubectl describe svc istio-ingressgateway -n istio-system
```

#### Symptom: Elevated Latency Across the Mesh

```bash
# Check sidecar CPU throttling
kubectl top pods --containers --all-namespaces | grep istio-proxy | sort -k4 -rn | head -20

# Check istiod push latency
kubectl exec -n istio-system deploy/istiod -- \
  curl -s localhost:15014/metrics | grep pilot_xds_push_time

# Check for configuration churn
kubectl exec -n istio-system deploy/istiod -- \
  curl -s localhost:15014/metrics | grep pilot_push_triggers

# Look at Envoy stats for connection issues
kubectl exec <high-latency-pod> -c istio-proxy -- \
  curl -s localhost:15000/stats | grep "upstream_cx_connect_timeout\|upstream_rq_timeout"
```

Mitigation:
```bash
# If sidecars are CPU throttled, increase limits
kubectl annotate deployment <name> -n <namespace> \
  sidecar.istio.io/proxyCPULimit=2000m --overwrite
kubectl rollout restart deployment <name> -n <namespace>

# If istiod is overloaded, scale it up
kubectl scale deployment istiod -n istio-system --replicas=3

# If a specific service is causing issues, check its DestinationRule
istioctl proxy-config cluster <pod-name> -n <namespace> --fqdn <service-fqdn>
```

#### Symptom: Intermittent 503 Errors

```bash
# Check for upstream connection failures
kubectl exec <pod> -c istio-proxy -- \
  curl -s localhost:15000/stats | grep "upstream_cx_destroy\|upstream_cx_connect_fail"

# Check circuit breaker status
kubectl exec <pod> -c istio-proxy -- \
  curl -s localhost:15000/stats | grep "upstream_rq_pending_overflow"

# Look at the specific cluster config
istioctl proxy-config cluster <pod> --fqdn <destination-service>

# Check endpoint health
istioctl proxy-config endpoint <pod> --cluster "<cluster-name>"
```

Mitigation:
```bash
# If circuit breaker is tripping, adjust the DestinationRule
kubectl apply -f - <<EOF
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: <service>-dr
  namespace: <namespace>
spec:
  host: <service>
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 1000
      http:
        h2UpgradePolicy: DEFAULT
        maxRequestsPerConnection: 0
    outlierDetection:
      consecutive5xxErrors: 10
      interval: 30s
      baseEjectionTime: 30s
EOF
```

### Communication Template

During an active incident, communicate using this template:

```
INCIDENT: [Title]
SEVERITY: SEV[1-4]
STATUS: Investigating / Identified / Mitigating / Resolved
IMPACT: [Description of what is affected]
TIMELINE:
  [HH:MM] - Alert triggered / Issue reported
  [HH:MM] - Investigation started
  [HH:MM] - Root cause identified
  [HH:MM] - Mitigation applied
  [HH:MM] - Verified resolution
NEXT UPDATE: [Time]
```

### Post-Incident Process

After resolving the incident:

1. **Document everything**: Commands run, what was found, what fixed it
2. **Capture metrics**: Screenshot dashboards showing the incident and recovery
3. **Schedule a post-mortem**: Within 48 hours
4. **Create action items**: What changes would prevent this in the future
5. **Update this runbook**: If the incident revealed gaps in the procedures

### Quick Reference Commands

```bash
# Overall mesh health
istioctl proxy-status
istioctl analyze --all-namespaces

# Control plane
kubectl get pods -n istio-system
kubectl logs -n istio-system deploy/istiod --tail=100
kubectl top pods -n istio-system

# Specific proxy debugging
istioctl proxy-config listener <pod>
istioctl proxy-config route <pod>
istioctl proxy-config cluster <pod>
istioctl proxy-config endpoint <pod>
istioctl proxy-config secret <pod>

# Envoy admin
kubectl exec <pod> -c istio-proxy -- curl localhost:15000/stats
kubectl exec <pod> -c istio-proxy -- curl localhost:15000/config_dump
kubectl exec <pod> -c istio-proxy -- curl localhost:15000/clusters
```

Keep this runbook accessible to every on-call engineer. Print it out, bookmark it, or put it in your incident management tool. When things are breaking, you want to be following a tested procedure, not figuring things out from scratch.
