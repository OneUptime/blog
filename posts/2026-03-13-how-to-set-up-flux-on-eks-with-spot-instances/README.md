# How to Set Up Flux on EKS with Spot Instances

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, AWS, EKS, Spot Instances, Cost Optimization, Autoscaling

Description: Learn how to set up Flux on Amazon EKS with EC2 Spot Instances for significant cost savings while maintaining workload reliability.

---

EC2 Spot Instances offer up to 90% cost savings compared to On-Demand pricing, making them an attractive option for Kubernetes workloads on EKS. However, Spot Instances can be interrupted with a two-minute warning, so your cluster needs to handle these interruptions gracefully. This guide covers setting up Flux on EKS with Spot Instances, including interruption handling, node selection strategies, and workload placement policies.

## Prerequisites

- AWS CLI configured with appropriate permissions
- eksctl installed (version 0.170 or later)
- Flux CLI installed
- kubectl installed
- A GitHub personal access token with repo permissions

## Step 1: Create an EKS Cluster with Spot Node Groups

Design your cluster with a mix of On-Demand nodes for critical system components and Spot nodes for workloads.

```yaml
# cluster-config.yaml
apiVersion: eksctl.io/v1alpha5
kind: ClusterConfig

metadata:
  name: my-spot-cluster
  region: us-west-2
  version: "1.29"

managedNodeGroups:
  - name: on-demand-system
    instanceType: m6i.large
    desiredCapacity: 2
    minSize: 2
    maxSize: 3
    labels:
      role: system
      capacity-type: on-demand
    taints:
      - key: CriticalAddonsOnly
        value: "true"
        effect: PreferNoSchedule

  - name: spot-workloads
    instanceTypes:
      - m6i.xlarge
      - m6a.xlarge
      - m5.xlarge
      - m5a.xlarge
      - m7i.xlarge
      - c6i.xlarge
      - c6a.xlarge
      - r6i.xlarge
    desiredCapacity: 3
    minSize: 1
    maxSize: 20
    spot: true
    labels:
      role: workloads
      capacity-type: spot
    tags:
      k8s.io/cluster-autoscaler/node-template/label/capacity-type: spot

  - name: spot-workloads-2
    instanceTypes:
      - m6i.2xlarge
      - m6a.2xlarge
      - m5.2xlarge
      - m5a.2xlarge
      - c6i.2xlarge
      - r6i.2xlarge
    desiredCapacity: 2
    minSize: 0
    maxSize: 10
    spot: true
    labels:
      role: workloads
      capacity-type: spot
      size: large
    tags:
      k8s.io/cluster-autoscaler/node-template/label/capacity-type: spot
```

Create the cluster:

```bash
eksctl create cluster -f cluster-config.yaml
```

The key strategy for Spot Instance reliability is instance diversification. By specifying multiple instance types per node group, AWS can select from a wider pool, reducing the chance of interruption.

## Step 2: Bootstrap Flux

Install Flux on the cluster, ensuring system components land on On-Demand nodes.

```bash
export GITHUB_TOKEN=<your-github-token>
export GITHUB_USER=<your-github-username>

flux bootstrap github \
  --owner="${GITHUB_USER}" \
  --repository=fleet-infra \
  --branch=main \
  --path=clusters/my-spot-cluster \
  --personal
```

## Step 3: Pin Flux Controllers to On-Demand Nodes

Ensure Flux controllers run on stable On-Demand nodes by patching the Flux system Kustomization.

```yaml
# clusters/my-spot-cluster/flux-system/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - gotk-components.yaml
  - gotk-sync.yaml
patches:
  - target:
      kind: Deployment
      namespace: flux-system
    patch: |
      - op: add
        path: /spec/template/spec/nodeSelector
        value:
          role: system
      - op: add
        path: /spec/template/spec/tolerations
        value:
          - key: CriticalAddonsOnly
            operator: Exists
            effect: PreferNoSchedule
```

## Step 4: Deploy the AWS Node Termination Handler

The AWS Node Termination Handler ensures pods are gracefully drained from Spot nodes before interruption. Deploy it with Flux.

```yaml
# clusters/my-spot-cluster/nth/helmrepository.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: eks-charts
  namespace: flux-system
spec:
  interval: 24h
  url: https://aws.github.io/eks-charts
```

```yaml
# clusters/my-spot-cluster/nth/helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: aws-node-termination-handler
  namespace: kube-system
spec:
  interval: 1h
  chart:
    spec:
      chart: aws-node-termination-handler
      version: "0.21.*"
      sourceRef:
        kind: HelmRepository
        name: eks-charts
        namespace: flux-system
      interval: 24h
  values:
    enableSpotInterruptionDraining: true
    enableRebalanceMonitoring: true
    enableScheduledEventDraining: true
    enableRebalanceDraining: true
    nodeSelector:
      role: system
    tolerations:
      - key: CriticalAddonsOnly
        operator: Exists
        effect: PreferNoSchedule
    resources:
      requests:
        cpu: 50m
        memory: 64Mi
```

## Step 5: Configure Pod Disruption Budgets

Protect your workloads from excessive interruptions with Pod Disruption Budgets.

```yaml
# clusters/my-spot-cluster/apps/pdb.yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: my-app-pdb
  namespace: default
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app: my-app
```

## Step 6: Deploy Workloads with Spot-Aware Configuration

Configure your applications to handle Spot interruptions gracefully. Key practices include:

```yaml
# clusters/my-spot-cluster/apps/spot-workload.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  namespace: default
spec:
  replicas: 4
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
    spec:
      terminationGracePeriodSeconds: 120
      topologySpreadConstraints:
        - maxSkew: 1
          topologyKey: topology.kubernetes.io/zone
          whenUnsatisfiable: DoNotSchedule
          labelSelector:
            matchLabels:
              app: my-app
        - maxSkew: 1
          topologyKey: node.kubernetes.io/instance-type
          whenUnsatisfiable: ScheduleAnyway
          labelSelector:
            matchLabels:
              app: my-app
      affinity:
        nodeAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
            - weight: 90
              preference:
                matchExpressions:
                  - key: capacity-type
                    operator: In
                    values:
                      - spot
      containers:
        - name: my-app
          image: my-registry/my-app:latest
          ports:
            - containerPort: 8080
          lifecycle:
            preStop:
              exec:
                command: ["/bin/sh", "-c", "sleep 10"]
          resources:
            requests:
              cpu: 250m
              memory: 256Mi
```

Key patterns for Spot resilience:

- **Topology spread**: Distribute pods across zones and instance types
- **Graceful shutdown**: Use `terminationGracePeriodSeconds` and `preStop` hooks
- **Replicas**: Run enough replicas to survive losing a node

## Step 7: Configure Cluster Autoscaler for Spot

Set up the Cluster Autoscaler with Spot-aware settings:

```yaml
# clusters/my-spot-cluster/autoscaler/helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: cluster-autoscaler
  namespace: kube-system
spec:
  interval: 1h
  chart:
    spec:
      chart: cluster-autoscaler
      version: "9.37.*"
      sourceRef:
        kind: HelmRepository
        name: autoscaler
        namespace: flux-system
      interval: 24h
  values:
    autoDiscovery:
      clusterName: my-spot-cluster
    awsRegion: us-west-2
    extraArgs:
      balance-similar-node-groups: true
      skip-nodes-with-system-pods: false
      expander: least-waste
      scale-down-utilization-threshold: "0.5"
    nodeSelector:
      role: system
    tolerations:
      - key: CriticalAddonsOnly
        operator: Exists
        effect: PreferNoSchedule
```

## Step 8: Set Up Spot Instance Monitoring

Deploy a ConfigMap with Prometheus rules to monitor Spot interruption events:

```yaml
# clusters/my-spot-cluster/monitoring/spot-alerts.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: spot-alerting-rules
  namespace: monitoring
  labels:
    prometheus: kube-prometheus
data:
  spot-rules.yaml: |
    groups:
      - name: spot-instances
        rules:
          - alert: SpotInterruptionNotice
            expr: kube_node_labels{label_capacity_type="spot"} * on(node) kube_node_spec_unschedulable == 1
            for: 0m
            labels:
              severity: warning
            annotations:
              summary: "Spot instance {{ $labels.node }} is being interrupted"
```

## Step 9: Commit and Push

Push all configurations to Git:

```bash
git add -A
git commit -m "Set up Flux on EKS with Spot Instances"
git push origin main
```

## Step 10: Verify the Setup

Check that everything is working:

```bash
# Verify Flux on On-Demand nodes
kubectl get pods -n flux-system -o wide

# Verify Node Termination Handler
kubectl get pods -n kube-system -l app.kubernetes.io/name=aws-node-termination-handler

# Check node capacity types
kubectl get nodes -L capacity-type

# Verify workloads are spread across nodes
kubectl get pods -o wide
```

## Cost Optimization Tips

To maximize savings with Spot Instances on EKS:

1. **Diversify instance types**: Use at least 8-10 different instance types per node group
2. **Use multiple availability zones**: Spread across 3 AZs for better capacity
3. **Set appropriate instance sizes**: Match your workload requirements to avoid waste
4. **Use allocation strategy**: Let AWS choose the optimal instance from your list
5. **Monitor savings**: Track On-Demand vs. Spot pricing through AWS Cost Explorer

## Troubleshooting

If pods are being frequently interrupted:

```bash
# Check recent interruption events
kubectl get events --field-selector reason=EvictionByNodeTerminationHandler

# View NTH logs
kubectl logs -n kube-system -l app.kubernetes.io/name=aws-node-termination-handler --tail=50

# Check node conditions
kubectl get nodes -o custom-columns=NAME:.metadata.name,STATUS:.status.conditions[-1].type,CAPACITY:.metadata.labels.capacity-type
```

If interruptions are too frequent, add more instance type diversity to your node groups or increase the proportion of On-Demand capacity.

## Conclusion

Running Flux on EKS with Spot Instances provides significant cost savings while maintaining a reliable, GitOps-driven platform. The key to success is instance diversification, proper interruption handling with the Node Termination Handler, and workload design patterns like topology spread and Pod Disruption Budgets. Flux ensures all of this infrastructure configuration is version-controlled and automatically reconciled, making it easy to maintain consistent Spot Instance policies across your clusters.
