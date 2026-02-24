# How to Create Production Readiness Checklist for Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Production, Kubernetes, Service Mesh, DevOps

Description: A comprehensive guide to building a production readiness checklist for Istio service mesh deployments covering security, performance, and reliability.

---

Running Istio in a development environment is one thing. Running it in production where real users depend on it is a completely different story. Before you flip the switch and send production traffic through your mesh, you need a solid checklist that covers every angle.

I have been through enough production rollouts to know that skipping even a small item can cause hours of debugging at 2 AM. So here is a practical, battle-tested checklist you can adapt for your own Istio production deployments.

## Control Plane Configuration

Start with the control plane. This is the brain of your mesh, and if it goes down, everything else suffers.

Check that istiod is running with appropriate resource requests and limits:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  components:
    pilot:
      k8s:
        resources:
          requests:
            cpu: 500m
            memory: 2Gi
          limits:
            cpu: "2"
            memory: 4Gi
        hpaSpec:
          minReplicas: 2
          maxReplicas: 5
          metrics:
            - type: Resource
              resource:
                name: cpu
                target:
                  type: Utilization
                  averageUtilization: 80
```

Verify that you have at least two replicas of istiod for high availability. A single replica means a single point of failure, and that is not acceptable for production.

Run this quick check:

```bash
kubectl get pods -n istio-system -l app=istiod
```

You should see multiple pods in Running state.

## mTLS Configuration

Mutual TLS should be enforced in STRICT mode for production. Permissive mode is fine during migration, but leaving it on in production means unencrypted traffic can still flow between services.

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: default
  namespace: istio-system
spec:
  mtls:
    mode: STRICT
```

Verify the policy is applied:

```bash
kubectl get peerauthentication -A
```

Make sure no namespace is overriding this with PERMISSIVE mode unless there is a documented and approved exception.

## Authorization Policies

Check that you have default-deny authorization policies in place. Without them, any service can talk to any other service, which defeats one of the major benefits of running a mesh.

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: deny-all
  namespace: production
spec: {}
```

Then add specific allow rules for each service-to-service communication path:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-frontend-to-api
  namespace: production
spec:
  selector:
    matchLabels:
      app: api-server
  action: ALLOW
  rules:
    - from:
        - source:
            principals: ["cluster.local/ns/production/sa/frontend"]
      to:
        - operation:
            methods: ["GET", "POST"]
            paths: ["/api/*"]
```

## Network Resilience

Production traffic needs resilience configuration. Set up circuit breakers, timeouts, and retries for your critical services.

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: api-server
  namespace: production
spec:
  host: api-server
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
      http:
        h2UpgradePolicy: DEFAULT
        http1MaxPendingRequests: 100
        http2MaxRequests: 1000
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 30s
      baseEjectionTime: 30s
      maxEjectionPercent: 50
```

Also make sure you have default timeout settings that make sense for your services:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: api-server
  namespace: production
spec:
  hosts:
    - api-server
  http:
    - timeout: 10s
      route:
        - destination:
            host: api-server
```

## Observability

You need three things working before going to production: metrics, traces, and logs.

Check that Prometheus is scraping Istio metrics:

```bash
kubectl get servicemonitor -n istio-system
```

Verify that you can see the standard Istio metrics:

```bash
kubectl exec -n istio-system deploy/istiod -- pilot-discovery request GET /debug/metrics | head -20
```

For distributed tracing, confirm your services propagate trace headers. Istio generates trace spans, but your application needs to forward headers like `x-request-id`, `x-b3-traceid`, `x-b3-spanid`, and others.

Set the sampling rate appropriately. 100% sampling in production will generate enormous amounts of data:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      tracing:
        sampling: 1.0
```

A 1% sampling rate is a common starting point for production.

## Certificate Management

Check that your root CA certificate is not the default self-signed one. For production, you should use a custom CA or integrate with cert-manager.

```bash
kubectl get secret -n istio-system istio-ca-secret -o jsonpath='{.data.ca-cert\.pem}' | base64 -d | openssl x509 -text -noout
```

Make sure the certificate is not expiring soon and has an appropriate validity period.

## Resource Limits for Sidecars

Every sidecar proxy consumes CPU and memory. Set global defaults that make sense:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      concurrency: 2
  values:
    global:
      proxy:
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
          limits:
            cpu: 500m
            memory: 256Mi
```

Monitor actual usage for a week before production and adjust these values based on real data.

## Gateway Configuration

Your ingress gateways are the front door to your services. Make sure they are properly configured:

```bash
kubectl get gateway -A
kubectl get virtualservice -A
```

Verify TLS certificates on your gateways:

```bash
kubectl get secret -n istio-system -l istio/gateway
```

Check that your gateway has enough replicas and appropriate resource allocations:

```bash
kubectl get hpa -n istio-system
```

## The Checklist Summary

Here is the condensed checklist you can use for your go/no-go meetings:

- [ ] istiod running with 2+ replicas and HPA configured
- [ ] mTLS set to STRICT mode across all namespaces
- [ ] Default-deny authorization policies in place
- [ ] Specific allow rules documented and applied
- [ ] Circuit breakers configured for critical services
- [ ] Timeouts set on all VirtualServices
- [ ] Prometheus scraping Istio metrics
- [ ] Distributed tracing configured with appropriate sampling rate
- [ ] Custom CA certificates installed (not self-signed defaults)
- [ ] Sidecar resource requests and limits defined
- [ ] Ingress gateway TLS certificates valid and not expiring
- [ ] Gateway replicas and HPA configured
- [ ] Istio configuration validated with `istioctl analyze`
- [ ] Load testing completed with mesh enabled
- [ ] Rollback plan documented and tested

## Final Validation

Before you go live, run the built-in analysis tool:

```bash
istioctl analyze --all-namespaces
```

This will catch common misconfigurations like missing destination rules, orphaned virtual services, and conflicting policies. Fix every warning and error it reports. Do not skip this step.

Production readiness is not a one-time event. Schedule regular reviews of your Istio configuration, keep up with security advisories, and test your disaster recovery procedures. The checklist should be a living document that evolves with your infrastructure.
