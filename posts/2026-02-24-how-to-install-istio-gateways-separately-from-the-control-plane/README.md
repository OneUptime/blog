# How to Install Istio Gateways Separately from the Control Plane

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Gateway, Kubernetes, Service Mesh, Infrastructure

Description: How to decouple Istio gateway installation from the control plane for independent scaling, lifecycle management, and multi-team ownership.

---

In the early days of Istio, everything got installed together - the control plane, ingress gateway, and egress gateway were all one big bundle. That approach works for small setups, but it falls apart quickly in production where different teams own different pieces and you need independent scaling and upgrade cycles.

Modern Istio strongly encourages installing gateways separately from the control plane. Here is how to do it properly.

## Why Separate Gateways?

There are several good reasons to decouple gateways from istiod:

- **Independent scaling**: Your gateway might need 10 replicas during peak hours while istiod stays at 2
- **Different upgrade cadence**: You can upgrade the control plane without touching gateways and vice versa
- **Multi-team ownership**: The platform team manages istiod, the networking team manages gateways
- **Multiple gateways**: Run different gateways for different traffic types (public, internal, partner APIs)
- **Separate failure domains**: A gateway crash does not take down the control plane

## Step 1: Install the Control Plane Without Gateways

Using istioctl, disable the default gateway:

```yaml
# istiod-only.yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  components:
    ingressGateways:
      - name: istio-ingressgateway
        enabled: false
    egressGateways:
      - name: istio-egressgateway
        enabled: false
  meshConfig:
    accessLogFile: /dev/stdout
```

```bash
istioctl install -f istiod-only.yaml -y
```

With Helm, this is even simpler since the charts are already separate:

```bash
helm install istio-base istio/base -n istio-system --create-namespace
helm install istiod istio/istiod -n istio-system
```

No gateway chart installed yet. The control plane is running on its own.

## Step 2: Create a Namespace for the Gateway

Put gateways in their own namespace. This gives you clean RBAC boundaries:

```bash
kubectl create namespace istio-ingress
kubectl label namespace istio-ingress istio-injection=enabled
```

The `istio-injection=enabled` label is important. The gateway pod itself gets an Envoy proxy, and it needs to connect to istiod for configuration.

## Step 3: Install the Ingress Gateway

Using the Istio gateway Helm chart:

```yaml
# values-ingress.yaml
service:
  type: LoadBalancer
  annotations:
    service.beta.kubernetes.io/aws-load-balancer-type: nlb
    service.beta.kubernetes.io/aws-load-balancer-scheme: internet-facing
  ports:
    - name: http2
      port: 80
      targetPort: 80
    - name: https
      port: 443
      targetPort: 443

autoscaling:
  enabled: true
  minReplicas: 2
  maxReplicas: 10
  targetCPUUtilizationPercentage: 75

resources:
  requests:
    cpu: 500m
    memory: 256Mi
  limits:
    cpu: "2"
    memory: 1Gi

podDisruptionBudget:
  minAvailable: 1

affinity:
  podAntiAffinity:
    preferredDuringSchedulingIgnoredDuringExecution:
      - weight: 100
        podAffinityTerm:
          labelSelector:
            matchExpressions:
              - key: istio
                operator: In
                values:
                  - ingressgateway
          topologyKey: kubernetes.io/hostname

topologySpreadConstraints:
  - maxSkew: 1
    topologyKey: topology.kubernetes.io/zone
    whenUnsatisfiable: DoNotSchedule
    labelSelector:
      matchLabels:
        istio: ingressgateway
```

```bash
helm install istio-ingress istio/gateway \
  -n istio-ingress \
  -f values-ingress.yaml
```

## Step 4: Install an Egress Gateway (Optional)

If you need to control outbound traffic, install an egress gateway in its own namespace:

```bash
kubectl create namespace istio-egress
kubectl label namespace istio-egress istio-injection=enabled
```

```yaml
# values-egress.yaml
service:
  type: ClusterIP
  ports:
    - name: http2
      port: 80
      targetPort: 80
    - name: https
      port: 443
      targetPort: 443

autoscaling:
  enabled: true
  minReplicas: 2
  maxReplicas: 5

resources:
  requests:
    cpu: 200m
    memory: 128Mi
  limits:
    cpu: "1"
    memory: 512Mi
```

```bash
helm install istio-egress istio/gateway \
  -n istio-egress \
  -f values-egress.yaml
```

## Step 5: Install Multiple Ingress Gateways

You can run multiple gateways for different use cases. For example, a public gateway and an internal gateway:

```bash
kubectl create namespace istio-ingress-internal
kubectl label namespace istio-ingress-internal istio-injection=enabled
```

```yaml
# values-internal-gateway.yaml
labels:
  istio: internal-ingressgateway

service:
  type: LoadBalancer
  annotations:
    service.beta.kubernetes.io/aws-load-balancer-type: nlb
    service.beta.kubernetes.io/aws-load-balancer-scheme: internal
  ports:
    - name: http2
      port: 80
      targetPort: 80
    - name: https
      port: 443
      targetPort: 443

autoscaling:
  enabled: true
  minReplicas: 2
  maxReplicas: 5
```

```bash
helm install istio-ingress-internal istio/gateway \
  -n istio-ingress-internal \
  -f values-internal-gateway.yaml
```

## Configuring Gateway Resources

Now configure the Istio Gateway and VirtualService to use your specific gateway:

```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: public-gateway
  namespace: istio-ingress
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
        credentialName: my-tls-secret
      hosts:
        - "api.example.com"
---
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: internal-gateway
  namespace: istio-ingress-internal
spec:
  selector:
    istio: internal-ingressgateway
  servers:
    - port:
        number: 80
        name: http
        protocol: HTTP
      hosts:
        - "*.internal.example.com"
```

Route traffic to different backends:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: api-routes
  namespace: my-app
spec:
  hosts:
    - "api.example.com"
  gateways:
    - istio-ingress/public-gateway
  http:
    - match:
        - uri:
            prefix: /v1
      route:
        - destination:
            host: api-v1.my-app.svc.cluster.local
            port:
              number: 80
```

## Upgrading Gateways Independently

One of the biggest advantages of separate installation is independent upgrades. You can upgrade istiod first, then roll gateways:

```bash
# Upgrade control plane
helm upgrade istiod istio/istiod -n istio-system --version 1.24.0

# Verify control plane is healthy
istioctl version

# Upgrade public gateway
helm upgrade istio-ingress istio/gateway -n istio-ingress \
  -f values-ingress.yaml --version 1.24.0

# Upgrade internal gateway
helm upgrade istio-ingress-internal istio/gateway -n istio-ingress-internal \
  -f values-internal-gateway.yaml --version 1.24.0
```

You can even do canary upgrades on gateways by running two versions side by side temporarily.

## Monitoring Gateway Health

Check gateway status:

```bash
kubectl get pods -n istio-ingress
kubectl get svc -n istio-ingress
```

Verify the gateway is receiving configuration from istiod:

```bash
istioctl proxy-status | grep istio-ingress
```

Check the gateway's Envoy configuration:

```bash
istioctl proxy-config listener -n istio-ingress deploy/istio-ingress
istioctl proxy-config routes -n istio-ingress deploy/istio-ingress
```

## Wrapping Up

Separating gateway installation from the control plane is a best practice for any Istio deployment beyond development. It gives you the flexibility to scale, upgrade, and manage each component independently. Use the Istio gateway Helm chart for each gateway instance, put them in their own namespaces, and configure the Gateway selector to match the right deployment. The small extra setup effort pays off immediately in operational flexibility.
