# How to Configure Anti-Affinity Rules for Istio Components

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Anti-Affinity, Kubernetes, Scheduling, High Availability

Description: A practical guide to configuring pod anti-affinity rules for Istio control plane and data plane components to spread pods across nodes and availability zones.

---

Anti-affinity rules tell Kubernetes to spread pods across different nodes or availability zones. Without them, the scheduler might place all your istiod replicas on the same node. If that node goes down, you lose the entire control plane. Same thing with the ingress gateway: all pods on one node means one node failure kills your entire external traffic path.

This guide covers how to configure anti-affinity for every Istio component and the trade-offs between hard and soft anti-affinity rules.

## Hard vs Soft Anti-Affinity

Kubernetes supports two types of anti-affinity:

**Hard anti-affinity** (`requiredDuringSchedulingIgnoredDuringExecution`): The scheduler will not place a pod on a node that already has a matching pod. If no valid node is available, the pod stays in Pending state.

**Soft anti-affinity** (`preferredDuringSchedulingIgnoredDuringExecution`): The scheduler tries to avoid placing a pod on a node with a matching pod, but will do so if no other option is available. Pods always get scheduled.

The choice matters. Hard anti-affinity gives you a guarantee that pods are spread out, but it can prevent scheduling in small clusters. Soft anti-affinity is more flexible but does not guarantee separation.

## Anti-Affinity for istiod

istiod is the most critical component. Spread its replicas across both nodes and availability zones:

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
                  topologyKey: topology.kubernetes.io/zone
              - weight: 80
                podAffinityTerm:
                  labelSelector:
                    matchExpressions:
                      - key: app
                        operator: In
                        values:
                          - istiod
                  topologyKey: kubernetes.io/hostname
```

This configuration does two things:
1. With weight 100, it strongly prefers placing istiod pods in different availability zones
2. With weight 80, it also prefers placing them on different nodes within a zone

Using `preferredDuringScheduling` instead of `requiredDuringScheduling` means istiod will still get scheduled even if you have fewer zones than replicas.

For clusters with 3+ availability zones and 3 istiod replicas, you can use hard anti-affinity for zone spreading:

```yaml
affinity:
  podAntiAffinity:
    requiredDuringSchedulingIgnoredDuringExecution:
      - labelSelector:
          matchExpressions:
            - key: app
              operator: In
              values:
                - istiod
        topologyKey: topology.kubernetes.io/zone
```

This guarantees each istiod replica runs in a different zone. If a zone goes down, two istiod instances remain.

## Anti-Affinity for Ingress Gateway

The ingress gateway needs the same treatment. Losing all gateway pods means losing all external traffic:

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
              preferredDuringSchedulingIgnoredDuringExecution:
                - weight: 100
                  podAffinityTerm:
                    labelSelector:
                      matchExpressions:
                        - key: app
                          operator: In
                          values:
                            - istio-ingressgateway
                    topologyKey: kubernetes.io/hostname
```

This uses hard anti-affinity for zone spreading (each gateway pod must be in a different zone) and soft anti-affinity for node spreading (prefer different nodes within a zone).

## Anti-Affinity for Egress Gateway

If you use an egress gateway:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  components:
    egressGateways:
      - name: istio-egressgateway
        enabled: true
        k8s:
          replicaCount: 2
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
                            - istio-egressgateway
                    topologyKey: topology.kubernetes.io/zone
                - weight: 80
                  podAffinityTerm:
                    labelSelector:
                      matchExpressions:
                        - key: app
                          operator: In
                          values:
                            - istio-egressgateway
                    topologyKey: kubernetes.io/hostname
```

## Anti-Affinity for Application Services

Your meshed application services should also have anti-affinity rules. Here is a template for a service that needs high availability:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: payment-service
spec:
  replicas: 3
  template:
    metadata:
      labels:
        app: payment-service
    spec:
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
                        - payment-service
                topologyKey: topology.kubernetes.io/zone
            - weight: 50
              podAffinityTerm:
                labelSelector:
                  matchExpressions:
                    - key: app
                      operator: In
                      values:
                        - payment-service
                topologyKey: kubernetes.io/hostname
      containers:
        - name: payment-service
          image: payment-service:latest
```

## Keeping Istio Components Away from Application Workloads

In some environments, you want Istio control plane components on dedicated nodes, separate from application workloads. Use node affinity combined with taints and tolerations:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  components:
    pilot:
      k8s:
        affinity:
          nodeAffinity:
            requiredDuringSchedulingIgnoredDuringExecution:
              nodeSelectorTerms:
                - matchExpressions:
                    - key: node-role
                      operator: In
                      values:
                        - istio-control-plane
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
        tolerations:
          - key: dedicated
            operator: Equal
            value: istio-control-plane
            effect: NoSchedule
```

Label and taint your dedicated nodes:

```bash
kubectl label node node-1 node-role=istio-control-plane
kubectl label node node-2 node-role=istio-control-plane
kubectl label node node-3 node-role=istio-control-plane

kubectl taint node node-1 dedicated=istio-control-plane:NoSchedule
kubectl taint node node-2 dedicated=istio-control-plane:NoSchedule
kubectl taint node node-3 dedicated=istio-control-plane:NoSchedule
```

This ensures istiod only runs on dedicated nodes and those nodes only run Istio components.

## Topology Spread Constraints as an Alternative

Kubernetes topology spread constraints offer more control than anti-affinity for even distribution:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  components:
    pilot:
      k8s:
        replicaCount: 3
        overlays:
          - kind: Deployment
            name: istiod
            patches:
              - path: spec.template.spec.topologySpreadConstraints
                value:
                  - maxSkew: 1
                    topologyKey: topology.kubernetes.io/zone
                    whenUnsatisfiable: DoNotSchedule
                    labelSelector:
                      matchLabels:
                        app: istiod
                  - maxSkew: 1
                    topologyKey: kubernetes.io/hostname
                    whenUnsatisfiable: ScheduleAnyway
                    labelSelector:
                      matchLabels:
                        app: istiod
```

`maxSkew: 1` means the difference in pod count between any two zones (or nodes) should be at most 1. This gives you more even distribution than anti-affinity, which only prevents co-location but does not guarantee even spread.

For example, with 6 replicas across 3 zones:
- Anti-affinity: could put 4 in zone-a, 1 in zone-b, 1 in zone-c
- Topology spread with maxSkew 1: puts 2 in each zone

## Verifying Anti-Affinity Rules

After configuring anti-affinity, verify that pods are actually spread out:

```bash
# Check which nodes istiod pods run on
kubectl get pods -n istio-system -l app=istiod -o wide

# Check which zones they are in
kubectl get pods -n istio-system -l app=istiod -o custom-columns="NAME:.metadata.name,NODE:.spec.nodeName,ZONE:.metadata.labels.topology\.kubernetes\.io/zone"
```

If pods are co-located despite anti-affinity rules, check:

```bash
# Are there enough nodes in different zones?
kubectl get nodes -L topology.kubernetes.io/zone

# Are there scheduling conflicts?
kubectl describe pod <pending-pod-name> | grep -A 10 "Events"
```

## Common Issues

**Anti-affinity with HPA**: When an HPA scales up, new pods must respect anti-affinity rules. If all zones already have pods and you have hard anti-affinity, new pods cannot be scheduled. Use soft anti-affinity for HPA-managed deployments or make sure you have more zones/nodes than the HPA's maxReplicas.

**Anti-affinity during upgrades**: During rolling updates, there are temporarily more pods than the replica count (due to maxSurge). Hard anti-affinity can prevent the surge pods from scheduling. Either use soft anti-affinity or ensure enough nodes/zones are available.

**Single-zone clusters**: Hard zone-level anti-affinity does not work in single-zone clusters (all pods would be pending). Use node-level anti-affinity instead.

## Summary

Anti-affinity rules are essential for running Istio in production. At minimum, configure zone-level anti-affinity for istiod and the ingress gateway. Use soft anti-affinity when you need flexibility (HPA scaling, small clusters) and hard anti-affinity when you need guarantees (critical components with enough nodes). Consider topology spread constraints for more even distribution. Verify your anti-affinity rules are working by checking pod placement after deployment, and test that new pods can still be scheduled during scaling events and upgrades.
