# How to Configure Machine Pods in Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Static Pods, Machine Configuration, Kubernetes, Containers

Description: Learn how to configure static machine pods in Talos Linux for running system-level workloads that start before the Kubernetes API server.

---

Talos Linux supports running static pods at the machine level through the `machine.pods` configuration. These are not regular Kubernetes pods managed by the API server. Instead, they are static pods that the kubelet runs directly based on the machine configuration. They start before the Kubernetes control plane is fully operational, which makes them useful for bootstrapping services, running node-level agents, and deploying components that need to be available even when the API server is down.

This guide covers how to define, deploy, and manage machine-level static pods in Talos Linux.

## What Are Machine Pods?

Machine pods are static pod manifests embedded directly in the Talos machine configuration. The kubelet picks them up and runs them automatically. Unlike regular pods deployed through `kubectl`, these pods:

- Start as soon as the kubelet starts, before the control plane is ready
- Cannot be deleted through the Kubernetes API (they are recreated automatically)
- Show up in `kubectl get pods` with a node name suffix
- Are managed by the Talos configuration, not by Kubernetes controllers

This makes them ideal for infrastructure components that need to run at the node level.

## The Machine Pods Configuration

Machine pods are defined under `machine.pods` as a list of pod manifests in the Talos machine configuration:

```yaml
# Define a static pod in the machine config
machine:
  pods:
    - apiVersion: v1
      kind: Pod
      metadata:
        name: log-collector
        namespace: kube-system
      spec:
        containers:
          - name: log-collector
            image: fluent/fluent-bit:latest
            volumeMounts:
              - name: varlog
                mountPath: /var/log
                readOnly: true
        volumes:
          - name: varlog
            hostPath:
              path: /var/log
```

The pod manifest follows the standard Kubernetes pod spec. You can use any fields that a regular pod spec supports, including volumes, resource limits, security contexts, and init containers.

## Use Case: Node Monitoring Agent

A common use case is running a monitoring agent that needs to be available from the moment the node starts:

```yaml
# Static pod for node monitoring
machine:
  pods:
    - apiVersion: v1
      kind: Pod
      metadata:
        name: node-exporter
        namespace: monitoring
        labels:
          app: node-exporter
      spec:
        hostNetwork: true
        hostPID: true
        containers:
          - name: node-exporter
            image: prom/node-exporter:v1.7.0
            args:
              - "--path.procfs=/host/proc"
              - "--path.sysfs=/host/sys"
              - "--path.rootfs=/host/root"
              # Collector settings
              - "--collector.filesystem.mount-points-exclude=^/(dev|proc|sys|var/lib/docker/.+)($$|/)"
            ports:
              - containerPort: 9100
                hostPort: 9100
                protocol: TCP
            resources:
              limits:
                cpu: 250m
                memory: 128Mi
              requests:
                cpu: 100m
                memory: 64Mi
            volumeMounts:
              - name: proc
                mountPath: /host/proc
                readOnly: true
              - name: sys
                mountPath: /host/sys
                readOnly: true
              - name: root
                mountPath: /host/root
                readOnly: true
        volumes:
          - name: proc
            hostPath:
              path: /proc
          - name: sys
            hostPath:
              path: /sys
          - name: root
            hostPath:
              path: /
```

This node exporter pod runs with host network and host PID access so it can collect accurate metrics about the underlying node.

## Use Case: Log Forwarder

Running a log forwarder as a static pod ensures logs are collected from the very start of the node's lifecycle:

```yaml
# Static pod for log forwarding
machine:
  pods:
    - apiVersion: v1
      kind: Pod
      metadata:
        name: fluent-bit
        namespace: kube-system
      spec:
        containers:
          - name: fluent-bit
            image: fluent/fluent-bit:2.2
            env:
              - name: NODE_NAME
                valueFrom:
                  fieldRef:
                    fieldPath: spec.nodeName
            volumeMounts:
              - name: varlog
                mountPath: /var/log
                readOnly: true
              - name: config
                mountPath: /fluent-bit/etc/
            resources:
              limits:
                cpu: 200m
                memory: 256Mi
              requests:
                cpu: 50m
                memory: 64Mi
        volumes:
          - name: varlog
            hostPath:
              path: /var/log
          - name: config
            hostPath:
              path: /var/etc/fluent-bit
```

You would pair this with a `machine.files` entry that places the Fluent Bit configuration file at `/var/etc/fluent-bit/fluent-bit.conf`.

## Use Case: Custom Network Agent

Some network setups require an agent running on each node before the CNI is fully operational:

```yaml
# Static pod for a network configuration agent
machine:
  pods:
    - apiVersion: v1
      kind: Pod
      metadata:
        name: network-config-agent
        namespace: kube-system
      spec:
        hostNetwork: true
        containers:
          - name: agent
            image: company/network-agent:v1.0
            securityContext:
              privileged: true
            env:
              - name: NODE_IP
                valueFrom:
                  fieldRef:
                    fieldPath: status.hostIP
            volumeMounts:
              - name: netns
                mountPath: /var/run/netns
        volumes:
          - name: netns
            hostPath:
              path: /var/run/netns
```

## Multiple Static Pods

You can define multiple static pods in the same configuration:

```yaml
# Multiple static pods
machine:
  pods:
    - apiVersion: v1
      kind: Pod
      metadata:
        name: node-exporter
        namespace: monitoring
      spec:
        hostNetwork: true
        containers:
          - name: node-exporter
            image: prom/node-exporter:v1.7.0
            ports:
              - containerPort: 9100
                hostPort: 9100

    - apiVersion: v1
      kind: Pod
      metadata:
        name: log-collector
        namespace: kube-system
      spec:
        containers:
          - name: fluent-bit
            image: fluent/fluent-bit:2.2
            volumeMounts:
              - name: varlog
                mountPath: /var/log
        volumes:
          - name: varlog
            hostPath:
              path: /var/log
```

## Applying Machine Pods

Apply the configuration like any other machine config change:

```bash
# Apply config with static pods
talosctl apply-config \
  --nodes 192.168.1.100 \
  --file worker.yaml
```

Static pod changes do not require a reboot. The kubelet detects the changes and starts or restarts the pods automatically.

## Viewing and Managing Static Pods

Once applied, you can see static pods through kubectl:

```bash
# List static pods on a specific node
kubectl get pods -A --field-selector spec.nodeName=worker-01 | grep -v "controller\|scheduler\|apiserver"

# Describe a static pod
kubectl describe pod node-exporter-worker-01 -n monitoring
```

Static pods have the node name appended to their name. So a pod named `node-exporter` on node `worker-01` appears as `node-exporter-worker-01`.

You cannot delete a static pod through kubectl. If you try, the kubelet will recreate it immediately:

```bash
# This won't permanently remove the pod
kubectl delete pod node-exporter-worker-01 -n monitoring
# The pod will reappear within seconds
```

To actually remove a static pod, you need to remove it from the machine configuration and reapply.

## Resource Considerations

Static pods consume resources on your node just like any other pod. Make sure to set resource requests and limits to prevent them from consuming too many resources:

```yaml
# Always set resource limits on static pods
spec:
  containers:
    - name: my-agent
      image: my-image:latest
      resources:
        requests:
          cpu: 50m
          memory: 64Mi
        limits:
          cpu: 200m
          memory: 256Mi
```

Since static pods are not managed by the Kubernetes scheduler, they do not participate in resource-aware scheduling. The scheduler does not account for their resource usage when placing other pods, which can lead to resource contention if you are not careful.

## When to Use Machine Pods vs DaemonSets

Machine pods and DaemonSets serve similar purposes - running a workload on every node. The key differences are:

- Machine pods start before the control plane; DaemonSets require the API server
- Machine pods are defined per-node in the machine config; DaemonSets are defined once in Kubernetes
- Machine pods survive API server outages; DaemonSets need the control plane for management
- DaemonSets support rolling updates; machine pods require config reapplication

Use machine pods for truly critical node-level services that must run even during control plane downtime. Use DaemonSets for everything else, as they are easier to manage and update.

Machine pods in Talos Linux give you a powerful way to run essential services at the node level with the reliability of static pods and the declarative management of the Talos configuration system.
