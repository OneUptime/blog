# Customizing Typha Scaling in Calico the Hard Way

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Typha, CNI, Networking, Customization, Scaling

Description: Go beyond the defaults and customize Typha for your specific environment - tuning resource requests, scheduling policies, custom replica counts, and node affinity rules to match your cluster topology.

---

## Introduction

A default Typha deployment works, but it does not account for the shape of your cluster: the number of nodes, availability zones, dedicated infrastructure node pools, or resource constraints of your control plane. Customizing Typha scheduling and resource allocation is the difference between a Typha deployment that merely runs and one that reliably serves Felix agents during node failures, upgrades, and traffic spikes.

This post covers node affinity, resource tuning, HorizontalPodAutoscaler configuration, and topology spread constraints for Typha in a manifest-based Calico installation.

---

## Prerequisites

- Typha deployed and configured per the earlier posts in this series
- At least 3 nodes available for Typha scheduling
- `kubectl` and `calicoctl` access
- Understanding of Kubernetes scheduling concepts (affinity, tolerations, topology spread)

---

## Step 1: Pin Typha to Dedicated Infrastructure Nodes

In clusters with dedicated infrastructure node pools (labeled `node-role=infra`), pinning Typha to those nodes isolates it from workload disruptions.

```yaml
# typha-deployment-infra.yaml
# Typha pinned to nodes labeled node-role=infra via node affinity
apiVersion: apps/v1
kind: Deployment
metadata:
  name: calico-typha
  namespace: kube-system
  labels:
    k8s-app: calico-typha
spec:
  replicas: 3
  selector:
    matchLabels:
      k8s-app: calico-typha
  template:
    metadata:
      labels:
        k8s-app: calico-typha
    spec:
      serviceAccountName: calico-typha
      # Allow Typha to run on infra nodes that may have taints
      tolerations:
        - key: node-role
          value: infra
          effect: NoSchedule
        - key: node-role.kubernetes.io/control-plane
          effect: NoSchedule
      affinity:
        # Prefer infra nodes, but fall back to any node if none are available
        nodeAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
            - weight: 100
              preference:
                matchExpressions:
                  - key: node-role
                    operator: In
                    values: ["infra"]
        # Hard requirement: no two Typha pods on the same host
        podAntiAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            - labelSelector:
                matchLabels:
                  k8s-app: calico-typha
              topologyKey: kubernetes.io/hostname
      containers:
        - name: calico-typha
          image: calico/typha:v3.27.0
          ports:
            - containerPort: 5473
              name: calico-typha
          env:
            - name: TYPHA_LOGFILEPATH
              value: "none"
            - name: TYPHA_LOGSEVERITYSCREEN
              value: "info"
            - name: TYPHA_PROMETHEUSMETRICSENABLED
              value: "true"
            - name: TYPHA_PROMETHEUSMETRICSPORT
              value: "9093"
            - name: TYPHA_HEALTHENABLED
              value: "true"
          livenessProbe:
            httpGet:
              path: /liveness
              port: 9098
              host: localhost
            initialDelaySeconds: 30
            periodSeconds: 30
          readinessProbe:
            httpGet:
              path: /readiness
              port: 9098
              host: localhost
            periodSeconds: 10
          resources:
            requests:
              cpu: 250m
              memory: 128Mi
            limits:
              cpu: 1000m
              memory: 512Mi
```

```bash
kubectl apply -f typha-deployment-infra.yaml
```

---

## Step 2: Spread Typha Across Availability Zones

For multi-zone clusters, use topology spread constraints to ensure Typha replicas are distributed across zones:

```yaml
# typha-deployment-multizone.yaml
# Topology spread constraints ensuring one Typha pod per availability zone
apiVersion: apps/v1
kind: Deployment
metadata:
  name: calico-typha
  namespace: kube-system
  labels:
    k8s-app: calico-typha
spec:
  replicas: 3
  selector:
    matchLabels:
      k8s-app: calico-typha
  template:
    metadata:
      labels:
        k8s-app: calico-typha
    spec:
      serviceAccountName: calico-typha
      # Spread evenly across zones; allow 1 pod skew maximum
      topologySpreadConstraints:
        - maxSkew: 1
          topologyKey: topology.kubernetes.io/zone
          whenUnsatisfiable: DoNotSchedule
          labelSelector:
            matchLabels:
              k8s-app: calico-typha
      # Within each zone, no two Typha pods on the same host
      affinity:
        podAntiAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            - labelSelector:
                matchLabels:
                  k8s-app: calico-typha
              topologyKey: kubernetes.io/hostname
      containers:
        - name: calico-typha
          image: calico/typha:v3.27.0
          ports:
            - containerPort: 5473
              name: calico-typha
          env:
            - name: TYPHA_LOGFILEPATH
              value: "none"
            - name: TYPHA_LOGSEVERITYSCREEN
              value: "info"
            - name: TYPHA_PROMETHEUSMETRICSENABLED
              value: "true"
            - name: TYPHA_PROMETHEUSMETRICSPORT
              value: "9093"
            - name: TYPHA_HEALTHENABLED
              value: "true"
          livenessProbe:
            httpGet:
              path: /liveness
              port: 9098
              host: localhost
            initialDelaySeconds: 30
            periodSeconds: 30
          readinessProbe:
            httpGet:
              path: /readiness
              port: 9098
              host: localhost
            periodSeconds: 10
          resources:
            requests:
              cpu: 250m
              memory: 128Mi
            limits:
              cpu: 1000m
              memory: 512Mi
```

```bash
kubectl apply -f typha-deployment-multizone.yaml
```

---

## Step 3: Add a PodDisruptionBudget

A `PodDisruptionBudget` prevents all Typha pods from being evicted at once during node drain operations:

```yaml
# typha-pdb.yaml
# Ensures at least 2 Typha pods remain available during voluntary disruptions
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: calico-typha-pdb
  namespace: kube-system
spec:
  # At least 2 Typha pods must be available; for 3 replicas this means
  # only 1 can be evicted at a time during a rolling drain
  minAvailable: 2
  selector:
    matchLabels:
      k8s-app: calico-typha
```

```bash
kubectl apply -f typha-pdb.yaml
```

---

## Step 4: Tune Resource Requests for Your Node Size

Resource sizing depends on cluster size. This table provides starting points:

| Cluster Size | Typha Replicas | CPU Request | Memory Request |
|---|---|---|---|
| 50–100 nodes | 2 | 250m | 128Mi |
| 100–250 nodes | 3 | 500m | 256Mi |
| 250–500 nodes | 5 | 500m | 512Mi |
| 500+ nodes | 7+ | 1000m | 512Mi |

Update resource requests in the Deployment:

```bash
# Patch the Typha Deployment resource requests inline
kubectl set resources deployment calico-typha \
  --namespace kube-system \
  --requests=cpu=500m,memory=256Mi \
  --limits=cpu=1000m,memory=512Mi
```

---

## Best Practices

- Use `requiredDuringSchedulingIgnoredDuringExecution` pod anti-affinity by hostname to guarantee replica isolation, not just `preferred`.
- Combine topology spread constraints with pod anti-affinity for multi-zone clusters - spread constraints ensure zone balance while anti-affinity ensures host-level isolation within each zone.
- Set `minAvailable` in PodDisruptionBudget to `replicas - 1` so you can always drain one node at a time.
- Size memory limits generously; Typha caches all watched resource types in memory, and the cache grows with cluster size.
- Label infra nodes consistently and use tolerations plus node affinity together to reliably pin Typha to those nodes.

---

## Conclusion

Customizing Typha scheduling and resource allocation turns a basic deployment into one that is resilient to zone failures, node drains, and unexpected load spikes. Combined with the configuration and scaling posts in this series, you have full control over how Typha behaves in your environment.

---

*Get alerted when Typha pod counts drop below threshold using [OneUptime](https://oneuptime.com).*
