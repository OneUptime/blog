# How to Follow Istio Deployment Best Practices

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Deployments, Best Practices, Kubernetes, Production

Description: Essential best practices for deploying Istio in production, covering installation, upgrades, resource management, and operational readiness.

---

Deploying Istio in production is not the same as following the quickstart guide. The quickstart gets you a working mesh in five minutes, but it leaves out all the things that matter when real traffic is flowing through it. Resource limits, upgrade strategies, high availability, monitoring the control plane - these are the things that determine whether your Istio deployment is solid or fragile.

Here are the deployment best practices that teams running Istio in production have learned the hard way.

## Use Revision-Based Installation

Never use the default installation for production. Use revision-based (canary) installs so you can run multiple versions of the control plane side by side:

```bash
istioctl install --set revision=1-24-0 --set profile=default
```

This creates a control plane labeled with the revision. Namespaces opt in to a specific revision:

```bash
kubectl label namespace production istio.io/rev=1-24-0
```

When you upgrade, install the new revision alongside the old one:

```bash
istioctl install --set revision=1-24-1 --set profile=default
```

Then migrate namespaces one at a time:

```bash
kubectl label namespace production istio.io/rev=1-24-1 --overwrite
kubectl rollout restart deployment -n production
```

If something goes wrong, roll back by relabeling:

```bash
kubectl label namespace production istio.io/rev=1-24-0 --overwrite
kubectl rollout restart deployment -n production
```

## Configure Control Plane High Availability

Run multiple replicas of istiod:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  components:
    pilot:
      k8s:
        replicaCount: 3
        affinity:
          podAntiAffinity:
            preferredDuringSchedulingIgnoredDuringExecution:
              - weight: 100
                podAffinityTerm:
                  labelSelector:
                    matchExpressions:
                      - key: app
                        operator: In
                        values:
                          - istiod
                  topologyKey: kubernetes.io/hostname
        resources:
          requests:
            cpu: 500m
            memory: 2Gi
          limits:
            cpu: "2"
            memory: 4Gi
```

The pod anti-affinity spreads istiod replicas across different nodes. If one node goes down, the control plane stays up.

## Set Proper Sidecar Resources

The default sidecar resource requests and limits are too low for most production workloads. Set them based on your actual traffic patterns:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  values:
    global:
      proxy:
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
          limits:
            cpu: "1"
            memory: 512Mi
```

For high-traffic services, override at the pod level:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: high-traffic-service
spec:
  template:
    metadata:
      annotations:
        sidecar.istio.io/proxyCPU: "500m"
        sidecar.istio.io/proxyMemory: "256Mi"
        sidecar.istio.io/proxyCPULimit: "2"
        sidecar.istio.io/proxyMemoryLimit: "1Gi"
```

## Enable Protocol Selection

Istio needs to know the protocol of each port to apply the right filters. Explicitly name your ports:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-service
spec:
  ports:
    - name: http-web
      port: 8080
      targetPort: 8080
    - name: grpc-api
      port: 9090
      targetPort: 9090
    - name: tcp-data
      port: 3306
      targetPort: 3306
```

The naming convention is `<protocol>-<suffix>`. Supported protocols include `http`, `http2`, `https`, `grpc`, `grpc-web`, `tcp`, `tls`, and `mongo`.

Without proper naming, Istio treats the port as opaque TCP and you lose all HTTP-level features like retries, routing, and metrics.

## Configure Sidecar Resources to Limit Config Size

By default, every sidecar receives the configuration for every service in the mesh. In a large mesh with thousands of services, this wastes memory. Use the Sidecar resource to limit what each workload knows about:

```yaml
apiVersion: networking.istio.io/v1
kind: Sidecar
metadata:
  name: default
  namespace: production
spec:
  egress:
    - hosts:
        - "./*"
        - "istio-system/*"
        - "shared-services/*"
```

This tells sidecars in the `production` namespace to only load configuration for services in their own namespace, `istio-system`, and `shared-services`. This can dramatically reduce memory usage.

## Set Up Proper Monitoring

Monitor the Istio control plane itself:

```bash
# Key istiod metrics to alert on
# pilot_xds_pushes - configuration pushes to proxies
# pilot_proxy_convergence_time - how long it takes proxies to get new config
# pilot_conflict_inbound_listener - listener conflicts (indicates misconfiguration)
# pilot_total_xds_rejects - proxies rejecting config (something is wrong)
```

Create a PrometheusRule or Grafana alert for these:

```yaml
# Alert if config push latency is high
- alert: IstioPilotPushLatencyHigh
  expr: histogram_quantile(0.99, rate(pilot_proxy_convergence_time_bucket[5m])) > 5
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "Istio control plane push latency is above 5 seconds"
```

## Use PeerAuthentication for mTLS

Set a mesh-wide strict mTLS policy:

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

For namespaces that need to communicate with non-mesh services, set PERMISSIVE at the namespace level:

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: default
  namespace: legacy-services
spec:
  mtls:
    mode: PERMISSIVE
```

## Configure Proper Drain Duration

When pods are terminated, the sidecar needs time to drain active connections:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      drainDuration: 45s
      terminationDrainDuration: 30s
```

Make sure your Kubernetes `terminationGracePeriodSeconds` is longer than the drain duration:

```yaml
apiVersion: apps/v1
kind: Deployment
spec:
  template:
    spec:
      terminationGracePeriodSeconds: 60
```

## Manage Certificate Lifetimes

Istio's default certificate lifetime is 24 hours with automatic rotation. In most cases this is fine, but you can customize it:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      proxyMetadata:
        SECRET_TTL: "12h"
```

## Use Horizontal Pod Autoscaling for Ingress Gateways

The ingress gateway handles all incoming traffic. It should scale with load:

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: istio-ingressgateway
  namespace: istio-system
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: istio-ingressgateway
  minReplicas: 3
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
```

## Pre-Flight Checks Before Production

Before going live, run these checks:

```bash
# Analyze the mesh for issues
istioctl analyze --all-namespaces

# Check proxy sync status
istioctl proxy-status

# Verify mTLS is working
istioctl authn tls-check deploy/my-service -n production

# Check for port naming issues
istioctl analyze -n production 2>&1 | grep "port-name"
```

Fix every warning from `istioctl analyze` before production deployment. Warnings today become outages tomorrow.

These practices are not optional for production. Each one addresses a failure mode that has caused real outages in real production meshes. Invest the time upfront and your Istio deployment will be solid.
