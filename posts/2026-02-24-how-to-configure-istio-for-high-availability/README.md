# How to Configure Istio for High Availability

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, High Availability, Kubernetes, Reliability, Service Mesh

Description: A complete guide to configuring Istio for high availability covering control plane redundancy, ingress gateway scaling, certificate management, and failure handling.

---

Running Istio in production means making sure it stays up even when things go wrong. A service mesh that is not highly available can become the single point of failure for your entire application. When istiod goes down or the ingress gateway becomes unreachable, your services lose their ability to route traffic, manage certificates, and enforce policies.

This guide covers the concrete configuration needed to make every Istio component highly available.

## Control Plane High Availability

The most critical component is istiod. It handles configuration distribution, certificate issuance, and service discovery. If istiod is unavailable, existing sidecars continue to work with their last-known configuration, but new pods cannot get their initial configuration and certificate rotation stops.

Run multiple istiod replicas with anti-affinity to spread them across nodes:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  components:
    pilot:
      k8s:
        replicaCount: 3
        resources:
          requests:
            cpu: 1000m
            memory: 2Gi
          limits:
            memory: 4Gi
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
```

This deploys 3 istiod replicas and tries to schedule them on different nodes. If a node goes down, you lose at most one istiod replica.

For clusters spanning multiple availability zones, use topology-aware scheduling:

```yaml
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
          topologyKey: topology.kubernetes.io/zone
```

## Ingress Gateway High Availability

The ingress gateway is the entry point for all external traffic. If it goes down, nothing can reach your services. Run multiple replicas across availability zones:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  components:
    ingressGateways:
      - name: istio-ingressgateway
        enabled: true
        k8s:
          replicaCount: 3
          resources:
            requests:
              cpu: 1000m
              memory: 1Gi
            limits:
              memory: 2Gi
          hpaSpec:
            minReplicas: 3
            maxReplicas: 10
            metrics:
              - type: Resource
                resource:
                  name: cpu
                  target:
                    type: Utilization
                    averageUtilization: 70
          affinity:
            podAntiAffinity:
              requiredDuringSchedulingIgnoredDuringExecution:
                - labelSelector:
                    matchExpressions:
                      - key: app
                        operator: In
                        values:
                          - istio-ingressgateway
                  topologyKey: topology.kubernetes.io/zone
          strategy:
            rollingUpdate:
              maxSurge: 1
              maxUnavailable: 0
```

Key points:
- **minReplicas: 3** ensures there are always at least 3 gateway pods
- **requiredDuringSchedulingIgnoredDuringExecution** with zone topology ensures pods are spread across AZs (hard requirement)
- **maxUnavailable: 0** during rolling updates means no downtime during upgrades

The LoadBalancer service fronting the gateway should be configured for health checking:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: istio-ingressgateway
  namespace: istio-system
  annotations:
    service.beta.kubernetes.io/aws-load-balancer-healthcheck-healthy-threshold: "2"
    service.beta.kubernetes.io/aws-load-balancer-healthcheck-unhealthy-threshold: "3"
    service.beta.kubernetes.io/aws-load-balancer-healthcheck-interval: "10"
    service.beta.kubernetes.io/aws-load-balancer-cross-zone-load-balancing-enabled: "true"
spec:
  type: LoadBalancer
  selector:
    app: istio-ingressgateway
  ports:
    - port: 80
      name: http2
    - port: 443
      name: https
```

## Certificate Management HA

If istiod goes down, existing certificates continue to work until they expire. By default, Istio certificates have a 24-hour TTL. If istiod is down for more than 24 hours, certificates start expiring and mTLS breaks.

To handle this, increase the certificate TTL as a buffer:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      proxyMetadata:
        SECRET_TTL: "48h"
```

For even better resilience, use an external CA like cert-manager with Vault:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  values:
    pilot:
      env:
        EXTERNAL_CA: ISTIOD_RA_KUBERNETES_API
```

With an external CA, certificate issuance is not dependent solely on istiod. Even if istiod has issues, the external CA infrastructure can continue issuing certificates.

## Pod Disruption Budgets

PDBs prevent Kubernetes from evicting too many pods at once during voluntary disruptions (node drains, cluster upgrades):

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: istiod-pdb
  namespace: istio-system
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app: istiod
---
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: ingressgateway-pdb
  namespace: istio-system
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app: istio-ingressgateway
```

With these PDBs, Kubernetes will never drain a node if it would leave fewer than 2 istiod or 2 ingress gateway pods running.

## Sidecar Resilience

What happens when the sidecar proxy crashes in a pod? By default, if the Envoy sidecar crashes, the pod loses all network connectivity because iptables rules are still redirecting traffic to the now-dead proxy.

Configure automatic sidecar restarts and holdApplicationUntilProxyStarts to ensure proper startup ordering:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      holdApplicationUntilProxyStarts: true
      proxyMetadata:
        EXIT_ON_ZERO_ACTIVE_CONNECTIONS: "true"
```

The `holdApplicationUntilProxyStarts` setting prevents your application from starting until the Envoy proxy is ready. This avoids race conditions where the app tries to make requests before the proxy is up.

## Graceful Shutdown

During pod termination, make sure the sidecar drains connections properly:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      terminationDrainDuration: 30s
```

This gives Envoy 30 seconds to finish handling in-flight requests before shutting down. Also make sure your pod's `terminationGracePeriodSeconds` is longer than the drain duration:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  template:
    spec:
      terminationGracePeriodSeconds: 60
      containers:
        - name: my-app
          image: my-app:latest
```

## Health Checking

Configure proper health checks for both the application and the sidecar:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  template:
    spec:
      containers:
        - name: my-app
          image: my-app:latest
          readinessProbe:
            httpGet:
              path: /healthz
              port: 8080
            initialDelaySeconds: 5
            periodSeconds: 10
          livenessProbe:
            httpGet:
              path: /healthz
              port: 8080
            initialDelaySeconds: 15
            periodSeconds: 20
```

Istio automatically configures health checks for the sidecar proxy. The Envoy readiness probe checks that the proxy has received its initial configuration and is ready to handle traffic.

## Monitoring for HA

Monitor these signals to detect availability issues early:

```bash
# Control plane readiness
kubectl get pods -n istio-system -l app=istiod -o wide

# Check if any sidecars are disconnected from the control plane
istioctl proxy-status | grep -v SYNCED

# Check certificate expiration across the mesh
istioctl proxy-config secret deploy/my-app -o json | jq '.dynamicActiveSecrets[0].secret.tlsCertificate.certificateChain.inlineBytes' | base64 -d | openssl x509 -noout -dates
```

Set up Prometheus alerts for:

```yaml
groups:
  - name: istio-ha
    rules:
      - alert: IstiodDown
        expr: absent(up{job="istiod"} == 1)
        for: 2m
        labels:
          severity: critical
      - alert: IngressGatewayDown
        expr: kube_deployment_status_replicas_available{deployment="istio-ingressgateway"} < 2
        for: 1m
        labels:
          severity: critical
      - alert: SidecarDisconnected
        expr: sum(pilot_xds_push_errors) > 0
        for: 5m
        labels:
          severity: warning
```

## Testing Your HA Setup

Verify that your HA configuration actually works by simulating failures:

```bash
# Simulate istiod failure
kubectl scale deployment istiod -n istio-system --replicas=1
kubectl delete pod -l app=istiod -n istio-system
# Verify services still work while istiod is recovering

# Simulate node failure
kubectl drain <node-name> --ignore-daemonsets --delete-emptydir-data
# Verify gateway and services remain available

# Simulate AZ failure (if multi-AZ)
# Cordon all nodes in one AZ and verify the system remains operational
```

## Summary

Making Istio highly available requires attention to every component: multiple istiod replicas with anti-affinity across zones, scaled and zone-spread ingress gateways, Pod Disruption Budgets to prevent cascading evictions, proper drain configurations for graceful shutdown, and monitoring to detect issues early. The good news is that Istio's design handles many failure scenarios gracefully. Existing sidecars continue to work with cached configuration even when the control plane is temporarily unavailable. Your job is to make sure "temporarily" does not become "permanently."
