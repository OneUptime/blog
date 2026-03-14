# How to Handle mTLS for Services Behind Load Balancer

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, MTLS, Load Balancer, Kubernetes, Networking

Description: Configure Istio mTLS correctly when your services sit behind external or internal load balancers, including TLS termination and passthrough scenarios.

---

Load balancers add a layer of complexity to mTLS in Istio. Whether you are using a cloud provider's load balancer, an nginx ingress controller, or a hardware load balancer, the interaction between the load balancer and Istio's mTLS needs careful configuration. Get it wrong and you will see connection resets, certificate errors, or traffic that silently bypasses your mTLS policies.

This guide covers the common load balancer scenarios and how to configure mTLS correctly for each.

## Understanding the Traffic Flow

With a load balancer in front of your Istio mesh, the traffic flow looks like this:

```text
Client -> Load Balancer -> Istio Ingress Gateway -> Service (with sidecar)
```

mTLS applies between the ingress gateway and the service (and between services). The segment between the client and the load balancer, and between the load balancer and the ingress gateway, is handled separately.

## Scenario 1: Cloud Load Balancer with TLS Termination

This is the most common setup. The cloud load balancer (AWS ALB, GCP HTTPS LB, Azure Application Gateway) terminates TLS from the client and forwards traffic to the Istio ingress gateway over HTTP or a new TLS connection.

```text
Client --HTTPS--> Cloud LB --HTTP--> Ingress Gateway --mTLS--> Service
```

The load balancer terminates the client's TLS connection. Traffic between the LB and the ingress gateway can be HTTP (if they are in the same VPC/network) or HTTPS (if you configure the LB to re-encrypt).

Configure the Istio ingress gateway to accept HTTP from the load balancer:

```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: my-gateway
  namespace: default
spec:
  selector:
    istio: ingressgateway
  servers:
  - port:
      number: 80
      name: http
      protocol: HTTP
    hosts:
    - "myapp.example.com"
```

From the ingress gateway to the backend service, mTLS is handled automatically by the sidecars. No special configuration needed for this segment.

The PeerAuthentication policy on the backend service should be STRICT:

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: backend-strict
  namespace: default
spec:
  selector:
    matchLabels:
      app: my-backend
  mtls:
    mode: STRICT
```

## Scenario 2: Load Balancer with TLS Passthrough

In passthrough mode, the load balancer does not terminate TLS. It forwards the raw TCP connection to the Istio ingress gateway, which handles TLS termination.

```text
Client --TLS--> Cloud LB (passthrough) --TLS--> Ingress Gateway --mTLS--> Service
```

Configure the load balancer for TCP/TLS passthrough (this varies by cloud provider). On the Istio side:

```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: my-gateway
  namespace: default
spec:
  selector:
    istio: ingressgateway
  servers:
  - port:
      number: 443
      name: https
      protocol: HTTPS
    tls:
      mode: SIMPLE
      credentialName: my-tls-cert
    hosts:
    - "myapp.example.com"
```

The `credentialName` references a Kubernetes secret containing the TLS certificate for `myapp.example.com`:

```bash
kubectl create secret tls my-tls-cert -n istio-system \
  --cert=server.crt --key=server.key
```

With passthrough, the ingress gateway sees the original TLS connection and can read the SNI header to route traffic correctly.

## Scenario 3: Internal Load Balancer Between Services

Some architectures use internal load balancers between service tiers, especially when migrating from a traditional load-balanced architecture to a mesh:

```text
Service A (sidecar) --mTLS--> Internal LB --???--> Service B (sidecar)
```

This is problematic. The internal load balancer sits between two sidecars and breaks the mTLS connection. The sidecar on Service A initiates mTLS, but the load balancer does not understand mTLS certificates from Istio's CA.

**Solution 1: Remove the internal load balancer.** In a mesh, you do not need it. Istio handles load balancing through the sidecar proxies. Configure the Service directly:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: service-b
  namespace: default
spec:
  selector:
    app: service-b
  ports:
  - port: 8080
    targetPort: 8080
```

Service A's sidecar will automatically load balance across all pods of Service B.

**Solution 2: Configure the load balancer for TCP passthrough.** If you must keep the internal LB, configure it to pass TCP connections through without terminating TLS. The mTLS handshake will happen end-to-end between the sidecars.

## Scenario 4: Load Balancer Without Sidecar

If your load balancer is running as a pod in the cluster without a sidecar (like an nginx ingress controller without sidecar injection), it cannot participate in mTLS:

```text
nginx-ingress (no sidecar) --plaintext--> Service B (sidecar, STRICT mTLS)
```

This will fail because Service B requires mTLS but nginx-ingress cannot present Istio certificates.

**Solution 1: Inject a sidecar into the ingress controller:**

```bash
kubectl label namespace ingress-nginx istio-injection=enabled
kubectl rollout restart deployment -n ingress-nginx
```

Now the nginx ingress pods have sidecars that handle mTLS automatically.

**Solution 2: Set PERMISSIVE mode for the backend:**

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: backend-permissive-for-lb
  namespace: default
spec:
  selector:
    matchLabels:
      app: my-backend
  mtls:
    mode: PERMISSIVE
```

This is less secure because it also allows other plaintext connections, but it works as a transitional step.

**Solution 3: Use DestinationRule to disable mTLS from the ingress controller's perspective:**

If the ingress controller has a sidecar but should not use mTLS for certain backends (unlikely but possible), configure it with a DestinationRule:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: backend-from-ingress
  namespace: default
spec:
  host: my-backend.default.svc.cluster.local
  trafficPolicy:
    tls:
      mode: ISTIO_MUTUAL
```

`ISTIO_MUTUAL` is the default for mesh traffic and tells the sidecar to use Istio's automatically provisioned certificates.

## Preserving Client IP

A common issue with load balancers and mTLS is losing the original client IP. The load balancer sees the client's real IP, but after forwarding through the gateway and sidecars, the backend service sees the sidecar's IP.

To preserve the client IP, configure the ingress gateway service to use `externalTrafficPolicy: Local`:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: istio-ingressgateway
  namespace: istio-system
spec:
  type: LoadBalancer
  externalTrafficPolicy: Local
  ports:
  - port: 443
    targetPort: 8443
    name: https
```

And use the `X-Forwarded-For` header or PROXY protocol depending on your load balancer.

## Health Checks from Load Balancers

Cloud load balancers perform health checks on the ingress gateway pods. These health checks do not use mTLS. Configure the health check to use the Istio status port:

```yaml
# AWS ALB health check target
healthCheckPort: 15021
healthCheckPath: /healthz/ready
```

The Istio ingress gateway exposes a health endpoint on port 15021 that does not require TLS or mTLS.

## Monitoring mTLS Through Load Balancers

Track the connection security policy to see if traffic is correctly using mTLS after passing through the load balancer:

```promql
sum(rate(istio_requests_total{
  destination_app="my-backend",
  connection_security_policy="mutual_tls"
}[5m]))
```

Compare with plaintext connections:

```promql
sum(rate(istio_requests_total{
  destination_app="my-backend",
  connection_security_policy="none"
}[5m]))
```

If you see plaintext connections when you expect all traffic to be mTLS, something in the load balancer path is not configured correctly.

Load balancers and mTLS can work together smoothly, but you need to be clear about where TLS termination happens and ensure that the mTLS segment (between sidecars) is not broken by an intermediate component that does not understand Istio certificates.
