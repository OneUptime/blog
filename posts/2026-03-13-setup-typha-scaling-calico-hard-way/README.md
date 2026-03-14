# Setting Up Typha Scaling in Calico the Hard Way

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Typha, CNI, Networking, Scaling, Deployments

Description: Deploy Calico Typha manually without the Calico Operator, configuring the Deployment, Service, and RBAC resources step by step.

---

## Introduction

The Calico Operator automates Typha deployment, but many teams run Calico in manifest mode for greater control over the installation. Setting up Typha "the hard way" means creating every resource yourself - the `ServiceAccount`, `ClusterRole`, `Deployment`, and `Service` - and then telling Felix where to find it.

This post walks through each step required to get Typha running and connected to Felix in a manifest-based Calico installation.

---

## Prerequisites

- Calico installed in manifest mode (not via the Calico Operator)
- `kubectl` access with cluster-admin privileges
- `calicoctl` v3.x CLI installed and configured
- Calico version 3.20 or later
- At least 50 worker nodes (Typha is most beneficial at this scale)

---

## Step 1: Create the Typha ServiceAccount

Typha needs its own identity to authenticate with the Kubernetes API server.

```yaml
# typha-serviceaccount.yaml
# ServiceAccount used by Typha to authenticate with the Kubernetes API server
apiVersion: v1
kind: ServiceAccount
metadata:
  name: calico-typha
  namespace: kube-system
```

```bash
kubectl apply -f typha-serviceaccount.yaml
```

---

## Step 2: Create the Typha ClusterRole and Binding

Typha watches many Calico and Kubernetes resource types on behalf of Felix agents.

```yaml
# typha-rbac.yaml
# ClusterRole granting Typha read access to resources it needs to watch
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: calico-typha
rules:
  # Typha watches Kubernetes Nodes to track topology
  - apiGroups: [""]
    resources: ["nodes", "namespaces", "pods", "serviceaccounts", "endpoints", "services"]
    verbs: ["watch", "list", "get"]
  # Typha watches Calico resources via the aggregated API
  - apiGroups: ["crd.projectcalico.org"]
    resources:
      - bgpconfigurations
      - bgppeers
      - blockaffinities
      - clusterinformations
      - felixconfigurations
      - globalnetworkpolicies
      - globalnetworksets
      - hostendpoints
      - ipamblocks
      - ippools
      - ipamconfigs
      - networkpolicies
      - networksets
      - nodes
    verbs: ["watch", "list", "get"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: calico-typha
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: calico-typha
subjects:
  - kind: ServiceAccount
    name: calico-typha
    namespace: kube-system
```

```bash
kubectl apply -f typha-rbac.yaml
```

---

## Step 3: Deploy Typha

This Deployment runs two Typha replicas spread across different nodes. Anti-affinity rules ensure the replicas do not land on the same node.

```yaml
# typha-deployment.yaml
# Typha Deployment with two replicas for basic high availability
apiVersion: apps/v1
kind: Deployment
metadata:
  name: calico-typha
  namespace: kube-system
  labels:
    k8s-app: calico-typha
spec:
  # Start with 2 replicas; scale based on node count (see scaling posts)
  replicas: 2
  selector:
    matchLabels:
      k8s-app: calico-typha
  template:
    metadata:
      labels:
        k8s-app: calico-typha
      annotations:
        # Prevent the kube-scheduler from accounting for Typha's own
        # network policy enforcement latency during scheduling
        cluster-autoscaler.kubernetes.io/safe-to-evict: "false"
    spec:
      # Use the dedicated Typha service account
      serviceAccountName: calico-typha
      # Tolerate master/control-plane taints so Typha can run on control nodes
      tolerations:
        - key: node-role.kubernetes.io/control-plane
          effect: NoSchedule
      # Spread Typha replicas across nodes to avoid co-location
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
            # Typha listens on this port for Felix connections
            - containerPort: 5473
              name: calico-typha
              protocol: TCP
          env:
            # Disable file logging; use stdout for container log collection
            - name: TYPHA_LOGFILEPATH
              value: "none"
            # Set log level (info is appropriate for production)
            - name: TYPHA_LOGSEVERITYSCREEN
              value: "info"
            # Prometheus metrics endpoint on port 9093
            - name: TYPHA_PROMETHEUSMETRICSENABLED
              value: "true"
            - name: TYPHA_PROMETHEUSMETRICSPORT
              value: "9093"
          livenessProbe:
            httpGet:
              path: /liveness
              port: 9098
              host: localhost
            periodSeconds: 30
            initialDelaySeconds: 30
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
kubectl apply -f typha-deployment.yaml
```

---

## Step 4: Create the Typha Service

Felix discovers Typha through a Kubernetes Service. The Service uses a named port so Felix can reference it by name.

```yaml
# typha-service.yaml
# ClusterIP Service that exposes Typha to Felix agents inside the cluster
apiVersion: v1
kind: Service
metadata:
  name: calico-typha
  namespace: kube-system
  labels:
    k8s-app: calico-typha
spec:
  selector:
    k8s-app: calico-typha
  ports:
    - name: calico-typha
      port: 5473
      protocol: TCP
      targetPort: calico-typha
```

```bash
kubectl apply -f typha-service.yaml
```

---

## Step 5: Configure Felix to Use Typha

Update the default `FelixConfiguration` to point Felix at the Typha service.

```yaml
# felixconfig-typha.yaml
# FelixConfiguration telling Felix to discover Typha via the Service name
apiVersion: projectcalico.org/v3
kind: FelixConfiguration
metadata:
  name: default
spec:
  # Felix will resolve this Service name to find Typha endpoints
  typhaK8sServiceName: calico-typha
```

```bash
calicoctl apply -f felixconfig-typha.yaml
```

---

## Step 6: Verify Typha Is Running

```bash
# Confirm Typha pods are Running
kubectl get pods -n kube-system -l k8s-app=calico-typha

# Check Felix logs on any node to confirm it connected to Typha
kubectl logs -n kube-system -l k8s-app=calico-node -c calico-node --tail=30 | grep -i typha
```

You should see log lines similar to `Connected to Typha` in the Felix output.

---

## Best Practices

- Pin Typha to dedicated infrastructure nodes to isolate it from workload disruptions.
- Set `cluster-autoscaler.kubernetes.io/safe-to-evict: "false"` on Typha pods to prevent the autoscaler from evicting them inadvertently.
- Always use pod anti-affinity so Typha replicas land on different nodes.
- Monitor Typha's Prometheus metrics at port 9093 from the start to build baseline connection count data.
- Keep Typha version aligned with your Felix and CNI plugin version.

---

## Conclusion

You have manually deployed Typha, configured RBAC, created the Service, and pointed Felix at it - all without the Calico Operator. From this baseline, the rest of the series covers scaling to more replicas, enabling TLS, monitoring metrics, and tuning performance.

---

*Detect Calico policy changes and network disruptions instantly with [OneUptime](https://oneuptime.com).*
