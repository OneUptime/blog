# How to Use Ansible to Manage Kubernetes Horizontal Pod Autoscaler

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Kubernetes, HPA, Autoscaling, DevOps

Description: Configure Kubernetes Horizontal Pod Autoscaler with Ansible to automatically scale workloads based on CPU, memory, and custom metrics.

---

The Horizontal Pod Autoscaler (HPA) automatically adjusts the number of pod replicas in a Deployment, ReplicaSet, or StatefulSet based on observed metrics. When CPU usage spikes, the HPA scales up. When traffic drops, it scales back down. Configuring HPAs through Ansible lets you define your scaling policies as code, review them in pull requests, and apply them consistently across environments.

This guide covers creating HPAs with Ansible for CPU-based scaling, memory-based scaling, custom metrics, and the newer autoscaling/v2 API with advanced behaviors.

## Prerequisites

- Ansible 2.12+ with `kubernetes.core` collection
- A Kubernetes cluster with metrics-server installed
- A valid kubeconfig
- Deployments with resource requests defined (required for percentage-based scaling)

```bash
ansible-galaxy collection install kubernetes.core
pip install kubernetes
```

## Verifying metrics-server

HPA needs metrics-server to read CPU and memory usage. Check if it is running:

```yaml
# task: verify metrics-server is running in the cluster
- name: Check metrics-server deployment
  kubernetes.core.k8s_info:
    kind: Deployment
    name: metrics-server
    namespace: kube-system
  register: metrics_server

- name: Verify metrics-server is ready
  ansible.builtin.assert:
    that:
      - metrics_server.resources | length > 0
      - metrics_server.resources[0].status.readyReplicas >= 1
    fail_msg: "metrics-server is not running. HPA will not work without it."
    success_msg: "metrics-server is running"
```

## Creating a Basic CPU-Based HPA

The simplest HPA targets CPU utilization. When average CPU across all pods exceeds the threshold, new pods are added.

```yaml
# playbook: create-hpa-cpu.yml
# Creates an HPA that scales based on CPU utilization
---
- name: Create CPU-based HPA
  hosts: localhost
  connection: local
  gather_facts: false

  vars:
    namespace: production

  tasks:
    - name: Ensure the deployment has resource requests
      kubernetes.core.k8s:
        state: present
        definition:
          apiVersion: apps/v1
          kind: Deployment
          metadata:
            name: web-app
            namespace: "{{ namespace }}"
          spec:
            replicas: 2
            selector:
              matchLabels:
                app: web-app
            template:
              metadata:
                labels:
                  app: web-app
              spec:
                containers:
                  - name: web-app
                    image: myapp/web:v1.0
                    resources:
                      # Resource requests are required for HPA to calculate percentages
                      requests:
                        cpu: 200m
                        memory: 256Mi
                      limits:
                        cpu: 1
                        memory: 512Mi

    - name: Create HPA for web-app
      kubernetes.core.k8s:
        state: present
        definition:
          apiVersion: autoscaling/v2
          kind: HorizontalPodAutoscaler
          metadata:
            name: web-app-hpa
            namespace: "{{ namespace }}"
          spec:
            scaleTargetRef:
              apiVersion: apps/v1
              kind: Deployment
              name: web-app
            minReplicas: 2
            maxReplicas: 20
            metrics:
              - type: Resource
                resource:
                  name: cpu
                  target:
                    type: Utilization
                    averageUtilization: 70
```

This HPA keeps average CPU utilization around 70%. If the two pods are both running at 90% CPU, the HPA adds more pods until the average drops to 70%. It will never go below 2 replicas or above 20.

## CPU and Memory Combined HPA

You can target multiple metrics. The HPA scales based on whichever metric requires the most replicas.

```yaml
# playbook: create-hpa-multi-metric.yml
# Creates an HPA that considers both CPU and memory utilization
---
- name: Create multi-metric HPA
  hosts: localhost
  connection: local
  gather_facts: false

  tasks:
    - name: Create HPA with CPU and memory targets
      kubernetes.core.k8s:
        state: present
        definition:
          apiVersion: autoscaling/v2
          kind: HorizontalPodAutoscaler
          metadata:
            name: api-service-hpa
            namespace: production
          spec:
            scaleTargetRef:
              apiVersion: apps/v1
              kind: Deployment
              name: api-service
            minReplicas: 3
            maxReplicas: 50
            metrics:
              - type: Resource
                resource:
                  name: cpu
                  target:
                    type: Utilization
                    averageUtilization: 65
              - type: Resource
                resource:
                  name: memory
                  target:
                    type: Utilization
                    averageUtilization: 80
```

If CPU says you need 10 replicas but memory says you need 15, the HPA scales to 15. It always picks the highest recommendation.

## HPA with Scaling Behavior Controls

The autoscaling/v2 API lets you fine-tune how fast the HPA scales up and down. This prevents thrashing and gives your application time to stabilize.

```yaml
# playbook: create-hpa-behavior.yml
# Configures HPA with controlled scale-up and scale-down behavior
---
- name: Create HPA with behavior controls
  hosts: localhost
  connection: local
  gather_facts: false

  tasks:
    - name: Create HPA with scaling behavior policies
      kubernetes.core.k8s:
        state: present
        definition:
          apiVersion: autoscaling/v2
          kind: HorizontalPodAutoscaler
          metadata:
            name: web-app-hpa
            namespace: production
          spec:
            scaleTargetRef:
              apiVersion: apps/v1
              kind: Deployment
              name: web-app
            minReplicas: 3
            maxReplicas: 100
            metrics:
              - type: Resource
                resource:
                  name: cpu
                  target:
                    type: Utilization
                    averageUtilization: 70
            behavior:
              scaleUp:
                stabilizationWindowSeconds: 30
                policies:
                  # Add up to 4 pods per minute
                  - type: Pods
                    value: 4
                    periodSeconds: 60
                  # Or double the current count, whichever is larger
                  - type: Percent
                    value: 100
                    periodSeconds: 60
                selectPolicy: Max
              scaleDown:
                stabilizationWindowSeconds: 300
                policies:
                  # Remove at most 1 pod per 2 minutes
                  - type: Pods
                    value: 1
                    periodSeconds: 120
                selectPolicy: Min
```

The `stabilizationWindowSeconds` is a lookback window. For scale-down, the 300-second window means the HPA looks at the highest recommendation over the last 5 minutes before scaling down. This prevents premature scale-down during traffic fluctuations.

The `selectPolicy: Max` for scale-up means "pick whichever policy allows more pods." For scale-down, `selectPolicy: Min` means "pick whichever policy removes fewer pods." This gives aggressive scale-up and conservative scale-down.

## Creating HPAs for Multiple Deployments

When you have several services that all need autoscaling, use a data-driven approach.

```yaml
# playbook: create-hpa-multi.yml
# Creates HPAs for multiple services from a variable list
---
- name: Create HPAs for all services
  hosts: localhost
  connection: local
  gather_facts: false

  vars:
    autoscaled_services:
      - name: web-frontend
        min: 3
        max: 30
        cpu_target: 70
      - name: api-gateway
        min: 5
        max: 50
        cpu_target: 60
      - name: worker
        min: 2
        max: 20
        cpu_target: 80
      - name: notification-service
        min: 1
        max: 10
        cpu_target: 75

  tasks:
    - name: Create HPA for each service
      kubernetes.core.k8s:
        state: present
        definition:
          apiVersion: autoscaling/v2
          kind: HorizontalPodAutoscaler
          metadata:
            name: "{{ item.name }}-hpa"
            namespace: production
            labels:
              app: "{{ item.name }}"
              managed-by: ansible
          spec:
            scaleTargetRef:
              apiVersion: apps/v1
              kind: Deployment
              name: "{{ item.name }}"
            minReplicas: "{{ item.min }}"
            maxReplicas: "{{ item.max }}"
            metrics:
              - type: Resource
                resource:
                  name: cpu
                  target:
                    type: Utilization
                    averageUtilization: "{{ item.cpu_target }}"
      loop: "{{ autoscaled_services }}"
      loop_control:
        label: "{{ item.name }} ({{ item.min }}-{{ item.max }})"
```

## Monitoring HPA Status

Check whether your HPAs are working correctly and what the current scaling state looks like.

```yaml
# playbook: check-hpa-status.yml
# Retrieves and displays HPA status for all autoscaled workloads
---
- name: Check HPA Status
  hosts: localhost
  connection: local
  gather_facts: false

  tasks:
    - name: Get all HPAs in production
      kubernetes.core.k8s_info:
        kind: HorizontalPodAutoscaler
        namespace: production
        api_version: autoscaling/v2
      register: hpa_list

    - name: Display HPA status
      ansible.builtin.debug:
        msg: >
          {{ item.metadata.name }}:
          {{ item.status.currentReplicas | default('?') }}/{{ item.spec.maxReplicas }} replicas |
          Current metrics: {{ item.status.currentMetrics | default([]) | map(attribute='resource') | map(attribute='current') | list }}
      loop: "{{ hpa_list.resources }}"
      loop_control:
        label: "{{ item.metadata.name }}"
```

## HPA with Custom Metrics

For applications where CPU and memory do not reflect the real load (like queue depth or request latency), you can scale on custom metrics from Prometheus or other providers.

```yaml
# task: create HPA based on custom metrics from Prometheus adapter
- name: Create HPA with custom metrics
  kubernetes.core.k8s:
    state: present
    definition:
      apiVersion: autoscaling/v2
      kind: HorizontalPodAutoscaler
      metadata:
        name: worker-hpa
        namespace: production
      spec:
        scaleTargetRef:
          apiVersion: apps/v1
          kind: Deployment
          name: queue-worker
        minReplicas: 2
        maxReplicas: 30
        metrics:
          # Scale based on queue depth from Prometheus
          - type: Object
            object:
              metric:
                name: rabbitmq_queue_messages
              describedObject:
                apiVersion: v1
                kind: Service
                name: rabbitmq
              target:
                type: AverageValue
                averageValue: "50"
```

This scales the queue-worker Deployment based on the number of messages in RabbitMQ. When the average messages per pod exceeds 50, more workers are added to drain the queue faster.

## Summary

The Horizontal Pod Autoscaler is essential for production Kubernetes workloads that experience variable traffic. Managing HPAs through Ansible ensures your scaling policies are consistent, documented, and reviewable. Start with simple CPU-based scaling, add memory if your application is memory-bound, and graduate to custom metrics when resource utilization does not correlate with actual load. The behavior controls in autoscaling/v2 give you fine-grained control over how aggressively the HPA responds to changes, helping you balance responsiveness with stability.
