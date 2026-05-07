# How to Deploy a DaemonSet Workload in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, DaemonSet, Workload

Description: Learn how to deploy a DaemonSet in Rancher to run a pod on every node in your cluster for logging, monitoring, or networking tasks.

A DaemonSet ensures that a copy of a pod runs on every node (or a subset of nodes) in your Kubernetes cluster. DaemonSets are commonly used for cluster-wide services like log collectors, monitoring agents, network plugins, and storage daemons. This guide shows you how to create and manage a DaemonSet in Rancher.

## Prerequisites

- A running Rancher instance (v2.7 or later)
- A managed Kubernetes cluster with multiple nodes
- Access to a project and namespace

## Step 1: Navigate to Workload

Log in to your Rancher dashboard and select your target cluster. From the left sidebar, click **Workload**.

## Step 2: Create a New DaemonSet

Click the **Create** button, then choose **DaemonSet** to open the DaemonSet creation form.

Fill in the basic information:

- **Name**: Enter a descriptive name, such as `fluentd-logger`
- **Namespace**: Select the namespace (often `kube-system` for infrastructure services)

Note that unlike Deployments, DaemonSets do not have a replicas field. The number of pods is determined by the number of nodes.

## Step 3: Configure the Container

In the **Container** section:

- **Container Image**: Enter `fluentd:latest` (or your preferred logging agent)
- **Pull Policy**: Select `IfNotPresent`

Configure a volume mount to access host logs:

1. Click **Add Volume** and select **Host Path**
2. Set **Path on Host** to `/var/log`
3. Set **Mount Point** to `/var/log`
4. Check **Read Only**

## Step 4: Configure Resource Limits

Since DaemonSets run on every node, it is important to set resource limits to avoid consuming too many resources:

- **CPU Request**: `100m`
- **CPU Limit**: `250m`
- **Memory Request**: `128Mi`
- **Memory Limit**: `256Mi`

## Step 5: Configure Tolerations

By default, DaemonSet pods are not scheduled on control plane nodes due to taints. If you need the DaemonSet to run on all nodes including the control plane, add tolerations:

1. Scroll to the **Tolerations** section
2. Click **Add Toleration** and set **Key** to `node-role.kubernetes.io/control-plane`, **Effect** to `NoSchedule`, and **Operator** to `Exists`
3. Click **Add Toleration** again and set **Key** to `node-role.kubernetes.io/master`, **Effect** to `NoSchedule`, and **Operator** to `Exists`

## Step 6: Configure the Update Strategy

DaemonSets support two update strategies:

- **RollingUpdate** (default): Updates pods one node at a time
- **OnDelete**: Only updates pods when they are manually deleted

For RollingUpdate, set:

- **Max Unavailable**: The maximum number of nodes that can have their DaemonSet pod unavailable (default: 1)

## Step 7: Deploy

Click **Create** to deploy the DaemonSet. Rancher will schedule one pod on each eligible node in the cluster.

## Alternative: Deploy via YAML

Use the Import YAML feature to deploy:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: fluentd-logger
  namespace: kube-system
  labels:
    app: fluentd-logger
spec:
  selector:
    matchLabels:
      app: fluentd-logger
  updateStrategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 1
  template:
    metadata:
      labels:
        app: fluentd-logger
    spec:
      tolerations:
        - key: node-role.kubernetes.io/control-plane
          effect: NoSchedule
          operator: Exists
        - key: node-role.kubernetes.io/master
          effect: NoSchedule
          operator: Exists
      containers:
        - name: fluentd
          image: fluentd:latest
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
            limits:
              cpu: 250m
              memory: 256Mi
          volumeMounts:
            - name: varlog
              mountPath: /var/log
              readOnly: true
      volumes:
        - name: varlog
          hostPath:
            path: /var/log
```

## Step 8: Verify the DaemonSet

Check the DaemonSet status in the Rancher UI from the **Workload** view. The desired number should match the number of eligible nodes.

Using kubectl:

```bash
kubectl get daemonset fluentd-logger -n kube-system
```

The output shows:

```plaintext
NAME              DESIRED   CURRENT   READY   UP-TO-DATE   AVAILABLE
fluentd-logger    3         3         3       3             3
```

Verify pods are distributed across nodes:

```bash
kubectl get pods -l app=fluentd-logger -n kube-system -o wide
```

## Targeting Specific Nodes

If you only want the DaemonSet to run on certain nodes, use a node selector:

1. Label your target nodes:

```bash
kubectl label nodes worker-1 worker-2 logging=enabled
```

2. In the Rancher DaemonSet form, add a **Node Selector**:
   - **Key**: `logging`
   - **Value**: `enabled`

Or in YAML, add to the pod spec:

```yaml
spec:
  template:
    spec:
      nodeSelector:
        logging: "enabled"
```

## Updating a DaemonSet

To update the container image or configuration:

1. Go to **Workload**
2. Open the DaemonSet and select **Edit Config**
3. Make your changes (e.g., update the image tag)
4. Click **Save**

With a RollingUpdate strategy, pods will be updated one node at a time.

## Summary

You have deployed a DaemonSet in Rancher to run pods across every node in your cluster. DaemonSets are essential for node-level services like logging, monitoring, and networking. Rancher provides a clear interface for configuring tolerations, node selectors, and update strategies, making it easy to manage DaemonSets across large clusters.
