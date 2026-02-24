# How to Test Applications Before Istio Migration

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Testing, Migration, Kubernetes, Service Mesh

Description: A step-by-step guide to thoroughly testing your applications before migrating them to the Istio service mesh in production.

---

Testing before an Istio migration is not optional. I have seen teams skip this step, thinking "it's just a sidecar, what could go wrong?" Plenty can go wrong. Services break, latencies spike, health checks fail, and database connections drop. All of these are avoidable with proper pre-migration testing.

Here is a structured approach to testing your applications before you flip the switch.

## Step 1: Build an Istio-Enabled Test Environment

Your test environment should mirror production as closely as possible. Install Istio with the same profile and configuration you plan to use in production.

```bash
# Install Istio with your production profile
istioctl install --set profile=default -y

# Verify the installation
istioctl verify-install

# Check all components are running
kubectl get pods -n istio-system
```

If you are using a custom IstioOperator configuration, apply the same one:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
metadata:
  name: istio-control-plane
spec:
  profile: default
  meshConfig:
    accessLogFile: /dev/stdout
    defaultConfig:
      holdApplicationUntilProxyStarts: true
  components:
    pilot:
      k8s:
        resources:
          requests:
            cpu: 200m
            memory: 256Mi
```

```bash
istioctl install -f istio-operator.yaml -y
```

## Step 2: Deploy Your Services with Sidecar Injection

Enable sidecar injection in your test namespace and deploy your applications:

```bash
# Create and label the test namespace
kubectl create namespace istio-test
kubectl label namespace istio-test istio-injection=enabled

# Deploy your application stack
kubectl apply -f your-app-manifests/ -n istio-test

# Verify sidecars are injected
kubectl get pods -n istio-test
# Each pod should show 2/2 containers
```

Check that sidecars are actually running and healthy:

```bash
# Check sidecar status for all pods
istioctl proxy-status

# Look for any pods with issues
kubectl get pods -n istio-test -o json | \
  jq '.items[] | select(.status.containerStatuses[] | select(.name=="istio-proxy") | .ready==false) | .metadata.name'
```

## Step 3: Test Service-to-Service Communication

The first thing to validate is that all your services can still talk to each other. Create a simple test script that hits every service endpoint:

```bash
#!/bin/bash
# test-connectivity.sh

NAMESPACE="istio-test"
SERVICES=$(kubectl get svc -n $NAMESPACE -o jsonpath='{.items[*].metadata.name}')

for svc in $SERVICES; do
  PORT=$(kubectl get svc $svc -n $NAMESPACE -o jsonpath='{.spec.ports[0].port}')
  echo "Testing $svc:$PORT"
  kubectl exec deploy/test-client -n $NAMESPACE -- \
    curl -s -o /dev/null -w "%{http_code}" http://$svc:$PORT/health
  echo ""
done
```

Pay attention to services that use non-HTTP protocols. Istio needs properly named ports to handle them correctly:

```bash
# Check port naming
kubectl get svc -n istio-test -o json | \
  jq '.items[] | {name: .metadata.name, ports: [.spec.ports[] | {name: .name, port: .port}]}'
```

Any ports without proper naming prefixes (http-, grpc-, tcp-, etc.) should be fixed before migration.

## Step 4: Test External Service Access

Applications often call external APIs, databases, or third-party services. These calls go through the Envoy proxy and might need explicit configuration.

```bash
# Test outbound access to external services
kubectl exec deploy/my-app -n istio-test -- curl -v https://api.example.com/health
```

If outbound access is blocked, you need ServiceEntry resources:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: external-api
  namespace: istio-test
spec:
  hosts:
  - api.example.com
  ports:
  - number: 443
    name: https
    protocol: HTTPS
  location: MESH_EXTERNAL
  resolution: DNS
```

Check your mesh configuration for outbound traffic policy:

```bash
kubectl get configmap istio -n istio-system -o yaml | grep outboundTrafficPolicy
```

If it is set to `REGISTRY_ONLY`, you must create ServiceEntry resources for every external service your applications talk to.

## Step 5: Run Load Tests

Latency testing matters because the sidecar adds overhead. You want to know exactly how much before going to production.

```bash
# Install a load testing tool
kubectl apply -f https://raw.githubusercontent.com/fortio/fortio/master/docs/fortio-deployment.yaml -n istio-test

# Run a load test against your service
kubectl exec deploy/fortio -n istio-test -- fortio load \
  -c 50 -qps 1000 -t 60s \
  http://my-service:8080/api/endpoint
```

Compare these results against the same test without Istio. You should expect:

- P50 latency increase of 1-3ms per hop
- P99 latency increase of 5-10ms per hop
- Slight increase in CPU and memory usage

If latencies are significantly higher, check the sidecar resource limits and Envoy concurrency settings.

## Step 6: Test Health Checks and Probes

Health check failures after sidecar injection are one of the most common problems. Test them explicitly:

```bash
# Check that probes are being rewritten
kubectl get pod my-app-pod -n istio-test -o yaml | grep -A 10 "livenessProbe"

# Watch for probe failures
kubectl describe pod my-app-pod -n istio-test | grep -A 5 "Liveness\|Readiness"

# Monitor events for probe failures
kubectl get events -n istio-test --field-selector reason=Unhealthy --watch
```

If probes fail, make sure the `sidecar.istio.io/rewriteAppHTTPProbers` annotation is set to `true`, or configure the probes to work with Istio.

## Step 7: Test Graceful Shutdown

Pod termination behavior changes with sidecars. The sidecar might shut down before your application finishes draining connections. Test this:

```bash
# Start a long-running request
kubectl exec deploy/test-client -n istio-test -- \
  curl -v http://my-service:8080/slow-endpoint &

# While the request is running, trigger a pod restart
kubectl delete pod -l app=my-service -n istio-test

# Check if the request completed successfully or was interrupted
```

If you see connection resets during shutdown, configure the termination drain duration:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  template:
    metadata:
      annotations:
        proxy.istio.io/config: |
          terminationDrainDuration: 30s
    spec:
      terminationGracePeriodSeconds: 45
      containers:
      - name: my-app
        image: my-app:latest
```

## Step 8: Run Integration Tests

Your existing integration test suite should run against the Istio-enabled environment. This catches application-level issues that unit tests miss.

```bash
# Run your integration test suite against the Istio-enabled services
GATEWAY_URL=$(kubectl get svc istio-ingressgateway -n istio-system \
  -o jsonpath='{.status.loadBalancer.ingress[0].ip}')

# Point your tests at the gateway
API_BASE_URL="http://$GATEWAY_URL" npm test
```

## Step 9: Validate with istioctl analyze

Before declaring tests complete, run the built-in configuration analyzer:

```bash
# Analyze all namespaces
istioctl analyze --all-namespaces

# Analyze your specific namespace
istioctl analyze -n istio-test
```

This catches configuration issues like missing DestinationRules, conflicting VirtualServices, and port naming problems.

## Creating a Test Report

Document your test results in a simple format:

- Service connectivity: pass/fail per service pair
- External service access: pass/fail per external dependency
- Latency overhead: P50, P95, P99 with and without sidecar
- Health check status: pass/fail per service
- Graceful shutdown: pass/fail
- Integration tests: pass/fail
- Configuration analysis: warnings and errors

Only proceed with production migration when all critical tests pass. Non-critical warnings can be addressed during or after migration, but anything that affects service availability needs to be fixed first. Testing upfront saves you from firefighting in production.
