# How to Configure Istio Ingress Gateway for High Availability

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Ingress Gateway, High Availability, Kubernetes, Load Balancing

Description: Step-by-step guide to configuring Istio ingress gateway for high availability with multi-zone deployment, auto-scaling, health checks, and graceful shutdown.

---

The Istio ingress gateway is the front door to your entire cluster. When it goes down, nothing gets in. No API calls, no web requests, nothing. Making it highly available is not something you should put off until after your first outage.

This guide covers every aspect of making the ingress gateway resilient: from basic replica scaling to multi-zone placement, graceful connection draining, and load balancer health checks.

## Baseline: Multiple Replicas

The absolute minimum for production is running more than one ingress gateway pod. Here is a starting configuration:

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
              cpu: 500m
              memory: 512Mi
            limits:
              cpu: 2000m
              memory: 1Gi
```

Three replicas mean you can lose one pod (node failure, upgrade, crash) and still have two healthy instances handling traffic.

## Multi-Zone Deployment

If your Kubernetes cluster spans multiple availability zones, spread the gateway pods across them. This protects against zone-level failures:

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
```

The `requiredDuringSchedulingIgnoredDuringExecution` with the zone topology key forces Kubernetes to place each gateway pod in a different zone. If you have 3 zones and 3 replicas, each zone gets one gateway pod.

If you have fewer zones than replicas (or want softer constraints), use `preferredDuringSchedulingIgnoredDuringExecution` instead:

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
                  - istio-ingressgateway
          topologyKey: topology.kubernetes.io/zone
      - weight: 50
        podAffinityTerm:
          labelSelector:
            matchExpressions:
              - key: app
                operator: In
                values:
                  - istio-ingressgateway
          topologyKey: kubernetes.io/hostname
```

This prefers different zones (weight 100) and different nodes within a zone (weight 50).

## Horizontal Pod Autoscaler

Fixed replica counts work until your traffic spikes. Configure an HPA to scale the gateway based on CPU or custom metrics:

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
  maxReplicas: 15
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
        - type: Pods
          value: 1
          periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
        - type: Pods
          value: 3
          periodSeconds: 60
```

The `behavior` section controls how fast the HPA scales up and down. Scaling up is fast (3 pods per minute) to handle traffic spikes. Scaling down is slow (1 pod per minute with a 5-minute stabilization window) to avoid flapping.

## Load Balancer Configuration

The LoadBalancer Service in front of the ingress gateway needs its own HA configuration. The specifics depend on your cloud provider.

### AWS (NLB)

```yaml
apiVersion: v1
kind: Service
metadata:
  name: istio-ingressgateway
  namespace: istio-system
  annotations:
    service.beta.kubernetes.io/aws-load-balancer-type: "nlb"
    service.beta.kubernetes.io/aws-load-balancer-cross-zone-load-balancing-enabled: "true"
    service.beta.kubernetes.io/aws-load-balancer-healthcheck-healthy-threshold: "2"
    service.beta.kubernetes.io/aws-load-balancer-healthcheck-unhealthy-threshold: "2"
    service.beta.kubernetes.io/aws-load-balancer-healthcheck-interval: "10"
    service.beta.kubernetes.io/aws-load-balancer-healthcheck-path: "/healthz/ready"
    service.beta.kubernetes.io/aws-load-balancer-healthcheck-port: "15021"
spec:
  type: LoadBalancer
  selector:
    app: istio-ingressgateway
  ports:
    - port: 80
      name: http2
      targetPort: 8080
    - port: 443
      name: https
      targetPort: 8443
    - port: 15021
      name: status-port
      targetPort: 15021
```

Cross-zone load balancing ensures traffic reaches healthy pods regardless of which zone the NLB endpoint is in. The health check on port 15021 uses Envoy's built-in health endpoint.

### GCP

```yaml
apiVersion: v1
kind: Service
metadata:
  name: istio-ingressgateway
  namespace: istio-system
  annotations:
    cloud.google.com/neg: '{"ingress": true}'
    cloud.google.com/backend-config: '{"default": "istio-gateway-backend"}'
spec:
  type: LoadBalancer
  selector:
    app: istio-ingressgateway
```

## Graceful Shutdown and Connection Draining

When a gateway pod terminates (during scaling, upgrades, or node drain), it needs time to finish handling in-flight requests. Without proper draining, clients see connection resets.

Configure the drain duration in the mesh config:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      terminationDrainDuration: 30s
```

Make sure the pod's termination grace period is longer than the drain duration:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  components:
    ingressGateways:
      - name: istio-ingressgateway
        k8s:
          podAnnotations:
            "sidecar.istio.io/terminationDrainDuration": "30s"
          overlays:
            - kind: Deployment
              name: istio-ingressgateway
              patches:
                - path: spec.template.spec.terminationGracePeriodSeconds
                  value: 60
```

The sequence during shutdown:
1. Kubernetes sends SIGTERM to the pod
2. The pod is removed from the Service's endpoint list
3. The load balancer stops sending new traffic (health check fails)
4. Envoy drains existing connections for 30 seconds
5. After 60 seconds (terminationGracePeriodSeconds), Kubernetes force-kills the pod

The gap between drain duration (30s) and grace period (60s) gives time for the load balancer health checks to detect the shutdown.

## Pod Disruption Budget

Prevent Kubernetes from evicting too many gateway pods at once:

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: istio-ingressgateway
  namespace: istio-system
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app: istio-ingressgateway
```

With `minAvailable: 2`, Kubernetes will not drain a node if doing so would leave fewer than 2 gateway pods running. This is critical during cluster upgrades where multiple nodes get drained.

## Rolling Update Strategy

Configure the deployment's rolling update strategy to avoid downtime:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  components:
    ingressGateways:
      - name: istio-ingressgateway
        k8s:
          strategy:
            rollingUpdate:
              maxSurge: 1
              maxUnavailable: 0
            type: RollingUpdate
```

`maxUnavailable: 0` ensures that during a rolling update, Kubernetes creates a new pod before terminating an old one. You always have at least the desired number of pods running.

## Health Checking from Outside

Do not just rely on Kubernetes internal health checks. Set up external monitoring to verify the gateway is reachable from the internet:

```bash
# Simple external health check
curl -s -o /dev/null -w "%{http_code}" https://your-domain.com/healthz/ready

# From your monitoring tool, check the status endpoint
curl -s http://<gateway-external-ip>:15021/healthz/ready
```

Set up uptime monitoring (through a tool like OneUptime) that checks the gateway from multiple geographic locations. This catches issues that internal health checks miss, like DNS problems or cloud load balancer misconfigurations.

## Multiple Gateway Deployments

For critical workloads, consider running separate gateway deployments for different traffic types:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  components:
    ingressGateways:
      - name: public-gateway
        enabled: true
        label:
          app: public-gateway
        k8s:
          replicaCount: 3
          service:
            type: LoadBalancer
      - name: internal-gateway
        enabled: true
        label:
          app: internal-gateway
        k8s:
          replicaCount: 2
          service:
            type: ClusterIP
            annotations:
              cloud.google.com/load-balancer-type: Internal
```

This separates public-facing traffic from internal traffic, so an issue with one does not affect the other.

## Verifying Your HA Setup

Test your HA configuration by simulating failures:

```bash
# Test pod failure
kubectl delete pod -l app=istio-ingressgateway -n istio-system

# Test during a rolling update
kubectl rollout restart deployment/istio-ingressgateway -n istio-system

# Monitor during testing
watch kubectl get pods -n istio-system -l app=istio-ingressgateway -o wide
```

During each test, send continuous traffic and verify that requests keep succeeding:

```bash
while true; do curl -s -o /dev/null -w "%{http_code}\n" https://your-domain.com/api/health; sleep 0.5; done
```

You should see continuous 200 responses even during pod deletions and rollouts.

## Summary

A highly available Istio ingress gateway requires multiple replicas spread across availability zones, an HPA for traffic spikes, proper load balancer health checks, graceful connection draining, Pod Disruption Budgets, and zero-downtime rolling updates. The configuration touches the IstioOperator, Service, HPA, and PDB resources. Test your setup by simulating failures before they happen for real. An ingress gateway that goes down in production is one of the worst outages to deal with because it affects every single service behind it.
