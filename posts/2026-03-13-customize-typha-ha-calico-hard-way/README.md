# Customizing Typha High Availability in Calico the Hard Way

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Typha, Kubernetes, Networking, High Availability, Customization, Hard Way

Description: Go beyond basic HA and customize Typha for zone-aware failover, disruption budget protection, and topology-aware connection routing in a manifest-based Calico installation.

---

## Introduction

Running two Typha replicas is the minimum for high availability, but it is not sufficient for a cluster that spans multiple availability zones or one where node drains frequently occur. True HA means Typha survives a zone failure, handles rolling node drains without dropping Felix connections, and recovers automatically when a replica crashes without requiring manual intervention.

This post covers the advanced HA configurations that the Calico Operator handles automatically but that you must configure explicitly when running Calico "the hard way."

---

## Prerequisites

- Typha deployed with at least 2 replicas per the setup post
- A Kubernetes cluster spanning at least 2 availability zones
- `kubectl` and `calicoctl` access
- Nodes labeled with `topology.kubernetes.io/zone`

---

## Step 1: Ensure Zone-Level Redundancy with Topology Spread Constraints

Pod anti-affinity by hostname guarantees no two Typha pods land on the same node, but it does not prevent all replicas from landing in the same zone. Topology spread constraints solve this:

```yaml
# typha-deployment-ha.yaml

# Typha Deployment with zone-level redundancy enforced by topology spread constraints
apiVersion: apps/v1
kind: Deployment
metadata:
  name: calico-typha
  namespace: kube-system
  labels:
    k8s-app: calico-typha
spec:
  # Use 3 replicas for a 3-zone cluster (1 per zone minimum)
  replicas: 3
  selector:
    matchLabels:
      k8s-app: calico-typha
  template:
    metadata:
      labels:
        k8s-app: calico-typha
      annotations:
        # Prevent the cluster autoscaler from evicting Typha pods
        cluster-autoscaler.kubernetes.io/safe-to-evict: "false"
    spec:
      serviceAccountName: calico-typha
      hostNetwork: true
      priorityClassName: system-cluster-critical
      # Prevent all Typha pods from landing in the same zone
      topologySpreadConstraints:
        - maxSkew: 1
          topologyKey: topology.kubernetes.io/zone
          whenUnsatisfiable: DoNotSchedule
          labelSelector:
            matchLabels:
              k8s-app: calico-typha
      # Within each zone, no two Typha pods on the same node
      affinity:
        podAntiAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            - labelSelector:
                matchLabels:
                  k8s-app: calico-typha
              topologyKey: kubernetes.io/hostname
      tolerations:
        # Mark the pod as a critical add-on for rescheduling
        - key: CriticalAddonsOnly
          operator: Exists
        # Allow Typha to run on control-plane nodes for better isolation
        - key: node-role.kubernetes.io/control-plane
          operator: Exists
          effect: NoSchedule
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
            - name: TYPHA_LOGSEVERITYSYS
              value: "none"
            - name: TYPHA_CONNECTIONREBALANCINGMODE
              value: "kubernetes"
            - name: TYPHA_DATASTORETYPE
              value: "kubernetes"
            - name: TYPHA_PROMETHEUSMETRICSENABLED
              value: "true"
            - name: TYPHA_PROMETHEUSMETRICSPORT
              value: "9093"
            - name: TYPHA_HEALTHENABLED
              value: "true"
            - name: TYPHA_CAFILE
              value: /calico-typha-ca/typhaca.crt
            - name: TYPHA_CLIENTCN
              value: calico-node
            - name: TYPHA_SERVERCERTFILE
              value: /calico-typha-certs/typha.crt
            - name: TYPHA_SERVERKEYFILE
              value: /calico-typha-certs/typha.key
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
          volumeMounts:
            - name: calico-typha-ca
              mountPath: "/calico-typha-ca"
              readOnly: true
            - name: calico-typha-certs
              mountPath: "/calico-typha-certs"
              readOnly: true
      volumes:
        - name: calico-typha-ca
          configMap:
            name: calico-typha-ca
        - name: calico-typha-certs
          secret:
            secretName: calico-typha-certs
```

```bash
kubectl apply -f typha-deployment-ha.yaml
```

---

## Step 2: Configure a PodDisruptionBudget That Matches Your Zone Count

For a 3-zone cluster with 3 Typha replicas, at most 1 replica should ever be unavailable at a time:

```yaml
# typha-pdb-ha.yaml
# PodDisruptionBudget ensuring at least 2 of 3 Typha replicas are always available
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: calico-typha-pdb
  namespace: kube-system
spec:
  # For N replicas, set minAvailable to N-1 so one node can always be drained
  minAvailable: 2
  selector:
    matchLabels:
      k8s-app: calico-typha
```

```bash
kubectl apply -f typha-pdb-ha.yaml
```

---

## Step 3: Enable Topology-Aware Routing for the Typha Service

With topology-aware routing, Felix agents can preferentially connect to a Typha pod in the same zone, reducing cross-zone bandwidth when Kubernetes can assign topology hints. Kubernetes falls back to cluster-wide routing when it cannot safely allocate hints, and the feature works best with at least 3 endpoints per zone:

```yaml
# typha-service-topology.yaml
# Typha Service with topology-aware endpoint routing
apiVersion: v1
kind: Service
metadata:
  name: calico-typha
  namespace: kube-system
  labels:
    k8s-app: calico-typha
  annotations:
    # Enable topology-aware routing
    service.kubernetes.io/topology-mode: "Auto"
spec:
  selector:
    k8s-app: calico-typha
  ports:
    - name: calico-typha
      port: 5473
      protocol: TCP
      targetPort: calico-typha
    - name: typha-metrics
      port: 9093
      protocol: TCP
      targetPort: 9093
```

```bash
kubectl apply -f typha-service-topology.yaml
```

---

## Step 4: Verify HA Distribution

After applying these configurations, confirm the desired distribution:

```bash
# Verify Typha pods are spread across different zones
kubectl get pods -n kube-system -l k8s-app=calico-typha -o wide \
  | awk 'NR>1 {print $7}' | while read node; do
  zone=$(kubectl get node "$node" \
    -o jsonpath='{.metadata.labels.topology\.kubernetes\.io/zone}' 2>/dev/null)
  echo "$node -> zone: $zone"
done

# Confirm no two pods are on the same node
kubectl get pods -n kube-system -l k8s-app=calico-typha \
  -o jsonpath='{range .items[*]}{.spec.nodeName}{"\n"}{end}' | sort | uniq -d
# Expected: empty (no duplicates)
```

---

## Best Practices

- Match the Typha replica count to the number of availability zones so each zone has exactly one Typha pod; this gives the clearest HA boundary.
- Use `whenUnsatisfiable: DoNotSchedule` in topology spread constraints for production and `ScheduleAnyway` for development to allow deployment on single-zone clusters.
- Set `cluster-autoscaler.kubernetes.io/safe-to-evict: "false"` to prevent the cluster autoscaler from evicting Typha pods during scale-down events.
- Review the PDB after every replica count change - `minAvailable: 2` is appropriate for 3 replicas but too restrictive for 2 replicas (it would prevent any pod from being evicted).
- Monitor `kube_pod_info{namespace="kube-system",pod=~"calico-typha.*"}` grouped by node and zone in Prometheus to detect HA distribution drift over time.

---

## Conclusion

True Typha high availability requires zone-aware scheduling, a PodDisruptionBudget tuned to your replica count, and topology-aware service routing. These configurations together help ensure that a single zone failure does not take down your Typha cluster and that rolling node drains maintain enough Typha capacity while replacement pods are scheduled.

---

*Monitor Typha zone distribution and get alerted on HA configuration drift with [OneUptime](https://oneuptime.com).*
