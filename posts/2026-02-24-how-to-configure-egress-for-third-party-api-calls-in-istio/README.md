# How to Configure Egress for Third-Party API Calls in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Egress, Kubernetes, Service Mesh, API Integration

Description: Learn how to configure Istio egress rules to allow your services to call third-party APIs like Stripe, Twilio, and other external endpoints securely.

---

Most production applications need to talk to external services. Whether it is a payment gateway like Stripe, a messaging service like Twilio, or a monitoring tool, your pods need a way out. By default, Istio allows all outbound traffic, but in a locked-down mesh where you have set the outbound traffic policy to REGISTRY_ONLY, things break fast if you have not explicitly configured egress for those third-party API calls.

This guide walks through configuring Istio to let your services reach external APIs while keeping everything else locked down.

## Understanding Istio's Outbound Traffic Policy

Istio has two modes for handling outbound traffic from the mesh:

- **ALLOW_ANY** - The default. Pods can reach any external address.
- **REGISTRY_ONLY** - Pods can only reach services registered in the Istio service registry (including ServiceEntry resources).

If you are running with REGISTRY_ONLY (which you should be in production for security reasons), your pods will get 502 errors when trying to reach any external API that is not explicitly registered.

Check your current setting:

```bash
kubectl get configmap istio -n istio-system -o yaml | grep outboundTrafficPolicy
```

To switch to REGISTRY_ONLY mode:

```bash
istioctl install --set meshConfig.outboundTrafficPolicy.mode=REGISTRY_ONLY
```

## Creating ServiceEntry Resources for External APIs

The core mechanism for allowing egress traffic in REGISTRY_ONLY mode is the `ServiceEntry` resource. This tells Istio about an external service and how to route traffic to it.

Here is a ServiceEntry for the Stripe API:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: stripe-api
  namespace: payments
spec:
  hosts:
  - api.stripe.com
  ports:
  - number: 443
    name: https
    protocol: TLS
  resolution: DNS
  location: MESH_EXTERNAL
```

And one for Twilio:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: twilio-api
  namespace: notifications
spec:
  hosts:
  - api.twilio.com
  ports:
  - number: 443
    name: https
    protocol: TLS
  resolution: DNS
  location: MESH_EXTERNAL
```

Apply them:

```bash
kubectl apply -f stripe-service-entry.yaml
kubectl apply -f twilio-service-entry.yaml
```

## Handling Multiple Hosts for a Single Provider

Some APIs use multiple hostnames. For example, AWS services use region-specific endpoints. You can list multiple hosts in a single ServiceEntry:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: aws-s3-endpoints
  namespace: data-processing
spec:
  hosts:
  - s3.amazonaws.com
  - s3.us-east-1.amazonaws.com
  - s3.us-west-2.amazonaws.com
  ports:
  - number: 443
    name: https
    protocol: TLS
  resolution: DNS
  location: MESH_EXTERNAL
```

## Adding Traffic Management to Egress

You can pair a ServiceEntry with a VirtualService and DestinationRule to add timeouts, retries, and connection limits to your external API calls. This is extremely useful for protecting your services from slow third-party responses.

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: stripe-api-vs
  namespace: payments
spec:
  hosts:
  - api.stripe.com
  http:
  - timeout: 10s
    retries:
      attempts: 3
      perTryTimeout: 3s
      retryOn: 5xx,reset,connect-failure
    route:
    - destination:
        host: api.stripe.com
        port:
          number: 443
```

And a DestinationRule for connection pool settings:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: stripe-api-dr
  namespace: payments
spec:
  host: api.stripe.com
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
      http:
        h2UpgradePolicy: DO_NOT_UPGRADE
        maxRequestsPerConnection: 10
    tls:
      mode: SIMPLE
      sni: api.stripe.com
```

## Restricting Egress Access by Namespace

One thing that catches people off guard is that ServiceEntry resources are namespace-scoped by default (unless you configure them in the root namespace or use exportTo). If you want only the payments namespace to reach Stripe, set the exportTo field:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: stripe-api
  namespace: payments
spec:
  hosts:
  - api.stripe.com
  ports:
  - number: 443
    name: https
    protocol: TLS
  resolution: DNS
  location: MESH_EXTERNAL
  exportTo:
  - "."
```

The `"."` means this ServiceEntry is only visible to the namespace where it is defined.

## Wildcard Hosts for API Subdomains

If your external service uses many subdomains (like `*.googleapis.com`), you can use wildcard entries:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: google-apis
  namespace: default
spec:
  hosts:
  - "*.googleapis.com"
  ports:
  - number: 443
    name: https
    protocol: TLS
  resolution: NONE
  location: MESH_EXTERNAL
```

Note that when using wildcard hosts, you must set resolution to NONE since DNS resolution cannot work with wildcards at the mesh level.

## Verifying Egress Configuration

After applying your ServiceEntry, test that traffic flows correctly:

```bash
# Deploy a test pod if you don't have one
kubectl run test-curl --image=curlimages/curl -it --rm -- sh

# From inside the pod, try reaching the API
curl -v https://api.stripe.com
```

Check the Istio proxy logs for your application pod to see if traffic is being routed:

```bash
kubectl logs <pod-name> -c istio-proxy | grep "api.stripe.com"
```

You can also use istioctl to analyze potential issues:

```bash
istioctl analyze -n payments
```

## Monitoring Egress Traffic

Once you have egress configured, you want visibility into it. Istio automatically generates metrics for all traffic, including egress. You can query Prometheus for external API call patterns:

```text
istio_requests_total{destination_service="api.stripe.com", reporter="source"}
```

This gives you request counts, response codes, and latency information for all calls to the Stripe API from within your mesh.

## Common Pitfalls

**Forgetting the TLS mode on DestinationRule**: If your application makes HTTPS calls to external APIs, you need to set the TLS mode in the DestinationRule to SIMPLE (for standard TLS) rather than leaving it empty. Without this, the sidecar might try to initiate mTLS with the external service, which will fail.

**DNS resolution failures**: If your ServiceEntry uses `resolution: DNS`, the Istio proxy needs to be able to resolve the hostname. Make sure your cluster DNS can resolve external hostnames. Some restricted environments block external DNS queries.

**Port mismatch**: The port number in your ServiceEntry must match the port your application actually connects to. If your app connects to port 443, the ServiceEntry must list port 443.

**Protocol detection**: Istio tries to detect the protocol of traffic. For HTTPS to external services, use `protocol: TLS` (not HTTPS) in the ServiceEntry port definition. The TLS protocol tells Istio to treat this as opaque TLS traffic and not try to do HTTP-level routing.

## Putting It All Together

A complete egress setup for a third-party API typically involves three resources: a ServiceEntry to register the external host, a VirtualService for traffic management policies, and a DestinationRule for connection-level settings. Start with just the ServiceEntry and add the other resources as needed based on your reliability requirements.

For production environments, always use REGISTRY_ONLY mode and explicitly register every external dependency. This gives you a clear inventory of what your mesh talks to, and it prevents compromised pods from exfiltrating data to arbitrary endpoints.
