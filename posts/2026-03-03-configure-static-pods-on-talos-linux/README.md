# How to Configure Static Pods on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Static Pods, Kubernetes, Node Configuration, Pod Management

Description: Learn how to configure and manage static pods on Talos Linux for running critical system-level services directly on cluster nodes.

---

Static pods are pods that the kubelet manages directly, without going through the Kubernetes API server. They are defined by placing pod manifest files in a specific directory on the node. The kubelet watches this directory and starts pods for any manifests it finds there. In Talos Linux, static pods have a specific role and are configured through the machine configuration rather than by dropping files on disk manually.

This guide covers how static pods work in Talos Linux, when to use them, and how to configure them properly.

## What Makes Static Pods Special

Static pods differ from regular pods in several important ways:

They are managed by the kubelet on a specific node, not by the Kubernetes control plane. The API server can see them as mirror pods, but it cannot delete or modify them. Only changes to the manifest file on the node affect the pod.

They always run on the node where the manifest is defined. There is no scheduling involved. The kubelet on that node starts the pod and keeps it running.

They survive API server outages. Because the kubelet manages them directly, static pods keep running even if the control plane is down. This makes them useful for bootstrap components and critical node-level services.

## How Talos Handles Static Pods

In Talos Linux, you cannot SSH into a node and place files in a directory. Instead, static pods are configured through the machine configuration. Talos provides the `machine.pods` field for defining static pods:

```yaml
machine:
  pods:
    - apiVersion: v1
      kind: Pod
      metadata:
        name: nginx-static
        namespace: default
      spec:
        containers:
          - name: nginx
            image: nginx:1.25
            ports:
              - containerPort: 80
                hostPort: 8080
```

When you apply this configuration, Talos writes the pod manifest to the static pod directory, and the kubelet picks it up automatically.

## Practical Example: Running a Local Monitoring Agent

One common use case for static pods is running a monitoring agent that needs to be present on every node regardless of the cluster state:

```yaml
machine:
  pods:
    - apiVersion: v1
      kind: Pod
      metadata:
        name: node-monitor
        namespace: kube-system
      spec:
        hostNetwork: true
        containers:
          - name: monitor
            image: prom/node-exporter:v1.7.0
            args:
              - "--path.procfs=/host/proc"
              - "--path.sysfs=/host/sys"
              - "--path.rootfs=/host/root"
            ports:
              - containerPort: 9100
                hostPort: 9100
            volumeMounts:
              - name: proc
                mountPath: /host/proc
                readOnly: true
              - name: sys
                mountPath: /host/sys
                readOnly: true
        volumes:
          - name: proc
            hostPath:
              path: /proc
          - name: sys
            hostPath:
              path: /sys
```

This ensures the monitoring agent runs on the node even if the Kubernetes control plane is unavailable.

## Configuring Multiple Static Pods

You can define multiple static pods in the same machine configuration:

```yaml
machine:
  pods:
    # Static pod for log forwarding
    - apiVersion: v1
      kind: Pod
      metadata:
        name: log-forwarder
        namespace: kube-system
      spec:
        hostNetwork: true
        containers:
          - name: fluentbit
            image: fluent/fluent-bit:2.2
            volumeMounts:
              - name: varlog
                mountPath: /var/log
                readOnly: true
        volumes:
          - name: varlog
            hostPath:
              path: /var/log
    # Static pod for network diagnostics
    - apiVersion: v1
      kind: Pod
      metadata:
        name: network-debug
        namespace: kube-system
      spec:
        hostNetwork: true
        containers:
          - name: debug
            image: nicolaka/netshoot:latest
            command: ["sleep", "infinity"]
```

## Using Static Pods for Bootstrap Services

Static pods are particularly useful during cluster bootstrap. Kubernetes itself uses static pods for control plane components like the API server, controller manager, and scheduler. In Talos Linux, these are managed internally, but you can add your own bootstrap services:

```yaml
machine:
  pods:
    - apiVersion: v1
      kind: Pod
      metadata:
        name: etcd-backup
        namespace: kube-system
      spec:
        hostNetwork: true
        containers:
          - name: backup
            image: ghcr.io/siderolabs/talosctl:latest
            command:
              - /bin/sh
              - -c
              - |
                while true; do
                  # Perform etcd snapshot backup
                  echo "Running etcd backup at $(date)"
                  sleep 3600
                done
            volumeMounts:
              - name: backup-storage
                mountPath: /backup
        volumes:
          - name: backup-storage
            hostPath:
              path: /var/mnt/backups
```

## Applying Static Pod Configuration

Apply the machine configuration to the target node:

```bash
# Apply configuration with static pods
talosctl apply-config --nodes 10.0.0.5 --file worker.yaml

# Verify the static pod is running
kubectl get pods --all-namespaces | grep static

# Check the pod status
kubectl describe pod nginx-static-<node-name> -n default
```

Static pods appear in the Kubernetes API with the node name appended to their name. This helps identify which node they are running on.

## Updating Static Pods

To update a static pod, modify the pod definition in the machine configuration and reapply:

```bash
# Create a patch to update the static pod image
cat > static-pod-patch.yaml <<EOF
machine:
  pods:
    - apiVersion: v1
      kind: Pod
      metadata:
        name: nginx-static
        namespace: default
      spec:
        containers:
          - name: nginx
            image: nginx:1.26
            ports:
              - containerPort: 80
                hostPort: 8080
EOF

# Apply the patch
talosctl apply-config --nodes 10.0.0.5 --file updated-config.yaml
```

The kubelet detects the change and restarts the pod with the new configuration. Note that you must provide the complete pod spec when updating, not just the changed fields.

## Removing Static Pods

To remove a static pod, remove it from the machine configuration and reapply:

```yaml
# Machine config without the static pod
machine:
  pods: []
```

```bash
talosctl apply-config --nodes 10.0.0.5 --file updated-config.yaml
```

The kubelet will terminate the pod when the manifest is removed.

## Limitations and Considerations

Static pods have some limitations you should be aware of:

They do not support all Kubernetes features. For instance, static pods cannot use service accounts, configmaps as environment variables, or downward API fields that require API server interaction.

They are not managed by deployments, replica sets, or any higher-level controller. If the pod crashes, the kubelet restarts it, but there is no rolling update mechanism.

Resource usage is not accounted for by the scheduler. Since the scheduler does not place static pods, the resources they consume are not considered when scheduling other pods. This can lead to resource contention.

Static pods are tied to a specific node. If you want the same pod on multiple nodes, you need to include it in each node's machine configuration. For that use case, a DaemonSet is usually a better choice.

## When to Use Static Pods vs DaemonSets

Use static pods when you need a service to run even without a working control plane, or when the service is part of the node bootstrap process. Use DaemonSets for everything else. DaemonSets are easier to manage, support rolling updates, and work with the full Kubernetes API.

## Conclusion

Static pods in Talos Linux provide a way to run essential services directly on nodes without depending on the Kubernetes control plane. They are configured through the machine configuration, keeping everything declarative and API-driven. Use them sparingly for truly critical node-level services, and prefer DaemonSets for most operational workloads. The key advantage of static pods is their resilience - they keep running regardless of the cluster state.
