# How to Diagnose Why Traffic is Not Reaching Your Service in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Troubleshooting, Traffic Routing, Debugging, Envoy

Description: A systematic troubleshooting guide for when traffic fails to reach your backend services in an Istio service mesh.

---

You deployed your service, everything looks green in Kubernetes, but requests are not getting through. This is one of the most common and frustrating problems in Istio. The good news is that there is a systematic way to track down the issue. The bad news is that there are about a dozen different things that could be wrong.

## Start with the Basics

Before digging into Istio-specific issues, verify that the Kubernetes fundamentals are solid:

```bash
# Is the pod running?
kubectl get pods -n my-namespace -l app=my-service

# Is the service defined?
kubectl get svc my-service -n my-namespace

# Do the endpoints exist?
kubectl get endpoints my-service -n my-namespace

# Can you reach the service directly (bypassing Istio)?
kubectl exec deploy/my-service -c my-container -- curl -s localhost:8080/health
```

If the pod is not running, the service has no endpoints, or the app itself is not responding, the problem is not Istio. Fix the Kubernetes basics first.

## Check the Sidecar Proxy

The istio-proxy container must be running and ready for traffic to flow through the mesh:

```bash
# Is the sidecar injected?
kubectl get pod my-service-pod -n my-namespace -o jsonpath='{.spec.containers[*].name}'

# Is the sidecar ready?
kubectl get pod my-service-pod -n my-namespace -o jsonpath='{.status.containerStatuses[?(@.name=="istio-proxy")].ready}'

# Check sidecar health
kubectl exec my-service-pod -n my-namespace -c istio-proxy -- curl -s localhost:15021/healthz/ready
```

If the sidecar is not injected, check the namespace label:

```bash
kubectl get namespace my-namespace --show-labels | grep istio-injection
```

If `istio-injection=enabled` is not present:

```bash
kubectl label namespace my-namespace istio-injection=enabled
```

Then restart the pods to trigger injection:

```bash
kubectl rollout restart deployment/my-service -n my-namespace
```

## Check Proxy Configuration

Even if the sidecar is running, it might not have the right configuration. Use `istioctl` to verify:

```bash
# Check overall sync status
istioctl proxy-status

# Check listeners on the destination pod
istioctl proxy-config listener deploy/my-service -n my-namespace

# Check if there is a route for your service
istioctl proxy-config route deploy/my-service -n my-namespace

# Check if the cluster (upstream) is defined
istioctl proxy-config cluster deploy/my-service -n my-namespace | grep my-service

# Check if endpoints are populated
istioctl proxy-config endpoint deploy/my-service -n my-namespace | grep my-service
```

If listeners or routes are missing, the configuration has not been pushed from Istiod. Check the Istiod logs:

```bash
kubectl logs deploy/istiod -n istio-system | grep "my-service"
```

## Verify VirtualService and DestinationRule

Misconfigured VirtualService or DestinationRule resources are a very common cause of traffic not reaching services:

```bash
# List all VirtualServices affecting your service
kubectl get virtualservice -A | grep my-service

# List all DestinationRules
kubectl get destinationrule -A | grep my-service

# Validate the configuration
istioctl analyze -n my-namespace
```

Common mistakes include:

**Wrong host in VirtualService:**

```yaml
# Wrong - this does not match the Kubernetes service
spec:
  hosts:
  - my-service.example.com  # This is for external traffic, not internal

# Correct for internal mesh traffic
spec:
  hosts:
  - my-service.my-namespace.svc.cluster.local
```

**Subset defined in VirtualService but not in DestinationRule:**

```yaml
# VirtualService references subset "v2"
- route:
  - destination:
      host: my-service
      subset: v2

# But DestinationRule does not define subset "v2" - this causes 503
```

Make sure every subset referenced in a VirtualService has a matching definition in a DestinationRule.

## Check for Port Mismatches

Port mismatches are a silent killer. The port in your service definition, your deployment, and your Istio config all need to align:

```bash
# Check the service ports
kubectl get svc my-service -n my-namespace -o yaml | grep -A5 ports

# Check what ports the pod is listening on
kubectl exec deploy/my-service -c istio-proxy -- \
  pilot-agent request GET listeners | grep -i "my-service"
```

Also verify that the port is named correctly. Istio requires port names to follow the `<protocol>-<suffix>` convention:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-service
spec:
  ports:
  - name: http-web      # Correct: protocol prefix
    port: 80
    targetPort: 8080
  - name: grpc-api      # Correct: protocol prefix
    port: 9090
    targetPort: 9090
  - name: backend        # Incorrect: no protocol prefix
    port: 8080           # Istio may not handle this correctly
```

## Check mTLS Configuration

If mTLS is misconfigured, one side might be expecting encrypted traffic while the other sends plaintext:

```bash
# Check mTLS status
istioctl authn tls-check my-service-pod.my-namespace my-service.my-namespace.svc.cluster.local
```

Look for mismatches between the client and server TLS settings. If you see `CONFLICT`, that is your problem.

Check the PeerAuthentication policy:

```bash
kubectl get peerauthentication -A
```

If STRICT mode is enabled but some workloads do not have sidecars, those workloads cannot communicate with mesh services.

## Check Authorization Policies

AuthorizationPolicy resources can silently block traffic:

```bash
kubectl get authorizationpolicy -A
```

A deny-all policy or a misconfigured allow policy will block traffic without any obvious error message. Test by temporarily removing authorization policies:

```bash
# View the policy
kubectl get authorizationpolicy -n my-namespace -o yaml

# If you suspect it is blocking, temporarily delete it (in non-production)
kubectl delete authorizationpolicy my-policy -n my-namespace
```

## Trace the Request Path

Use Envoy access logs to trace exactly where a request goes and where it fails:

```bash
# Enable access logs if not already enabled
kubectl exec deploy/my-service -c istio-proxy -- \
  pilot-agent request POST 'logging?level=debug'

# Watch the logs
kubectl logs deploy/my-service -c istio-proxy -f
```

Send a test request and look for the access log entry. The response flags column tells you what happened:

- `NR` - No route configured
- `UH` - No healthy upstream hosts
- `UF` - Upstream connection failure
- `UC` - Upstream connection termination
- `DC` - Downstream connection termination

## Using istioctl analyze

The `istioctl analyze` command catches many common misconfigurations automatically:

```bash
# Analyze a specific namespace
istioctl analyze -n my-namespace

# Analyze the whole mesh
istioctl analyze --all-namespaces
```

This checks for things like missing DestinationRules, conflicting VirtualServices, and gateway misconfigurations.

## Systematic Debugging Checklist

When traffic is not reaching your service, work through this checklist in order:

1. Pod running and healthy? (`kubectl get pods`)
2. Service has endpoints? (`kubectl get endpoints`)
3. Sidecar injected and ready? (check container list and readiness)
4. Proxy config synced? (`istioctl proxy-status`)
5. Listeners configured? (`istioctl proxy-config listener`)
6. Routes configured? (`istioctl proxy-config route`)
7. Endpoints populated? (`istioctl proxy-config endpoint`)
8. mTLS aligned? (`istioctl authn tls-check`)
9. AuthorizationPolicy blocking? (`kubectl get authorizationpolicy`)
10. VirtualService/DestinationRule correct? (`istioctl analyze`)

By working through this list methodically, you will find the root cause. Most of the time, it is one of the top five items - something simple that got missed during deployment.
