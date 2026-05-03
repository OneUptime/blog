# How to Deploy DaemonSets in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Kubernetes, DaemonSet, Node Agent, DevOps

Description: Learn how to deploy and manage Kubernetes DaemonSets through Portainer for running workloads on every cluster node.

## What Is a DaemonSet?

A DaemonSet ensures that a copy of a pod runs on every (or a subset of) node(s) in a Kubernetes cluster. When new nodes are added, the DaemonSet automatically schedules a pod on them. Common use cases:

- Log collectors (Fluentd, Filebeat)
- Monitoring agents (node-exporter, Datadog agent)
- Network plugins (Calico, Cilium)
- Security agents

## Deploying a DaemonSet in Portainer

1. Select your Kubernetes environment.
2. Go to **Applications > Add application**.
3. Scroll to **Deployment type** and select **DaemonSet**.
4. Fill in image, environment variables, and volume mounts as usual.
5. Click **Deploy the application**.

## DaemonSet YAML Example

```yaml
# DaemonSet for deploying a log collection agent on every node

apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: log-collector
  namespace: monitoring
  labels:
    app: log-collector
spec:
  selector:
    matchLabels:
      app: log-collector
  template:
    metadata:
      labels:
        app: log-collector
    spec:
      containers:
        - name: fluentd
          image: fluent/fluentd-kubernetes-daemonset:v1-debian-elasticsearch
          env:
            - name: FLUENT_ELASTICSEARCH_HOST
              value: "elasticsearch.monitoring.svc.cluster.local"
          resources:
            limits:
              memory: 200Mi
            requests:
              cpu: 100m
              memory: 200Mi
          volumeMounts:
            - name: varlog
              mountPath: /var/log       # Access host log directory
            - name: varlibdockercontainers
              mountPath: /var/lib/docker/containers
              readOnly: true
      # Also schedule on control-plane nodes
      tolerations:
        - key: node-role.kubernetes.io/control-plane
          operator: Exists
          effect: NoSchedule
      volumes:
        - name: varlog
          hostPath:
            path: /var/log              # Mount from host filesystem
        - name: varlibdockercontainers
          hostPath:
            path: /var/lib/docker/containers
```

## Running DaemonSets on Specific Nodes Only

Use node selectors to restrict DaemonSet pods to a subset of nodes:

```yaml
spec:
  template:
    spec:
      # Only run on nodes labeled: monitoring=enabled
      nodeSelector:
        monitoring: enabled
```

## Managing DaemonSets via CLI

```bash
# List all DaemonSets
kubectl get daemonsets --all-namespaces

# Check that a DaemonSet has the expected number of pods
kubectl get daemonset log-collector --namespace=monitoring

# View DaemonSet rollout status
kubectl rollout status daemonset/log-collector --namespace=monitoring

# Update the DaemonSet image
kubectl set image daemonset/log-collector \
  fluentd=fluent/fluentd-kubernetes-daemonset:v2 \
  --namespace=monitoring
```

## Conclusion

DaemonSets are ideal for node-level workloads that must run everywhere. Portainer's deployment form supports DaemonSet deployment type, making it easy to roll out cluster-wide agents without writing YAML from scratch.
