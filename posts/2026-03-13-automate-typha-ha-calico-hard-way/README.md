# How to Automate Typha High Availability in a Calico Hard Way Installation

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Typha, Kubernetes, Networking, High Availability, Automation, Hard Way

Description: A guide to automating Typha HA including automatic replica scaling based on node count and automated failover testing in a manually installed Calico cluster.

---

## Introduction

Automating Typha HA in a hard way installation addresses two operational concerns: keeping replica count in sync with cluster growth (so that a cluster that grows from 200 to 600 nodes automatically gets the right number of Typha replicas), and running automated failover tests to confirm HA is functioning. Both can be implemented with Kubernetes-native tooling.

## Automatic Replica Scaling Based on Node Count

### Using a Kubernetes CronJob

```bash
kubectl apply -f - <<EOF
apiVersion: v1
kind: ServiceAccount
metadata:
  name: typha-autoscaler
  namespace: calico-system
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: typha-autoscaler
rules:
- apiGroups: [""]
  resources: [nodes]
  verbs: [list]
- apiGroups: [apps]
  resources: [deployments/scale, deployments]
  verbs: [get, patch, update]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: typha-autoscaler
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: typha-autoscaler
subjects:
- kind: ServiceAccount
  name: typha-autoscaler
  namespace: calico-system
---
apiVersion: batch/v1
kind: CronJob
metadata:
  name: typha-autoscaler
  namespace: calico-system
spec:
  schedule: "*/30 * * * *"  # Every 30 minutes
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: typha-autoscaler
          containers:
          - name: autoscaler
            image: bitnami/kubectl:latest
            command:
            - bash
            - -c
            - |
              NODE_COUNT=$(kubectl get nodes --no-headers | wc -l)
              if [ "$NODE_COUNT" -lt 50 ]; then
                REPLICAS=0
              elif [ "$NODE_COUNT" -lt 200 ]; then
                REPLICAS=1
              elif [ "$NODE_COUNT" -lt 500 ]; then
                REPLICAS=2
              else
                REPLICAS=3
              fi
              CURRENT=$(kubectl get deployment calico-typha -n calico-system -o jsonpath='{.spec.replicas}')
              if [ "$CURRENT" -ne "$REPLICAS" ]; then
                echo "Scaling Typha from $CURRENT to $REPLICAS replicas for $NODE_COUNT nodes"
                kubectl scale deployment calico-typha -n calico-system --replicas=$REPLICAS
              else
                echo "Typha at correct replica count: $REPLICAS"
              fi
          restartPolicy: OnFailure
EOF
```

## Horizontal Pod Autoscaler Based on Custom Metrics

For clusters with dynamic workloads, use HPA with a custom metric for connection count per replica.

```bash
kubectl apply -f - <<EOF
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: calico-typha-hpa
  namespace: calico-system
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: calico-typha
  minReplicas: 1
  maxReplicas: 5
  metrics:
  - type: Pods
    pods:
      metric:
        name: typha_connections_active
      target:
        type: AverageValue
        averageValue: "200"
EOF
```

This scales Typha up when the average connections per replica exceeds 200.

## Automated Failover Test CronJob

Run a weekly automated test to confirm Typha HA is functioning.

```bash
kubectl apply -f - <<EOF
apiVersion: batch/v1
kind: CronJob
metadata:
  name: typha-ha-test
  namespace: calico-system
spec:
  schedule: "0 2 * * 0"  # Sundays at 2am
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: typha-autoscaler
          containers:
          - name: ha-test
            image: bitnami/kubectl:latest
            command:
            - bash
            - -c
            - |
              REPLICAS=$(kubectl get deployment calico-typha -n calico-system -o jsonpath='{.spec.replicas}')
              if [ "$REPLICAS" -lt 2 ]; then
                echo "SKIP: HA test requires at least 2 Typha replicas"
                exit 0
              fi

              # Record baseline connection count
              BEFORE=$(kubectl get pods -n calico-system -l app=calico-typha -o name | \
                xargs -I{} kubectl exec -n calico-system {} -- \
                wget -qO- http://localhost:9093/metrics | grep typha_connections_active | \
                awk '{sum += $2} END {print sum}')

              # Delete one Typha pod
              kubectl delete pod -n calico-system \
                $(kubectl get pods -n calico-system -l app=calico-typha -o name | head -1 | sed 's|pod/||')

              sleep 60

              # Check connections recovered
              AFTER=$(kubectl get pods -n calico-system -l app=calico-typha -o name | \
                xargs -I{} kubectl exec -n calico-system {} -- \
                wget -qO- http://localhost:9093/metrics | grep typha_connections_active | \
                awk '{sum += $2} END {print sum}')

              if [ "$AFTER" -ge "$((BEFORE * 9 / 10))" ]; then
                echo "HA PASS: Connections recovered to $AFTER (baseline: $BEFORE)"
              else
                echo "HA FAIL: Only $AFTER connections after failover (baseline: $BEFORE)"
                exit 1
              fi
          restartPolicy: OnFailure
EOF
```

## Ansible Playbook for HA Deployment

```yaml
# typha-ha-deploy.yml
---
- name: Configure Typha HA
  hosts: control_plane
  tasks:
    - name: Get node count
      command: kubectl get nodes --no-headers | wc -l
      register: node_count

    - name: Calculate replica count
      set_fact:
        typha_replicas: >-
          {{ 1 if (node_count.stdout | int) < 200 else
             2 if (node_count.stdout | int) < 500 else 3 }}

    - name: Scale Typha
      kubernetes.core.k8s_scale:
        namespace: calico-system
        name: calico-typha
        kind: Deployment
        replicas: "{{ typha_replicas }}"

    - name: Apply PodDisruptionBudget
      kubernetes.core.k8s:
        state: present
        definition:
          apiVersion: policy/v1
          kind: PodDisruptionBudget
          metadata:
            name: calico-typha-pdb
            namespace: calico-system
          spec:
            minAvailable: 1
            selector:
              matchLabels:
                app: calico-typha
```

## Conclusion

Automating Typha HA involves automatic replica scaling (via CronJob or HPA) to keep replica count aligned with cluster size, automated failover testing to confirm HA properties are maintained over time, and idempotent Ansible playbooks for infrastructure-as-code management. These automations eliminate the risk of a cluster outgrowing its Typha configuration and provide continuous validation that the HA setup functions correctly.
