# How to Use Ansible to Manage Kubernetes DaemonSets

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Kubernetes, DaemonSets, Monitoring, DevOps

Description: Learn how to create and manage Kubernetes DaemonSets with Ansible for node-level agents like log collectors, monitoring exporters, and network plugins.

---

DaemonSets ensure that a copy of a pod runs on every node (or a selected subset of nodes) in your Kubernetes cluster. They are the right workload type for node-level concerns: log collection agents, monitoring exporters, network plugins, storage drivers, and security scanners. When a new node joins the cluster, the DaemonSet controller automatically schedules a pod on it. When a node is removed, the pod is garbage collected.

This guide covers creating DaemonSets with Ansible for common use cases, targeting specific nodes with selectors, configuring update strategies, and managing the full lifecycle.

## Prerequisites

- Ansible 2.12+ with `kubernetes.core` collection
- A running Kubernetes cluster
- A valid kubeconfig

```bash
ansible-galaxy collection install kubernetes.core
pip install kubernetes
```

## When to Use DaemonSets

DaemonSets are appropriate when you need exactly one pod per node. Common examples:

- **Log collectors**: Fluentd, Fluent Bit, Filebeat
- **Monitoring agents**: Prometheus Node Exporter, Datadog agent
- **Network plugins**: Calico, Cilium, Weave
- **Storage drivers**: CSI node plugins
- **Security tools**: Falco, Twistlock

If you just need "at least N replicas somewhere in the cluster," use a Deployment instead.

## Deploying a Log Collector DaemonSet

Fluent Bit is a lightweight log processor that collects container logs from every node. Here is a complete playbook to deploy it.

```yaml
# playbook: deploy-fluentbit-daemonset.yml
# Deploys Fluent Bit as a DaemonSet for centralized log collection
---
- name: Deploy Fluent Bit DaemonSet
  hosts: localhost
  connection: local
  gather_facts: false

  vars:
    namespace: logging
    fluentbit_image: fluent/fluent-bit:2.2

  tasks:
    - name: Create logging namespace
      kubernetes.core.k8s:
        state: present
        definition:
          apiVersion: v1
          kind: Namespace
          metadata:
            name: "{{ namespace }}"

    - name: Create Fluent Bit ConfigMap
      kubernetes.core.k8s:
        state: present
        definition:
          apiVersion: v1
          kind: ConfigMap
          metadata:
            name: fluent-bit-config
            namespace: "{{ namespace }}"
          data:
            fluent-bit.conf: |
              [SERVICE]
                  Flush         5
                  Log_Level     info
                  Daemon        off
                  Parsers_File  parsers.conf

              [INPUT]
                  Name          tail
                  Path          /var/log/containers/*.log
                  Parser        docker
                  Tag           kube.*
                  Mem_Buf_Limit 5MB
                  Skip_Long_Lines On

              [OUTPUT]
                  Name          forward
                  Match         *
                  Host          fluentd-aggregator.logging.svc.cluster.local
                  Port          24224
            parsers.conf: |
              [PARSER]
                  Name        docker
                  Format      json
                  Time_Key    time
                  Time_Format %Y-%m-%dT%H:%M:%S.%L

    - name: Create Fluent Bit DaemonSet
      kubernetes.core.k8s:
        state: present
        definition:
          apiVersion: apps/v1
          kind: DaemonSet
          metadata:
            name: fluent-bit
            namespace: "{{ namespace }}"
            labels:
              app: fluent-bit
          spec:
            selector:
              matchLabels:
                app: fluent-bit
            template:
              metadata:
                labels:
                  app: fluent-bit
              spec:
                serviceAccountName: fluent-bit
                tolerations:
                  # Run on control plane nodes too
                  - key: node-role.kubernetes.io/control-plane
                    effect: NoSchedule
                  - key: node-role.kubernetes.io/master
                    effect: NoSchedule
                containers:
                  - name: fluent-bit
                    image: "{{ fluentbit_image }}"
                    resources:
                      requests:
                        cpu: 50m
                        memory: 64Mi
                      limits:
                        cpu: 200m
                        memory: 128Mi
                    volumeMounts:
                      - name: varlog
                        mountPath: /var/log
                        readOnly: true
                      - name: config
                        mountPath: /fluent-bit/etc/
                volumes:
                  - name: varlog
                    hostPath:
                      path: /var/log
                  - name: config
                    configMap:
                      name: fluent-bit-config
```

Key things to notice: the `tolerations` section allows the DaemonSet pods to run on control plane nodes, which typically have a NoSchedule taint. The `hostPath` volume mounts the node's `/var/log` directory so Fluent Bit can read container logs directly from the host filesystem.

## Deploying a Node Exporter for Monitoring

Prometheus Node Exporter collects hardware and OS metrics from every node. It is a textbook DaemonSet use case.

```yaml
# playbook: deploy-node-exporter.yml
# Deploys Prometheus Node Exporter on every node for metrics collection
---
- name: Deploy Node Exporter DaemonSet
  hosts: localhost
  connection: local
  gather_facts: false

  tasks:
    - name: Create Node Exporter DaemonSet
      kubernetes.core.k8s:
        state: present
        definition:
          apiVersion: apps/v1
          kind: DaemonSet
          metadata:
            name: node-exporter
            namespace: monitoring
            labels:
              app: node-exporter
          spec:
            selector:
              matchLabels:
                app: node-exporter
            template:
              metadata:
                labels:
                  app: node-exporter
                annotations:
                  prometheus.io/scrape: "true"
                  prometheus.io/port: "9100"
              spec:
                hostNetwork: true
                hostPID: true
                tolerations:
                  - operator: Exists
                containers:
                  - name: node-exporter
                    image: prom/node-exporter:v1.7.0
                    args:
                      - --path.procfs=/host/proc
                      - --path.sysfs=/host/sys
                      - --path.rootfs=/host/root
                      - --collector.filesystem.mount-points-exclude
                      - "^/(sys|proc|dev|host|etc)($$|/)"
                    ports:
                      - containerPort: 9100
                        hostPort: 9100
                        name: metrics
                    resources:
                      requests:
                        cpu: 50m
                        memory: 30Mi
                      limits:
                        cpu: 250m
                        memory: 100Mi
                    volumeMounts:
                      - name: proc
                        mountPath: /host/proc
                        readOnly: true
                      - name: sys
                        mountPath: /host/sys
                        readOnly: true
                      - name: root
                        mountPath: /host/root
                        mountPropagation: HostToContainer
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

The `hostNetwork: true` setting makes the pod use the node's network namespace, so the exporter binds directly to the node's IP on port 9100. The `tolerations` with `operator: Exists` means "tolerate every taint," ensuring the exporter runs on absolutely every node regardless of taints.

## Targeting Specific Nodes

Sometimes you want a DaemonSet to run only on certain nodes. Node selectors and affinity rules control this.

```yaml
# playbook: deploy-gpu-monitor.yml
# Deploys a GPU monitoring agent only on nodes with GPUs
---
- name: Deploy GPU Monitor DaemonSet
  hosts: localhost
  connection: local
  gather_facts: false

  tasks:
    - name: Create GPU monitoring DaemonSet
      kubernetes.core.k8s:
        state: present
        definition:
          apiVersion: apps/v1
          kind: DaemonSet
          metadata:
            name: gpu-monitor
            namespace: monitoring
          spec:
            selector:
              matchLabels:
                app: gpu-monitor
            template:
              metadata:
                labels:
                  app: gpu-monitor
              spec:
                # Only schedule on nodes labeled with gpu=true
                nodeSelector:
                  gpu: "true"
                containers:
                  - name: dcgm-exporter
                    image: nvcr.io/nvidia/k8s/dcgm-exporter:3.3.0-3.2.0-ubuntu22.04
                    ports:
                      - containerPort: 9400
                        name: metrics
                    resources:
                      limits:
                        nvidia.com/gpu: 0
```

The `nodeSelector` field restricts the DaemonSet to nodes with the label `gpu=true`. Only those nodes will get a pod.

## Configuring Update Strategies

DaemonSets support two update strategies: `RollingUpdate` (default) and `OnDelete`.

```yaml
# playbook: update-daemonset-strategy.yml
# Configures a controlled rolling update for the DaemonSet
---
- name: Configure DaemonSet update strategy
  hosts: localhost
  connection: local
  gather_facts: false

  tasks:
    - name: Update DaemonSet with rolling update configuration
      kubernetes.core.k8s:
        state: present
        definition:
          apiVersion: apps/v1
          kind: DaemonSet
          metadata:
            name: fluent-bit
            namespace: logging
          spec:
            updateStrategy:
              type: RollingUpdate
              rollingUpdate:
                # Update one node at a time
                maxUnavailable: 1
            template:
              metadata:
                labels:
                  app: fluent-bit
              spec:
                containers:
                  - name: fluent-bit
                    # Updating to a new version triggers the rollout
                    image: fluent/fluent-bit:2.3
                    resources:
                      requests:
                        cpu: 50m
                        memory: 64Mi
                      limits:
                        cpu: 200m
                        memory: 128Mi
                    volumeMounts:
                      - name: varlog
                        mountPath: /var/log
                        readOnly: true
                volumes:
                  - name: varlog
                    hostPath:
                      path: /var/log
```

Setting `maxUnavailable: 1` means the rollout updates one node at a time. For a 100-node cluster, you could set this to `10` or `10%` to speed things up while keeping 90% of your log collection running.

## Checking DaemonSet Status

After deploying, verify that pods are running on all expected nodes.

```yaml
# task: verify DaemonSet is fully rolled out
- name: Get DaemonSet status
  kubernetes.core.k8s_info:
    kind: DaemonSet
    name: fluent-bit
    namespace: logging
  register: ds_info

- name: Validate all nodes have the DaemonSet pod
  ansible.builtin.assert:
    that:
      - ds_info.resources[0].status.desiredNumberScheduled == ds_info.resources[0].status.numberReady
    fail_msg: >
      DaemonSet not fully ready:
      {{ ds_info.resources[0].status.numberReady }}/{{ ds_info.resources[0].status.desiredNumberScheduled }} pods ready
    success_msg: >
      All {{ ds_info.resources[0].status.numberReady }} DaemonSet pods are ready
```

## Summary

DaemonSets solve a specific problem: running exactly one pod per node for infrastructure-level concerns. Ansible makes managing them straightforward with the same `kubernetes.core.k8s` module you use for everything else. The key considerations are tolerations (to run on tainted nodes), host path volumes (to access node-level data), and update strategies (to control rollout speed). Whether you are collecting logs, exporting metrics, or running security agents, DaemonSets paired with Ansible give you a consistent, automated approach to node-level operations.
