# How to Use Karmada for Multi-Cluster Workload Propagation and Failover

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Multi-Cluster, Karmada

Description: Learn how to deploy and configure Karmada for intelligent multi-cluster workload distribution with automatic failover, disaster recovery, and cross-cluster scheduling.

---

Karmada (Kubernetes Armada) is a CNCF project for multi-cluster management that propagates workloads across clusters with sophisticated scheduling policies. Unlike basic federation, Karmada provides intelligent placement decisions based on cluster capacity, resource availability, and custom constraints while supporting automatic failover when clusters fail.

## Understanding Karmada Architecture

Karmada consists of several components:

- **Karmada Control Plane**: Runs in the host cluster, manages multi-cluster coordination
- **Karmada API Server**: Exposes Kubernetes-like API for multi-cluster resources
- **Karmada Scheduler**: Decides which clusters receive workloads
- **Karmada Controller Manager**: Propagates resources to member clusters
- **Karmada Agent**: Runs in member clusters to sync resource status

## Installing Karmada

Download karmadactl:

```bash
curl -s https://raw.githubusercontent.com/karmada-io/karmada/master/hack/install-cli.sh | bash
```

Install Karmada in the host cluster:

```bash
# Initialize Karmada
karmadactl init --kubeconfig ~/.kube/config
```

This deploys Karmada control plane components in the karmada-system namespace.

Verify installation:

```bash
kubectl get pods -n karmada-system
```

You should see:

```
karmada-aggregated-apiserver
karmada-controller-manager
karmada-scheduler
karmada-webhook
etcd
```

## Joining Member Clusters

Register clusters with Karmada:

```bash
# Join cluster-1
karmadactl join cluster-1 \
  --cluster-kubeconfig=$HOME/.kube/config \
  --cluster-context=cluster-1

# Join cluster-2
karmadactl join cluster-2 \
  --cluster-kubeconfig=$HOME/.kube/config \
  --cluster-context=cluster-2

# Join cluster-3
karmadactl join cluster-3 \
  --cluster-kubeconfig=$HOME/.kube/config \
  --cluster-context=cluster-3
```

Verify member clusters:

```bash
kubectl get clusters
```

Output:

```
NAME        VERSION   MODE   READY
cluster-1   v1.28.0   Push   True
cluster-2   v1.28.0   Push   True
cluster-3   v1.28.0   Push   True
```

## Creating Multi-Cluster Workloads

Deploy a simple application across clusters using PropagationPolicy:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: webapp
  namespace: default
  labels:
    app: webapp
spec:
  replicas: 6
  selector:
    matchLabels:
      app: webapp
  template:
    metadata:
      labels:
        app: webapp
    spec:
      containers:
      - name: webapp
        image: webapp:v2.1
        ports:
        - containerPort: 8080
---
apiVersion: policy.karmada.io/v1alpha1
kind: PropagationPolicy
metadata:
  name: webapp-propagation
  namespace: default
spec:
  resourceSelectors:
  - apiVersion: apps/v1
    kind: Deployment
    name: webapp
  placement:
    clusterAffinity:
      clusterNames:
      - cluster-1
      - cluster-2
      - cluster-3
    replicaScheduling:
      replicaDivisionPreference: Weighted
      replicaSchedulingType: Divided
      weightPreference:
        staticWeightList:
        - targetCluster:
            clusterNames:
            - cluster-1
          weight: 3
        - targetCluster:
            clusterNames:
            - cluster-2
          weight: 2
        - targetCluster:
            clusterNames:
            - cluster-3
          weight: 1
```

Apply:

```bash
kubectl apply -f webapp.yaml
```

Karmada divides the 6 replicas across clusters:
- cluster-1: 3 replicas (weight 3/6)
- cluster-2: 2 replicas (weight 2/6)
- cluster-3: 1 replica (weight 1/6)

Verify distribution:

```bash
kubectl get deployment webapp --context cluster-1  # 3 replicas
kubectl get deployment webapp --context cluster-2  # 2 replicas
kubectl get deployment webapp --context cluster-3  # 1 replica
```

## Implementing Dynamic Replica Scheduling

Use dynamic scheduling to let Karmada decide replica distribution:

```yaml
apiVersion: policy.karmada.io/v1alpha1
kind: PropagationPolicy
metadata:
  name: dynamic-webapp
  namespace: default
spec:
  resourceSelectors:
  - apiVersion: apps/v1
    kind: Deployment
    name: webapp
  placement:
    clusterAffinity:
      clusterNames:
      - cluster-1
      - cluster-2
      - cluster-3
    replicaScheduling:
      replicaSchedulingType: Divided
      replicaDivisionPreference: Aggregated  # Prefer filling clusters completely
```

With Aggregated, Karmada fills cluster-1 completely before using cluster-2.

## Configuring Cluster Affinity

Target clusters based on labels:

```bash
# Label clusters
kubectl label cluster cluster-1 region=us-east zone=a
kubectl label cluster cluster-2 region=us-east zone=b
kubectl label cluster cluster-3 region=eu-west zone=a
```

Use label selectors in PropagationPolicy:

```yaml
apiVersion: policy.karmada.io/v1alpha1
kind: PropagationPolicy
metadata:
  name: regional-webapp
  namespace: default
spec:
  resourceSelectors:
  - apiVersion: apps/v1
    kind: Deployment
    name: webapp
  placement:
    clusterAffinity:
      labelSelector:
        matchLabels:
          region: us-east
    replicaScheduling:
      replicaSchedulingType: Divided
```

This deploys only to cluster-1 and cluster-2 (both in us-east).

## Implementing Failover Policies

Configure automatic failover when clusters fail:

```yaml
apiVersion: policy.karmada.io/v1alpha1
kind: PropagationPolicy
metadata:
  name: ha-webapp
  namespace: default
spec:
  resourceSelectors:
  - apiVersion: apps/v1
    kind: Deployment
    name: webapp
  placement:
    clusterAffinity:
      clusterNames:
      - cluster-1
      - cluster-2
      - cluster-3
    replicaScheduling:
      replicaSchedulingType: Divided
  failover:
    application:
      decisionConditions:
        tolerationSeconds: 300  # Wait 5 minutes before failover
      purgeMode: Graciously  # Gracefully drain before removing
      gracePeriodSeconds: 600  # 10 minute grace period
```

When a cluster becomes unhealthy, Karmada waits 5 minutes, then redistributes workloads to healthy clusters with a 10-minute grace period.

Test failover:

```bash
# Mark cluster-1 as unhealthy
kubectl patch cluster cluster-1 --type merge -p '{"status":{"conditions":[{"type":"Ready","status":"False"}]}}'

# Watch workloads migrate
kubectl get deployment webapp --context cluster-2 -w
kubectl get deployment webapp --context cluster-3 -w
```

## Using Override Policies

Customize resources for specific clusters:

```yaml
apiVersion: policy.karmada.io/v1alpha1
kind: OverridePolicy
metadata:
  name: webapp-overrides
  namespace: default
spec:
  resourceSelectors:
  - apiVersion: apps/v1
    kind: Deployment
    name: webapp
  overrideRules:
  # cluster-1 uses more resources
  - targetCluster:
      clusterNames:
      - cluster-1
    overriders:
      plaintext:
      - path: /spec/template/spec/containers/0/resources/requests/cpu
        operator: replace
        value: "500m"
      - path: /spec/template/spec/containers/0/resources/requests/memory
        operator: replace
        value: "512Mi"
  # cluster-3 uses fewer resources
  - targetCluster:
      clusterNames:
      - cluster-3
    overriders:
      plaintext:
      - path: /spec/template/spec/containers/0/resources/requests/cpu
        operator: replace
        value: "100m"
      - path: /spec/template/spec/containers/0/resources/requests/memory
        operator: replace
        value: "128Mi"
```

Apply:

```bash
kubectl apply -f override-policy.yaml
```

Each cluster gets appropriate resource requests based on its capacity.

## Implementing Multi-Cluster Services

Propagate services with Karmada:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: webapp-service
  namespace: default
spec:
  selector:
    app: webapp
  ports:
  - port: 80
    targetPort: 8080
  type: LoadBalancer
---
apiVersion: policy.karmada.io/v1alpha1
kind: PropagationPolicy
metadata:
  name: webapp-service-propagation
  namespace: default
spec:
  resourceSelectors:
  - apiVersion: v1
    kind: Service
    name: webapp-service
  placement:
    clusterAffinity:
      clusterNames:
      - cluster-1
      - cluster-2
      - cluster-3
```

Each cluster gets a LoadBalancer service exposing local webapp pods.

For global load balancing, use Karmada's MultiClusterService:

```yaml
apiVersion: networking.karmada.io/v1alpha1
kind: MultiClusterService
metadata:
  name: webapp-global
  namespace: default
spec:
  types:
  - LoadBalancer
  consumerClusters:
  - name: cluster-1
  - name: cluster-2
  - name: cluster-3
  providerClusters:
  - name: cluster-1
  - name: cluster-2
  - name: cluster-3
```

This creates a global service that load-balances across all clusters.

## Implementing Resource Quotas

Limit how many resources Karmada can use in each cluster:

```yaml
apiVersion: policy.karmada.io/v1alpha1
kind: ResourceQuota
metadata:
  name: cluster-quotas
  namespace: karmada-system
spec:
  staticAssignments:
  - clusterName: cluster-1
    hard:
      cpu: "50"
      memory: "100Gi"
      pods: "500"
  - clusterName: cluster-2
    hard:
      cpu: "30"
      memory: "60Gi"
      pods: "300"
  - clusterName: cluster-3
    hard:
      cpu: "20"
      memory: "40Gi"
      pods: "200"
```

Karmada respects these quotas when scheduling workloads.

## Monitoring Karmada

Check resource binding status:

```bash
kubectl get resourcebindings -n default
```

Output shows which clusters received which resources:

```
NAME                  READY   STATUS
webapp-deployment     3/3     Success
webapp-service        3/3     Success
```

View detailed binding:

```bash
kubectl describe resourcebinding webapp-deployment -n default
```

Monitor work objects (representing propagated resources):

```bash
kubectl get works -n karmada-es-cluster-1
```

Check cluster health:

```bash
kubectl get clusters -o wide
```

## Implementing Disaster Recovery

Use Karmada for DR by maintaining standby clusters:

```yaml
apiVersion: policy.karmada.io/v1alpha1
kind: PropagationPolicy
metadata:
  name: dr-policy
  namespace: critical-services
spec:
  resourceSelectors:
  - apiVersion: apps/v1
    kind: Deployment
    namespace: critical-services
  placement:
    clusterAffinity:
      labelSelector:
        matchLabels:
          tier: production
    replicaScheduling:
      replicaSchedulingType: Duplicated  # Full copy in each cluster
  failover:
    application:
      decisionConditions:
        tolerationSeconds: 60
      purgeMode: Immediately
```

With Duplicated scheduling, all clusters run the full replica count, providing instant failover.

## Best Practices

**Start with weighted scheduling**: Begin with manual weight distribution before using dynamic scheduling to understand cluster capacity.

**Use cluster labels extensively**: Tag clusters with meaningful labels (region, environment, tier, capacity) for flexible scheduling.

**Test failover regularly**: Simulate cluster failures to verify automatic failover works as expected.

**Monitor resource binding status**: Alert when resources fail to propagate:

```promql
karmada_resourcebinding_status{status!="Success"} > 0
```

**Implement gradual rollout**: Use multiple PropagationPolicies to roll out changes progressively:

```yaml
# Phase 1: staging clusters
clusterAffinity:
  labelSelector:
    matchLabels:
      environment: staging

# Phase 2: production canary
clusterAffinity:
  labelSelector:
    matchExpressions:
    - key: environment
      operator: In
      values: [production]
    - key: canary
      operator: Exists

# Phase 3: all production
clusterAffinity:
  labelSelector:
    matchLabels:
      environment: production
```

**Use OverridePolicy judiciously**: Too many overrides make configurations hard to understand. Prefer cluster-specific values files for Helm charts.

**Plan for Karmada control plane failure**: The control plane is a single point of failure. Run it with high availability:

```bash
karmadactl init --karmada-apiserver-replicas 3 --etcd-replicas 3
```

**Document propagation policies**: Add annotations explaining why specific policies exist and which teams own them.

Karmada provides sophisticated multi-cluster workload management with intelligent scheduling, automatic failover, and flexible placement policies. By treating multiple clusters as a unified resource pool with smart distribution logic, it enables true multi-cluster applications with high availability and efficient resource utilization.
