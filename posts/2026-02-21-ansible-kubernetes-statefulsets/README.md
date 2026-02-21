# How to Use Ansible to Manage Kubernetes StatefulSets

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Kubernetes, StatefulSets, Databases, DevOps

Description: A practical guide to managing Kubernetes StatefulSets with Ansible for stateful applications like databases, message queues, and distributed systems.

---

StatefulSets are Kubernetes workload objects designed for applications that need stable network identities, persistent storage, and ordered deployment. Think databases like PostgreSQL and MongoDB, message brokers like Kafka, and distributed systems like ZooKeeper. Unlike Deployments, which treat pods as interchangeable, StatefulSets give each pod a sticky identity that persists across rescheduling.

Managing StatefulSets through Ansible lets you define your stateful infrastructure as code, version it, and deploy it consistently. This guide covers creating StatefulSets, configuring persistent storage, handling ordered rollouts, and scaling operations.

## Prerequisites

- Ansible 2.12+ with `kubernetes.core` collection
- A Kubernetes cluster with a StorageClass configured
- A valid kubeconfig

```bash
ansible-galaxy collection install kubernetes.core
pip install kubernetes
```

## Understanding StatefulSet Guarantees

Before writing playbooks, know what StatefulSets give you:

- **Stable pod names**: `podname-0`, `podname-1`, `podname-2` (always sequential)
- **Stable network identity**: Each pod gets a DNS record via a headless Service
- **Ordered deployment**: Pods are created in order (0, 1, 2) and terminated in reverse
- **Persistent storage**: Each pod gets its own PersistentVolumeClaim that survives rescheduling

## Creating a Headless Service

StatefulSets require a headless Service (ClusterIP: None) for DNS-based pod discovery.

```yaml
# playbook: create-statefulset-postgres.yml
# Deploys a PostgreSQL StatefulSet with persistent storage
---
- name: Deploy PostgreSQL StatefulSet
  hosts: localhost
  connection: local
  gather_facts: false

  vars:
    app_name: postgres
    namespace: databases
    replicas: 3
    storage_size: 20Gi
    storage_class: standard
    postgres_version: "15"

  tasks:
    - name: Create the databases namespace
      kubernetes.core.k8s:
        state: present
        definition:
          apiVersion: v1
          kind: Namespace
          metadata:
            name: "{{ namespace }}"

    - name: Create headless service for StatefulSet DNS
      kubernetes.core.k8s:
        state: present
        definition:
          apiVersion: v1
          kind: Service
          metadata:
            name: "{{ app_name }}-headless"
            namespace: "{{ namespace }}"
            labels:
              app: "{{ app_name }}"
          spec:
            clusterIP: None
            selector:
              app: "{{ app_name }}"
            ports:
              - port: 5432
                targetPort: 5432
                name: postgres
```

With this headless service, each pod gets a DNS record like `postgres-0.postgres-headless.databases.svc.cluster.local`. Applications can connect to a specific replica by name.

## Creating the StatefulSet

Now for the main event. This StatefulSet runs three PostgreSQL replicas, each with its own persistent volume.

```yaml
    # Continued from the same playbook
    - name: Create PostgreSQL StatefulSet
      kubernetes.core.k8s:
        state: present
        definition:
          apiVersion: apps/v1
          kind: StatefulSet
          metadata:
            name: "{{ app_name }}"
            namespace: "{{ namespace }}"
          spec:
            serviceName: "{{ app_name }}-headless"
            replicas: "{{ replicas }}"
            selector:
              matchLabels:
                app: "{{ app_name }}"
            template:
              metadata:
                labels:
                  app: "{{ app_name }}"
              spec:
                containers:
                  - name: postgres
                    image: "postgres:{{ postgres_version }}"
                    ports:
                      - containerPort: 5432
                        name: postgres
                    env:
                      - name: POSTGRES_DB
                        value: "myapp"
                      - name: POSTGRES_USER
                        valueFrom:
                          secretKeyRef:
                            name: postgres-credentials
                            key: username
                      - name: POSTGRES_PASSWORD
                        valueFrom:
                          secretKeyRef:
                            name: postgres-credentials
                            key: password
                      - name: PGDATA
                        value: /var/lib/postgresql/data/pgdata
                    volumeMounts:
                      - name: data
                        mountPath: /var/lib/postgresql/data
                    resources:
                      requests:
                        memory: "512Mi"
                        cpu: "250m"
                      limits:
                        memory: "1Gi"
                        cpu: "1"
                    readinessProbe:
                      exec:
                        command:
                          - pg_isready
                          - -U
                          - postgres
                      initialDelaySeconds: 10
                      periodSeconds: 5
                    livenessProbe:
                      exec:
                        command:
                          - pg_isready
                          - -U
                          - postgres
                      initialDelaySeconds: 30
                      periodSeconds: 10
            volumeClaimTemplates:
              - metadata:
                  name: data
                spec:
                  accessModes:
                    - ReadWriteOnce
                  storageClassName: "{{ storage_class }}"
                  resources:
                    requests:
                      storage: "{{ storage_size }}"
```

The `volumeClaimTemplates` section is unique to StatefulSets. It tells Kubernetes to create a separate PersistentVolumeClaim for each pod. When `postgres-0` is created, it gets a PVC named `data-postgres-0`. When `postgres-1` comes up, it gets `data-postgres-1`. These PVCs persist even if you delete and recreate the StatefulSet.

## Deploying a Kafka Cluster

Kafka is another textbook StatefulSet use case. Each broker needs a unique ID and its own storage.

```yaml
# playbook: create-kafka-statefulset.yml
# Deploys a 3-broker Kafka cluster as a StatefulSet
---
- name: Deploy Kafka StatefulSet
  hosts: localhost
  connection: local
  gather_facts: false

  tasks:
    - name: Create Kafka headless service
      kubernetes.core.k8s:
        state: present
        definition:
          apiVersion: v1
          kind: Service
          metadata:
            name: kafka-headless
            namespace: messaging
          spec:
            clusterIP: None
            selector:
              app: kafka
            ports:
              - port: 9092
                name: broker
              - port: 9093
                name: controller

    - name: Create Kafka StatefulSet
      kubernetes.core.k8s:
        state: present
        definition:
          apiVersion: apps/v1
          kind: StatefulSet
          metadata:
            name: kafka
            namespace: messaging
          spec:
            serviceName: kafka-headless
            replicas: 3
            podManagementPolicy: Parallel
            selector:
              matchLabels:
                app: kafka
            template:
              metadata:
                labels:
                  app: kafka
              spec:
                containers:
                  - name: kafka
                    image: confluentinc/cp-kafka:7.5.0
                    ports:
                      - containerPort: 9092
                        name: broker
                    env:
                      - name: KAFKA_LISTENERS
                        value: "PLAINTEXT://:9092"
                      - name: KAFKA_LOG_DIRS
                        value: /var/lib/kafka/data
                    volumeMounts:
                      - name: kafka-data
                        mountPath: /var/lib/kafka/data
                    resources:
                      requests:
                        memory: "1Gi"
                        cpu: "500m"
                      limits:
                        memory: "2Gi"
                        cpu: "2"
            volumeClaimTemplates:
              - metadata:
                  name: kafka-data
                spec:
                  accessModes:
                    - ReadWriteOnce
                  storageClassName: fast-ssd
                  resources:
                    requests:
                      storage: 50Gi
```

Notice `podManagementPolicy: Parallel`. By default, StatefulSets create pods one at a time (OrderedReady). For Kafka, all brokers can start simultaneously since they discover each other through ZooKeeper or KRaft, so Parallel speeds up initial deployment.

## Scaling a StatefulSet

Scaling StatefulSets up is straightforward. Scaling down requires caution because you might lose data if the application does not handle member removal gracefully.

```yaml
# playbook: scale-statefulset.yml
# Scales a StatefulSet to the desired replica count
---
- name: Scale StatefulSet
  hosts: localhost
  connection: local
  gather_facts: false

  vars:
    target_replicas: 5
    statefulset_name: postgres
    namespace: databases

  tasks:
    - name: Get current replica count
      kubernetes.core.k8s_info:
        kind: StatefulSet
        name: "{{ statefulset_name }}"
        namespace: "{{ namespace }}"
      register: current_sts

    - name: Show current state
      ansible.builtin.debug:
        msg: "Current replicas: {{ current_sts.resources[0].spec.replicas }} -> Target: {{ target_replicas }}"

    - name: Scale the StatefulSet
      kubernetes.core.k8s:
        state: present
        definition:
          apiVersion: apps/v1
          kind: StatefulSet
          metadata:
            name: "{{ statefulset_name }}"
            namespace: "{{ namespace }}"
          spec:
            replicas: "{{ target_replicas }}"

    - name: Wait for all replicas to be ready
      kubernetes.core.k8s_info:
        kind: StatefulSet
        name: "{{ statefulset_name }}"
        namespace: "{{ namespace }}"
      register: sts_status
      until: >
        sts_status.resources[0].status.readyReplicas is defined and
        sts_status.resources[0].status.readyReplicas == target_replicas
      retries: 60
      delay: 10
```

## Configuring Update Strategies

StatefulSets support two update strategies. The default `RollingUpdate` updates pods in reverse order (highest ordinal first). You can also use `OnDelete`, which only updates pods when you manually delete them.

```yaml
# task: configure rolling update with partition for canary deployments
- name: Configure StatefulSet update strategy
  kubernetes.core.k8s:
    state: present
    definition:
      apiVersion: apps/v1
      kind: StatefulSet
      metadata:
        name: postgres
        namespace: databases
      spec:
        updateStrategy:
          type: RollingUpdate
          rollingUpdate:
            # Only update pods with ordinal >= 2
            # Pods 0 and 1 keep the old version (canary pattern)
            partition: 2
```

The `partition` field is powerful for canary testing. Setting it to 2 means only pods with an ordinal index of 2 or higher get the new version. Pods 0 and 1 stay on the old version. Once you verify the new version works on pod 2, lower the partition to 0 to roll out everywhere.

## Summary

StatefulSets are the right tool for any application that needs stable identity and persistent storage. Managing them through Ansible playbooks gives you version-controlled infrastructure definitions, repeatable deployments, and the ability to manage the full lifecycle from creation through scaling and updates. The key things to remember are: always pair a StatefulSet with a headless Service, use volumeClaimTemplates for per-pod storage, and be thoughtful about scaling down since data loss is a real risk if the application does not handle it gracefully.
