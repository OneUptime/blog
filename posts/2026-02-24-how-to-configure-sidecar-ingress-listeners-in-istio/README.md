# How to Configure Sidecar Ingress Listeners in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Sidecar, Ingresses, Envoy, Kubernetes, Service Mesh

Description: Configure Istio Sidecar ingress listeners to control how workloads receive inbound traffic with custom ports, protocols, and TLS termination.

---

While most Sidecar resource discussions focus on egress (outbound traffic), the ingress section is just as important. Sidecar ingress listeners control how Envoy handles traffic coming into your pod. By default, Envoy intercepts all inbound traffic on all ports and applies mesh policies. But sometimes you need more control - different protocols on different ports, custom TLS settings, or traffic that should bypass the proxy entirely.

The ingress configuration becomes especially relevant when your pods expose multiple ports, serve mixed protocols, or need specific performance tuning for inbound traffic.

## How Ingress Listeners Work

When traffic arrives at a pod, it follows this path:

1. Traffic arrives at the pod's IP on a specific port
2. iptables rules redirect it to Envoy's inbound listener
3. Envoy applies any configured policies (mTLS, authorization)
4. Envoy forwards the traffic to the application on localhost

Without explicit ingress configuration, Envoy creates listeners based on workload information from the orchestration platform, such as exposed ports and services. If you specify Sidecar ingress listeners, the inbound ports are configured only when the workload instance is associated with a service. The Sidecar ingress section lets you customize this behavior.

## Basic Ingress Configuration

Here is a Sidecar with explicit ingress listener configuration:

```yaml
apiVersion: networking.istio.io/v1
kind: Sidecar
metadata:
  name: my-service-sidecar
  namespace: backend
spec:
  workloadSelector:
    labels:
      app: my-service
  ingress:
    - port:
        number: 8080
        protocol: HTTP
        name: http
      defaultEndpoint: 127.0.0.1:8080
```

This tells Envoy:
- Listen for inbound traffic on port 8080
- Treat it as HTTP protocol
- Forward it to the application at 127.0.0.1:8080

The `defaultEndpoint` specifies where Envoy forwards the traffic after processing it. This is almost always `127.0.0.1:<port>` because the application runs on localhost inside the same pod.

## Multiple Ingress Ports

If your pod exposes multiple ports (like an HTTP API and a gRPC service), configure each one:

```yaml
apiVersion: networking.istio.io/v1
kind: Sidecar
metadata:
  name: multi-port-sidecar
  namespace: backend
spec:
  workloadSelector:
    labels:
      app: multi-service
  ingress:
    - port:
        number: 8080
        protocol: HTTP
        name: http-api
      defaultEndpoint: 127.0.0.1:8080
    - port:
        number: 9090
        protocol: GRPC
        name: grpc-service
      defaultEndpoint: 127.0.0.1:9090
    - port:
        number: 9091
        protocol: HTTP
        name: http-metrics
      defaultEndpoint: 127.0.0.1:9091
```

Each port gets its own listener with the appropriate protocol. The HTTP API gets HTTP-specific features (header routing, content-based routing), the gRPC port gets HTTP/2 handling, and the metrics port gets basic HTTP.

## Forwarding to Different Local Ports

Sometimes the port that external traffic arrives on differs from the port your application listens on. The ingress listener handles this mapping:

```yaml
apiVersion: networking.istio.io/v1
kind: Sidecar
metadata:
  name: port-mapping
  namespace: backend
spec:
  workloadSelector:
    labels:
      app: legacy-app
  ingress:
    - port:
        number: 80
        protocol: HTTP
        name: http
      defaultEndpoint: 127.0.0.1:3000
```

External traffic arrives on port 80 (matching the Kubernetes Service), but Envoy forwards it to the application on port 3000 (where the Node.js app actually listens). This eliminates the need for the application to listen on privileged ports.

## TLS Configuration on Ingress

You can configure how Envoy handles TLS for inbound traffic:

```yaml
apiVersion: networking.istio.io/v1
kind: Sidecar
metadata:
  name: tls-ingress
  namespace: backend
spec:
  workloadSelector:
    labels:
      app: secure-service
  ingress:
    - port:
        number: 8443
        protocol: HTTPS
        name: https
      defaultEndpoint: 127.0.0.1:8080
      tls:
        mode: SIMPLE
        serverCertificate: /etc/certs/server.crt
        privateKey: /etc/certs/server.key
```

With this configuration, Envoy terminates TLS on port 8443 and forwards plaintext HTTP to the application on port 8080. The application does not need to handle TLS at all.

For mutual TLS (mTLS):

```yaml
  ingress:
    - port:
        number: 8443
        protocol: HTTPS
        name: https
      defaultEndpoint: 127.0.0.1:8080
      tls:
        mode: MUTUAL
        serverCertificate: /etc/certs/server.crt
        privateKey: /etc/certs/server.key
        caCertificates: /etc/certs/ca.crt
```

Note: Istio's automatic mTLS between mesh services is handled separately from this configuration. The ingress TLS setting here is for custom TLS requirements, like terminating TLS from non-mesh clients.

## Capture Mode for Ingress

Control how traffic is captured for each ingress port:

```yaml
apiVersion: networking.istio.io/v1
kind: Sidecar
metadata:
  name: capture-mode-sidecar
  namespace: backend
spec:
  workloadSelector:
    labels:
      app: my-service
  ingress:
    - port:
        number: 8080
        protocol: HTTP
        name: http
      defaultEndpoint: 127.0.0.1:8080
      captureMode: IPTABLES
    - port:
        number: 9090
        protocol: TCP
        name: tcp-admin
      defaultEndpoint: 127.0.0.1:9090
      captureMode: NONE
```

The admin port (9090) uses `captureMode: NONE`, meaning traffic is not captured by iptables for that listener. With `NONE`, traffic must be sent directly to the Envoy listener address and the listener port must not already be in use by another process. This is useful for:
- Workloads deployed without iptables-based traffic capture
- Explicit listeners on a separate interface or port
- Ports where the application can intentionally address the proxy listener

## Combining Ingress and Egress

A complete Sidecar resource typically has both ingress and egress sections:

```yaml
apiVersion: networking.istio.io/v1
kind: Sidecar
metadata:
  name: complete-sidecar
  namespace: backend
spec:
  workloadSelector:
    labels:
      app: order-service
  ingress:
    - port:
        number: 8080
        protocol: HTTP
        name: http
      defaultEndpoint: 127.0.0.1:8080
    - port:
        number: 8443
        protocol: GRPC
        name: grpc
      defaultEndpoint: 127.0.0.1:8443
  egress:
    - hosts:
        - "./*"
        - "istio-system/*"
        - "*/api.stripe.com"
    - port:
        number: 5432
        protocol: TCP
        name: tcp-postgres
      hosts:
        - "*/database.rds.amazonaws.com"
```

This gives you control over both inbound and outbound traffic for the order-service. The external hosts in the egress section must also exist in Istio's service registry, typically through matching `ServiceEntry` resources.

## Practical Use Case: Sidecar for a Java Application

Java applications often expose multiple ports - one for the API, one for actuator/health endpoints, and sometimes one for JMX:

```yaml
apiVersion: networking.istio.io/v1
kind: Sidecar
metadata:
  name: java-app-sidecar
  namespace: backend
spec:
  workloadSelector:
    labels:
      app: java-api
  ingress:
    - port:
        number: 8080
        protocol: HTTP
        name: http-api
      defaultEndpoint: 127.0.0.1:8080
    - port:
        number: 8081
        protocol: HTTP
        name: http-actuator
      defaultEndpoint: 127.0.0.1:8081
  egress:
    - hosts:
        - "./*"
        - "istio-system/*"
```

The actuator port gets its own ingress listener so Envoy can handle it with the correct protocol settings.

## Verifying Ingress Listener Configuration

Check what inbound listeners Envoy has:

```bash
# List all listeners and look for the inbound listener on 15006 and the workload port

istioctl proxy-config listener deploy/my-service -n backend

# Get detailed config for inbound listeners
istioctl proxy-config listener deploy/my-service -n backend \
  --port 8080 -o json

# Check route configuration and look for inbound route names
istioctl proxy-config routes deploy/my-service -n backend \
  | grep inbound
```

## Debugging Ingress Issues

If inbound traffic is not reaching your application:

```bash
# Check if the listener exists for the port
istioctl proxy-config listener deploy/my-service -n backend | grep 8080

# Check the cluster config for the inbound endpoint
istioctl proxy-config cluster deploy/my-service -n backend | grep inbound

# Check Envoy access logs for inbound traffic
kubectl logs deploy/my-service -c istio-proxy | grep "inbound"
```

Common issues:
- `defaultEndpoint` pointing to the wrong localhost port
- Protocol mismatch (HTTP when the app expects GRPC)
- TLS configuration errors when using custom certificates
- Application not listening on 127.0.0.1 (some apps bind to 0.0.0.0)

**Application binding.** If your application binds to `0.0.0.0`, the `defaultEndpoint` should use `127.0.0.1`. If your application explicitly binds to `127.0.0.1`, it works the same way. But if your application binds to the pod IP specifically, you might need to adjust the defaultEndpoint to use `0.0.0.0:<port>`.

## Health Checks Through Ingress

Kubernetes HTTP, TCP, and gRPC health checks need special handling with an Istio sidecar because inbound traffic can be redirected through the proxy and mTLS can block kubelet probes.

Istio rewrites HTTP, TCP, and gRPC health check probes by default so they are handled by the sidecar agent and forwarded safely to the application. For custom protocols, use command probes or disable probe rewriting and exclude the port from sidecar capture with pod annotations such as `traffic.sidecar.istio.io/excludeInboundPorts`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-service
  namespace: backend
spec:
  selector:
    matchLabels:
      app: my-service
  template:
    metadata:
      labels:
        app: my-service
      annotations:
        traffic.sidecar.istio.io/excludeInboundPorts: "8081"
    spec:
      containers:
        - name: my-service
          image: example/my-service:latest
          ports:
            - containerPort: 8080
            - containerPort: 8081
```

The health check port (8081) bypasses Envoy because Istio does not capture inbound traffic on that port.

Sidecar ingress listeners give you fine-grained control over how your workloads receive traffic. For most services, the default behavior works fine. But when you have multi-port services, custom TLS requirements, or need to bypass the proxy for specific ports, explicit ingress configuration is the tool you need.
