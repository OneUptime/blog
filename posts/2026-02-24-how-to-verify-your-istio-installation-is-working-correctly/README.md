# How to Verify Your Istio Installation is Working Correctly

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Verification, Kubernetes, Troubleshooting, Service Mesh

Description: A comprehensive checklist and set of commands to verify that your Istio service mesh installation is healthy and functioning as expected.

---

You just installed Istio. Everything seemed to go smoothly, no errors in the output. But is it actually working? An Istio installation has many moving parts, and it is not always obvious when something is subtly broken. This guide walks through a systematic verification process so you can confirm everything is healthy before deploying workloads.

## Quick Health Check

Start with the basics. Is the control plane running?

```bash
kubectl get pods -n istio-system
```

You should see something like:

```
NAME                      READY   STATUS    RESTARTS   AGE
istiod-7f4b8c6d7c-abc12   1/1     Running   0          5m
```

All pods should be in `Running` state with all containers ready.

Check the istiod logs for errors:

```bash
kubectl logs -n istio-system deploy/istiod --tail=50
```

Look for any ERROR or WARN messages. Some warnings during startup are normal (like waiting for secrets), but persistent errors indicate a problem.

## Using istioctl verify-install

Istio provides a built-in verification command:

```bash
istioctl verify-install
```

This checks that all expected resources are present and configured correctly. If you installed with a specific profile or IstioOperator manifest:

```bash
istioctl verify-install -f your-istio-config.yaml
```

The output will list each resource and whether it matches the expected state.

## Running istioctl analyze

The `analyze` command is your best friend for finding configuration issues:

```bash
# Analyze the entire cluster
istioctl analyze --all-namespaces
```

This checks for common misconfigurations like:
- Missing sidecar injector webhook
- Conflicting VirtualService definitions
- Gateway referring to non-existent secrets
- Pods without sidecars in injected namespaces

For a specific namespace:

```bash
istioctl analyze -n my-app
```

The output uses severity levels (Error, Warning, Info) to help you prioritize fixes.

## Checking the Sidecar Injector

Verify the mutating webhook is registered:

```bash
kubectl get mutatingwebhookconfiguration | grep istio
```

You should see `istio-sidecar-injector` (or a revision-specific name like `istio-sidecar-injector-1-24`).

Test injection by creating a test namespace and deploying a pod:

```bash
kubectl create namespace injection-test
kubectl label namespace injection-test istio-injection=enabled
kubectl run test-inject --image=busybox --restart=Never -n injection-test -- sleep 3600
```

Wait a moment, then check:

```bash
kubectl get pod test-inject -n injection-test -o jsonpath='{.spec.containers[*].name}'
```

You should see `test-inject istio-proxy`. If you only see `test-inject`, injection is not working.

Clean up:

```bash
kubectl delete namespace injection-test
```

## Verifying mTLS

Check the mesh-wide mTLS policy:

```bash
kubectl get peerauthentication -A
```

Verify that traffic between services is encrypted:

```bash
istioctl proxy-config secret deploy/istiod -n istio-system
```

Deploy two test pods and verify mTLS is active:

```bash
kubectl create namespace mtls-test
kubectl label namespace mtls-test istio-injection=enabled

# Deploy httpbin
kubectl apply -n mtls-test -f https://raw.githubusercontent.com/istio/istio/release-1.24/samples/httpbin/httpbin.yaml

# Deploy sleep
kubectl apply -n mtls-test -f https://raw.githubusercontent.com/istio/istio/release-1.24/samples/sleep/sleep.yaml
```

Wait for pods to be ready, then check the connection:

```bash
kubectl exec -n mtls-test deploy/sleep -c sleep -- \
  curl -s http://httpbin.mtls-test:8000/ip
```

Check if the connection used mTLS:

```bash
kubectl exec -n mtls-test deploy/sleep -c istio-proxy -- \
  curl -s localhost:15000/stats | grep ssl.handshake
```

If `ssl.handshake` counter is greater than 0, mTLS is working.

## Checking Proxy Status

The proxy-status command shows whether all sidecars are connected and in sync with istiod:

```bash
istioctl proxy-status
```

The output looks like:

```
NAME                            CLUSTER   CDS   LDS   EDS   RDS   ECDS   ISTIOD
httpbin-abc123.mtls-test        K8s       SYNCED SYNCED SYNCED SYNCED        istiod-xyz
sleep-def456.mtls-test          K8s       SYNCED SYNCED SYNCED SYNCED        istiod-xyz
```

Everything should say `SYNCED`. If you see `STALE` or `NOT SENT`, there is a configuration delivery issue.

## Verifying DNS Resolution

Istio can capture DNS queries for service resolution:

```bash
kubectl exec -n mtls-test deploy/sleep -c sleep -- nslookup httpbin.mtls-test.svc.cluster.local
```

If you enabled DNS capture in your mesh config:

```yaml
meshConfig:
  defaultConfig:
    proxyMetadata:
      ISTIO_META_DNS_CAPTURE: "true"
```

Then DNS queries go through the Envoy proxy. Verify:

```bash
kubectl exec -n mtls-test deploy/sleep -c istio-proxy -- \
  curl -s localhost:15000/stats | grep dns
```

## Checking Gateway Health

If you installed a gateway:

```bash
kubectl get pods -n istio-ingress
kubectl get svc -n istio-ingress
```

The gateway should have an external IP or hostname:

```bash
kubectl get svc -n istio-ingress -o jsonpath='{.items[0].status.loadBalancer.ingress[0]}'
```

Test the gateway responds:

```bash
GATEWAY_IP=$(kubectl get svc -n istio-ingress istio-ingress \
  -o jsonpath='{.status.loadBalancer.ingress[0].ip}')

curl -v http://${GATEWAY_IP}:80/
```

You should get a connection response (likely a 404 if no routes are configured, which is fine - it means the gateway is alive).

## Verifying Proxy Configuration

Check the Envoy configuration for a specific proxy:

```bash
# List listeners
istioctl proxy-config listener deploy/httpbin -n mtls-test

# List routes
istioctl proxy-config routes deploy/httpbin -n mtls-test

# List clusters (upstream services)
istioctl proxy-config cluster deploy/httpbin -n mtls-test

# List endpoints
istioctl proxy-config endpoint deploy/httpbin -n mtls-test
```

Each command should return reasonable output. Empty results might indicate istiod is not pushing configuration properly.

## Checking Component Versions

Make sure all components are running the same version:

```bash
istioctl version
```

This shows the client version, the control plane version, and the data plane (proxy) versions. Mismatched versions can cause subtle issues.

## Resource Usage Check

Verify Istio components have enough resources:

```bash
kubectl top pods -n istio-system
```

If istiod is consuming close to its memory limit, it might OOM-kill under load. Check current limits:

```bash
kubectl get deploy istiod -n istio-system -o jsonpath='{.spec.template.spec.containers[0].resources}'
```

## CRD Verification

Make sure all Istio CRDs are installed:

```bash
kubectl get crds | grep istio.io
```

You should see CRDs like:
- `virtualservices.networking.istio.io`
- `destinationrules.networking.istio.io`
- `gateways.networking.istio.io`
- `serviceentries.networking.istio.io`
- `peerauthentications.security.istio.io`
- And several more

## Automated Verification Script

Here is a quick bash script that runs through the essential checks:

```bash
#!/bin/bash

echo "=== Istio Control Plane ==="
kubectl get pods -n istio-system

echo ""
echo "=== Sidecar Injector Webhook ==="
kubectl get mutatingwebhookconfiguration | grep istio

echo ""
echo "=== Proxy Status ==="
istioctl proxy-status

echo ""
echo "=== Configuration Analysis ==="
istioctl analyze --all-namespaces

echo ""
echo "=== Version Check ==="
istioctl version

echo ""
echo "=== CRDs ==="
kubectl get crds | grep -c istio.io
echo "Istio CRDs installed"
```

Save it as `verify-istio.sh` and run after every installation or upgrade.

## Clean Up Test Resources

After verification, remove test resources:

```bash
kubectl delete namespace mtls-test
```

## Wrapping Up

Verification is not something you do just once at installation. Run these checks after upgrades, configuration changes, and periodically as part of your operational routine. The `istioctl analyze` and `istioctl proxy-status` commands are the two most valuable tools - make them part of your regular monitoring workflow.
