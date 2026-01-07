# What Are Blue-Green Deployments (and When Should You Use Them)?

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Releases, Reliability, DevOps

Description: A practical explainer of blue-green deployments-how they work, how to run them with Kubernetes Services/Ingress, the operational guardrails to keep them safe, and when another strategy makes more sense.

---

Blue-green (a.k.a. red-black) deployments keep two production-ready environments side by side. One (blue) serves real users. The other (green) stays idle until the new version passes validation. Flip traffic from blue to green instantaneously, and you get:

- Near-zero downtime releases.
- Instant rollbacks (route traffic back to blue).
- Safe database or infrastructure changes you can verify before customers see them.

## 1. Core Mechanics

1. **Duplicate the stack:** Two identical environments (application binaries, infrastructure config, backing services).
2. **Deploy to idle environment:** Push the new release to green while blue continues handling traffic.
3. **Run checks:** Synthetic tests, smoke suites, or manual validation against green.
4. **Switch traffic:** Update the load balancer, DNS, or Kubernetes Service/Ingress to point at green.
5. **Monitor:** Watch metrics/logs closely. If anything breaks, switch back to blue.
6. **Recycle:** Once green is stable, blue becomes the next staging target.

## 2. Example in Kubernetes

### Step A: Run Two Deployments

The following Kubernetes manifests create two identical deployments distinguished by color labels. Blue runs the current production version, while green runs the new version awaiting validation.

```yaml
# Blue-Green Kubernetes Deployment Configuration
# ===============================================
# This creates two parallel deployments: blue (current) and green (new)

# BLUE DEPLOYMENT - Currently serving production traffic
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-blue
  labels:
    color: blue           # Color label identifies this as the "blue" environment
spec:
  replicas: 3             # Match production capacity for instant traffic switching
  selector:
    matchLabels:
      app: payments-api   # Common app label used by Service selector
      color: blue         # Color label for deployment identification
  template:
    metadata:
      labels:
        app: payments-api   # Pod inherits both labels
        color: blue         # Service selector will match on 'color' to route traffic
    spec:
      containers:
        - name: api
          image: ghcr.io/example/payments-api:1.9.3  # Current stable version
---
# GREEN DEPLOYMENT - New version awaiting validation
# This deployment runs alongside blue but receives NO traffic initially
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-green
  labels:
    color: green          # Green indicates the "staging" or "new" environment
spec:
  replicas: 3             # Same replica count as blue for capacity parity
  selector:
    matchLabels:
      app: payments-api   # Same app label - both deployments serve same application
      color: green        # Different color distinguishes from blue
  template:
    metadata:
      labels:
        app: payments-api   # Both deployments share the app label
        color: green        # Service will switch to green when ready
    spec:
      containers:
        - name: api
          image: ghcr.io/example/payments-api:2.0.0  # New version to deploy
          # Key insight: Green has same resources, probes, and config as blue
          # Only the image tag differs - this ensures fair comparison
```

### Step B: Switch the Service Selector

The Service acts as a traffic router. By changing only the `color` label in the selector, you instantly redirect all traffic from blue to green. This is the core mechanism that enables zero-downtime deployments.

```yaml
# Kubernetes Service for Blue-Green Traffic Switching
# ====================================================
# The Service selector determines which deployment receives traffic

apiVersion: v1
kind: Service
metadata:
  name: payments-api      # Stable endpoint that clients connect to
spec:
  selector:
    app: payments-api     # Matches both blue and green deployments
    color: blue           # <-- THE SWITCH: change to 'green' to redirect traffic
    # When color: blue   -> All traffic goes to blue pods (current production)
    # When color: green  -> All traffic goes to green pods (new version)
    # The switch is instant - no pod restarts, no connection draining needed
  ports:
    - port: 80            # Port exposed to cluster/ingress
      targetPort: 8080    # Port your application listens on

# To perform the cutover, run:
# kubectl patch svc payments-api -p '{"spec":{"selector":{"color":"green"}}}'
#
# To rollback immediately:
# kubectl patch svc payments-api -p '{"spec":{"selector":{"color":"blue"}}}'
```

Changing `color` from `blue` to `green` (via `kubectl apply`) instantly sends traffic to the new Pods. If you prefer Ingress, flip the backend annotations or use header-based routing for canaries first.

### Step C: Validate Before the Flip

Before switching production traffic, thoroughly test the green deployment. The commands below show how to validate the new version without exposing real users to potential issues.

```bash
# Blue-Green Pre-Cutover Validation Commands
# ==========================================

# 1. Port-forward to access green deployment locally
# This creates a tunnel from your machine to the green pods
kubectl port-forward deploy/api-green 8080:8080
# Now you can run smoke tests against http://localhost:8080

# 2. Run your test suite against the green deployment
# Example: curl smoke test
curl -f http://localhost:8080/health || echo "Health check failed!"

# 3. Check green pod logs for errors
# Look for startup issues, connection failures, or exceptions
kubectl logs -l app=payments-api,color=green --tail=100

# 4. Compare metrics between blue and green
# If using Prometheus, query both versions:
# rate(http_requests_total{color="green"}[5m])
# rate(http_requests_total{color="blue"}[5m])

# 5. Verify green pods are all ready
kubectl get pods -l app=payments-api,color=green
# All pods should show Running and Ready (e.g., 3/3)
```

- `kubectl port-forward deploy/api-green 8080:8080` to run smoke tests.
- Run integration suites against the green URL (often via preview DNS like `green.pay.example.com`).
- Monitor logs/metrics exclusively from the green Deployment to ensure health.

## 3. Guardrails for Safe Cutovers

- **Health probes:** Liveness/readiness probes must be accurate; the switch happens fast.
- **Traffic shaping:** Use WAF/load balancer to drain blue gradually if user sessions must end gracefully.
- **Stateful services:** Ensure databases are backward compatible; use feature flags or dual-writes if schemas change.
- **Automation:** Script the flip (`kubectl patch svc ...`) and record change causes for auditing.

## 4. Rollback Playbook

1. Watch dashboards for at least one stabilization window (often 5–15 minutes).
2. If errors spike, patch the Service back to `color: blue`.
3. Keep green around for further debugging; make fixes; redeploy; flip again when ready.
4. Only delete blue once you are confident the new release is stable.

## 5. When Blue-Green Shines

- Hard SLOs on uptime or latency (financial services, APIs with strict SLAs).
- Releases that bundle infrastructure changes or critical security patches.
- Environments where users must see the new version all at once (no partial rollouts).

## 6. When You Might Choose Another Strategy

| Scenario | Better Strategy |
| --- | --- |
| Limited cluster capacity | Rolling updates or canaries (no need to run double capacity). |
| Need gradual exposure | Canary or traffic splitting (feature flags, progressive delivery). |
| Long-running sessions | Session-aware draining + rolling updates to prevent abrupt disconnects. |
| Data migrations that break backward compatibility | Feature flags, dual-read/write periods, or good old maintenance windows. |

## 7. Checklist Before Adopting Blue-Green

- [ ] Double-check you have enough compute budget for duplicate environments.
- [ ] Automate Service/Ingress switching with IaC or pipelines.
- [ ] Ensure monitoring compares blue vs. green metrics side by side.
- [ ] Document rollback steps and practice them.
- [ ] Keep DNS/Ingress TTLs low if external routing is involved.

---

Blue-green deployments are essentially insurance: pay for parallel infrastructure to buy instant rollbacks and predictable releases. Use them when uptime stakes are high or when you need deterministic, binary cutovers. Combine them with good telemetry and automation, and production pushes get boring-in the best way.
