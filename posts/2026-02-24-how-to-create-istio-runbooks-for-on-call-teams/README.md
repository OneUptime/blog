# How to Create Istio Runbooks for On-Call Teams

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Runbook, Incident Response, Kubernetes, On-Call, Operations

Description: Build practical Istio runbooks for on-call engineers covering common failure scenarios, diagnostic commands, and step-by-step remediation procedures.

---

When your pager goes off at 3 AM because of an Istio-related issue, you do not want to be reading documentation or guessing at commands. You want a runbook that tells you exactly what to check, in what order, and what to do about it. Good runbooks are the difference between a 5-minute fix and an hour-long debugging session.

## Runbook Structure

Every Istio runbook should follow the same structure so on-call engineers can find information quickly:

1. **Alert name and description**: What triggered this runbook
2. **Impact assessment**: What is broken and who is affected
3. **Diagnostic steps**: Commands to run in order
4. **Remediation steps**: How to fix the issue
5. **Escalation**: When and who to escalate to
6. **Post-incident**: What to do after the issue is resolved

## Runbook: High Error Rate Between Services

**Alert**: `istio_requests_5xx_rate > 0.05 for 5 minutes`

**Impact**: Service-to-service communication failing. Users may see errors.

**Diagnostic Steps**:

Step 1: Identify which services are affected:

```bash
# Check which services have high error rates
kubectl exec -it deploy/istio-ingressgateway -n istio-system -c istio-proxy -- \
  pilot-agent request GET stats | grep "upstream_rq_5xx"
```

Step 2: Check the specific error codes:

```bash
# Look at access logs for the source service
kubectl logs deploy/<source-service> -c istio-proxy --tail=50 | grep "5[0-9][0-9]"
```

Step 3: Check if the destination pods are healthy:

```bash
kubectl get pods -l app=<destination-service> -n <namespace>
kubectl describe pods -l app=<destination-service> -n <namespace>
```

Step 4: Check for configuration issues:

```bash
istioctl analyze -n <namespace>
```

Step 5: Check proxy sync status:

```bash
istioctl proxy-status
```

Look for proxies marked as STALE, which means they have not received the latest configuration from istiod.

**Remediation**:

- If pods are crashing: This is an application issue, not Istio. Escalate to the application team.
- If proxy is STALE: Restart the pod to force a re-sync: `kubectl rollout restart deploy/<service>`
- If `istioctl analyze` shows errors: Identify the misconfigured resource and revert the last change.
- If upstream connection refused: Check if the destination service port name is correct.

## Runbook: mTLS Handshake Failures

**Alert**: `envoy_cluster_ssl_handshake_error > 0` or services returning 503

**Impact**: Services cannot establish mTLS connections. Communication between specific services is broken.

**Diagnostic Steps**:

Step 1: Check the mTLS configuration:

```bash
istioctl authn tls-check deploy/<service> -n <namespace>
```

Look for mismatched TLS modes. The source should use `ISTIO_MUTUAL` and the destination should accept mTLS.

Step 2: Check certificate validity:

```bash
istioctl proxy-config secret deploy/<service> -n <namespace>
```

Verify that the certificates are not expired. The `VALID FROM` and `VALID TO` fields should encompass the current time.

Step 3: Check if istiod is healthy:

```bash
kubectl get pods -n istio-system -l app=istiod
kubectl logs deploy/istiod -n istio-system --tail=100 | grep -i error
```

Step 4: Check PeerAuthentication policies:

```bash
kubectl get peerauthentication -A
```

Look for policies that might have changed recently.

**Remediation**:

- If certificates are expired: Restart istiod to trigger certificate rotation: `kubectl rollout restart deploy/istiod -n istio-system`
- If mTLS mode mismatch: Change PeerAuthentication to PERMISSIVE temporarily, then investigate:

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: temporary-permissive
  namespace: <affected-namespace>
spec:
  mtls:
    mode: PERMISSIVE
```

- If istiod is unhealthy: Check resource limits and restart: `kubectl rollout restart deploy/istiod -n istio-system`

**Escalation**: If certificates cannot be renewed or istiod is persistently unhealthy, escalate to the platform team lead.

## Runbook: Ingress Gateway Not Routing Traffic

**Alert**: External endpoints returning 404 or 503

**Impact**: External users cannot reach services through the ingress gateway.

**Diagnostic Steps**:

Step 1: Check the gateway pods:

```bash
kubectl get pods -n istio-system -l istio=ingressgateway
kubectl logs -n istio-system -l istio=ingressgateway --tail=50
```

Step 2: Check the Gateway and VirtualService resources:

```bash
kubectl get gateways -A
kubectl get virtualservices -A
```

Step 3: Verify the listener configuration:

```bash
istioctl proxy-config listeners deploy/istio-ingressgateway -n istio-system
```

Step 4: Check routes:

```bash
istioctl proxy-config routes deploy/istio-ingressgateway -n istio-system
```

Look for your hostname in the route output. If it is missing, the VirtualService is not bound to the Gateway correctly.

Step 5: Test the endpoint directly:

```bash
kubectl exec -it deploy/istio-ingressgateway -n istio-system -- \
  curl -v -H "Host: app.example.com" http://localhost:8080/
```

**Remediation**:

- If the gateway pod is unhealthy: Restart it: `kubectl rollout restart deploy/istio-ingressgateway -n istio-system`
- If routes are missing: Check the VirtualService gateway reference matches the Gateway name and namespace.
- If TLS certificate is expired: Update the TLS secret and restart the gateway.
- If the listener is missing: The Gateway resource might have been deleted or modified. Check Git for the last change.

## Runbook: Sidecar Injection Failing

**Alert**: New pods starting without sidecar or pods stuck in Init

**Impact**: New deployments are not joining the mesh.

**Diagnostic Steps**:

Step 1: Check if the namespace has injection enabled:

```bash
kubectl get namespace <namespace> --show-labels | grep istio-injection
```

Step 2: Check the sidecar injector webhook:

```bash
kubectl get mutatingwebhookconfigurations istio-sidecar-injector -o yaml
```

Step 3: Check istiod logs for injection errors:

```bash
kubectl logs deploy/istiod -n istio-system | grep -i inject
```

Step 4: Check if the pod has injection annotations:

```bash
kubectl get pod <pod-name> -n <namespace> -o jsonpath='{.metadata.annotations}'
```

**Remediation**:

- If namespace label is missing: `kubectl label namespace <namespace> istio-injection=enabled`
- If webhook is not configured: Istiod may have failed to register. Restart istiod.
- If pod has `sidecar.istio.io/inject: "false"`: This is intentional, check with the service owner.
- If init container is failing: Check init container logs: `kubectl logs <pod> -c istio-init`

## Runbook: Configuration Drift

**Alert**: `istioctl analyze` reporting new warnings in production

**Impact**: Istio configuration may not match what is in Git.

**Diagnostic Steps**:

Step 1: Run full analysis:

```bash
istioctl analyze -A
```

Step 2: Compare cluster state to Git:

```bash
# For each resource type, check for differences
kubectl get virtualservices -A -o yaml > /tmp/cluster-vs.yaml
diff /tmp/cluster-vs.yaml <(cat istio-config/namespaces/*/virtualservice.yaml)
```

Step 3: Check for manual changes (resources without GitOps labels):

```bash
kubectl get virtualservices -A -o json | \
  jq '.items[] | select(.metadata.labels["argocd.argoproj.io/instance"] == null) | .metadata.name'
```

**Remediation**:

- If resources exist in cluster but not in Git: Either add them to Git or delete them from the cluster.
- If resources differ: Force a GitOps sync: `argocd app sync istio-config --force`
- If someone applied changes directly: Revert the manual change and educate the team about the change process.

## Runbook: High Latency Through the Mesh

**Alert**: P99 latency exceeding SLO threshold

**Impact**: Service responses are slow, users experiencing degraded performance.

**Diagnostic Steps**:

Step 1: Check if latency is in the sidecar or the application:

```bash
# Compare sidecar latency vs application latency
kubectl exec deploy/<service> -c istio-proxy -- \
  pilot-agent request GET stats | grep "upstream_rq_time"
```

Step 2: Check Envoy resource usage:

```bash
kubectl top pods -l app=<service> --containers
```

Look at the `istio-proxy` container CPU and memory usage.

Step 3: Check for circuit breaker overflows:

```bash
kubectl exec deploy/<service> -c istio-proxy -- \
  pilot-agent request GET stats | grep "overflow"
```

Step 4: Check the number of active connections:

```bash
kubectl exec deploy/<service> -c istio-proxy -- \
  pilot-agent request GET stats | grep "cx_active"
```

**Remediation**:

- If sidecar CPU is high: Increase sidecar resource limits in the pod annotation:

```yaml
annotations:
  sidecar.istio.io/proxyCPU: "500m"
  sidecar.istio.io/proxyMemory: "256Mi"
```

- If circuit breaker overflow: Increase connection limits in the DestinationRule.
- If application is slow: This is not an Istio issue. Escalate to the application team.

## Keeping Runbooks Updated

Runbooks go stale fast. After every incident involving Istio:

1. Check if the runbook covered the scenario
2. If not, add a new runbook
3. If the runbook was incomplete, update it
4. Review runbooks quarterly and remove outdated ones

Store runbooks alongside your Istio configuration in Git, or in your team's wiki with links from your alerting system.

## Summary

Good Istio runbooks follow a consistent structure and give on-call engineers clear, actionable steps. Cover the most common failure modes: error rate spikes, mTLS failures, gateway routing issues, injection problems, configuration drift, and latency issues. Keep them updated after every incident. The goal is that any engineer on the team can follow the runbook and resolve the issue without needing deep Istio expertise.
