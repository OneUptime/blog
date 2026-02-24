# How to Configure Istio Traffic Interception

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Traffic Interception, Envoy, Kubernetes, Networking

Description: Step-by-step guide to configuring Istio traffic interception including port exclusions, IP ranges, capture modes, and CNI plugin setup.

---

Istio intercepts all TCP traffic in and out of your pods by default. That works well for most HTTP-based microservices, but real-world applications often need more control. Maybe your app connects to an external database that shouldn't go through the proxy. Maybe you have a health check port that needs to be excluded. Or maybe you want to switch from the default iptables REDIRECT mode to TPROXY for source IP preservation.

Whatever the reason, Istio gives you multiple knobs to configure exactly how traffic interception works. This guide covers all of them.

## Global Configuration

The mesh-wide traffic interception settings live in the `IstioOperator` configuration or the Istio `ConfigMap`. Here are the key settings:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      interceptionMode: REDIRECT  # or TPROXY
    outboundTrafficPolicy:
      mode: ALLOW_ANY  # or REGISTRY_ONLY
  values:
    global:
      proxy:
        includeIPRanges: "*"
        excludeIPRanges: ""
        includeInboundPorts: "*"
        excludeInboundPorts: ""
        includeOutboundPorts: ""
        excludeOutboundPorts: ""
```

The `interceptionMode` controls whether Istio uses REDIRECT (default) or TPROXY for capturing traffic. The `outboundTrafficPolicy` determines what happens to traffic destined for services not in the mesh registry.

## Pod-Level Annotations

You can override the global settings on a per-pod basis using annotations. These are applied to the pod template in your Deployment:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  template:
    metadata:
      annotations:
        # Exclude specific inbound ports from interception
        traffic.sidecar.istio.io/excludeInboundPorts: "8081,8082"

        # Exclude specific outbound ports from interception
        traffic.sidecar.istio.io/excludeOutboundPorts: "5432,27017"

        # Only intercept traffic to these IP ranges
        traffic.sidecar.istio.io/includeOutboundIPRanges: "10.0.0.0/8,172.16.0.0/12"

        # Exclude specific IP ranges from interception
        traffic.sidecar.istio.io/excludeOutboundIPRanges: "192.168.1.0/24"

        # Only intercept these inbound ports
        traffic.sidecar.istio.io/includeInboundPorts: "8080,8443"

        # Set interception mode for this pod
        sidecar.istio.io/interceptionMode: TPROXY
    spec:
      containers:
        - name: my-app
          image: my-app:latest
          ports:
            - containerPort: 8080
```

### Excluding Database Ports

One of the most common use cases is excluding database traffic. When your app connects to a PostgreSQL database running outside the mesh, you don't want Istio trying to apply HTTP routing to a PostgreSQL wire protocol:

```yaml
metadata:
  annotations:
    traffic.sidecar.istio.io/excludeOutboundPorts: "5432"
```

This adds a RETURN rule in the iptables OUTPUT chain for port 5432, so traffic goes directly to the database without touching Envoy.

### Excluding External IP Ranges

If your cluster talks to external services on known IP ranges, you can exclude them:

```yaml
metadata:
  annotations:
    traffic.sidecar.istio.io/excludeOutboundIPRanges: "169.254.169.254/32"
```

This is especially useful for cloud metadata endpoints (like the AWS instance metadata service at 169.254.169.254) that should never go through the proxy.

## Using the Sidecar Resource

The `Sidecar` resource gives you more fine-grained control over traffic interception at the workload level:

```yaml
apiVersion: networking.istio.io/v1
kind: Sidecar
metadata:
  name: my-app-sidecar
  namespace: default
spec:
  workloadSelector:
    labels:
      app: my-app
  ingress:
    - port:
        number: 8080
        protocol: HTTP
        name: http
      defaultEndpoint: 127.0.0.1:8080
      captureMode: IPTABLES
  egress:
    - port:
        number: 9080
        protocol: HTTP
      hosts:
        - "./*"
      captureMode: IPTABLES
    - port:
        number: 443
        protocol: TLS
      hosts:
        - "istio-system/*"
      captureMode: NONE
```

The `captureMode` field on each ingress/egress listener controls whether traffic interception is active:

- `IPTABLES` - Use iptables REDIRECT (default)
- `TPROXY` - Use TPROXY transparent proxying
- `NONE` - No interception; traffic goes directly

Setting `captureMode: NONE` on an egress rule means traffic to those hosts bypasses the proxy entirely.

## Configuring the CNI Plugin

For production environments, the CNI plugin is the preferred way to set up traffic interception. It removes the need for the `istio-init` container and the privileged capabilities that come with it.

Install Istio with CNI:

```bash
istioctl install --set components.cni.enabled=true \
  --set values.cni.cniBinDir=/opt/cni/bin \
  --set values.cni.cniConfDir=/etc/cni/net.d
```

Verify the CNI DaemonSet is running:

```bash
kubectl get daemonset istio-cni-node -n istio-system
```

With CNI enabled, you'll notice that injected pods no longer have the `istio-init` container. The iptables rules are set up by the CNI plugin when the pod's network namespace is created.

You can check the CNI plugin logs if things aren't working:

```bash
kubectl logs -l k8s-app=istio-cni-node -n istio-system
```

## Controlling Outbound Traffic Policy

The outbound traffic policy determines what happens when your app tries to reach a service that Istio doesn't know about:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    outboundTrafficPolicy:
      mode: ALLOW_ANY
```

- `ALLOW_ANY` - Unknown destinations are forwarded through a PassthroughCluster. Traffic flows normally but without Istio features like mTLS or telemetry.
- `REGISTRY_ONLY` - Unknown destinations are blocked. You must create `ServiceEntry` resources for any external service.

The `REGISTRY_ONLY` mode is more secure but requires more configuration. You need ServiceEntry resources for external services:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: external-api
spec:
  hosts:
    - api.example.com
  ports:
    - number: 443
      name: https
      protocol: TLS
  resolution: DNS
  location: MESH_EXTERNAL
```

## Verifying Your Configuration

After making changes, verify that the interception is working as expected:

```bash
# Check the iptables rules in a pod
kubectl exec my-pod -c istio-proxy -- iptables -t nat -L -v -n

# Verify Envoy is receiving traffic
kubectl exec my-pod -c istio-proxy -- pilot-agent request GET stats | grep downstream_cx_total

# Check the proxy configuration
istioctl proxy-config listener my-pod
istioctl proxy-config route my-pod
istioctl proxy-config cluster my-pod
```

You can also use `istioctl analyze` to detect common misconfigurations:

```bash
istioctl analyze -n default
```

## Handling Init Container Failures

If the `istio-init` container fails, no iptables rules get set up and your pod will have no traffic interception. Common failure reasons include:

- Missing `NET_ADMIN` capability (use CNI plugin to avoid this)
- SELinux or AppArmor blocking iptables commands
- Custom PodSecurityPolicy blocking the init container

Check init container status:

```bash
kubectl describe pod my-pod | grep -A10 "Init Containers"
```

## Performance Tuning

For high-throughput workloads, consider these interception-related tuning options:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      concurrency: 2  # Number of Envoy worker threads
      holdApplicationUntilProxyStarts: true  # Prevent app starting before proxy is ready
  values:
    global:
      proxy:
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
          limits:
            cpu: 2000m
            memory: 1024Mi
```

The `holdApplicationUntilProxyStarts` setting is particularly important. Without it, your app might start making requests before Envoy is ready, causing connection failures during startup.

Getting traffic interception right is foundational to a healthy Istio deployment. Start with the defaults, verify they work, and then tune based on your specific requirements.
