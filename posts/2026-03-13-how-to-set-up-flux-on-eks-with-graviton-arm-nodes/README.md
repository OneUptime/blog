# How to Set Up Flux on EKS with Graviton ARM Nodes

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, AWS, EKS, Graviton, ARM, Multi-Architecture

Description: Learn how to set up Flux on Amazon EKS with AWS Graviton ARM-based nodes for improved cost efficiency and performance.

---

AWS Graviton processors are ARM-based chips designed by AWS that offer up to 40% better price-performance compared to x86 instances. Running Flux on EKS with Graviton nodes lets you take advantage of this cost efficiency while maintaining a GitOps-driven workflow. This guide covers creating an EKS cluster with Graviton nodes, handling multi-architecture concerns, and bootstrapping Flux.

## Prerequisites

- AWS CLI configured with appropriate permissions
- eksctl installed (version 0.170 or later)
- Flux CLI installed
- kubectl installed
- A GitHub personal access token with repo permissions

## Step 1: Create an EKS Cluster with Graviton Node Groups

Create a cluster configuration that includes both Graviton (ARM) and optionally x86 node groups for a mixed-architecture setup.

```yaml
# cluster-config.yaml
apiVersion: eksctl.io/v1alpha5
kind: ClusterConfig

metadata:
  name: my-graviton-cluster
  region: us-west-2
  version: "1.29"

managedNodeGroups:
  - name: graviton-system
    instanceType: m7g.large
    desiredCapacity: 2
    minSize: 2
    maxSize: 4
    labels:
      role: system
      arch: arm64
    tags:
      nodegroup-type: graviton-system

  - name: graviton-workloads
    instanceType: m7g.xlarge
    desiredCapacity: 3
    minSize: 1
    maxSize: 10
    labels:
      role: workloads
      arch: arm64
    tags:
      nodegroup-type: graviton-workloads

  - name: x86-workloads
    instanceType: m6i.xlarge
    desiredCapacity: 1
    minSize: 0
    maxSize: 5
    labels:
      role: workloads
      arch: amd64
    tags:
      nodegroup-type: x86-workloads
```

Create the cluster:

```bash
eksctl create cluster -f cluster-config.yaml
```

## Step 2: Verify Graviton Nodes

Confirm that nodes are running on the ARM64 architecture:

```bash
kubectl get nodes -L kubernetes.io/arch

kubectl get nodes -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.metadata.labels.kubernetes\.io/arch}{"\n"}{end}'
```

You should see `arm64` for Graviton nodes and `amd64` for x86 nodes.

## Step 3: Bootstrap Flux

Flux controller images support multi-architecture and run natively on ARM64 nodes. Bootstrap Flux as usual:

```bash
export GITHUB_TOKEN=<your-github-token>
export GITHUB_USER=<your-github-username>

flux bootstrap github \
  --owner="${GITHUB_USER}" \
  --repository=fleet-infra \
  --branch=main \
  --path=clusters/my-graviton-cluster \
  --personal
```

## Step 4: Verify Flux Runs on ARM Nodes

Check that Flux controllers are scheduled on Graviton nodes:

```bash
flux check

kubectl get pods -n flux-system -o wide
```

Flux images are multi-arch, so they will run on ARM64 nodes without any extra configuration.

## Step 5: Configure Node Affinity for Workloads

For workloads that support ARM64, configure them to prefer or require Graviton nodes. Create a Kustomization overlay for your applications.

```yaml
# clusters/my-graviton-cluster/apps/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../../base/apps
patches:
  - target:
      kind: Deployment
    patch: |
      - op: add
        path: /spec/template/spec/affinity
        value:
          nodeAffinity:
            preferredDuringSchedulingIgnoredDuringExecution:
              - weight: 100
                preference:
                  matchExpressions:
                    - key: kubernetes.io/arch
                      operator: In
                      values:
                        - arm64
```

## Step 6: Handle Multi-Architecture Container Images

When deploying applications on mixed-architecture clusters, ensure your container images support both architectures. Use multi-arch image references in your deployments.

```yaml
# clusters/my-graviton-cluster/apps/sample-app.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  namespace: default
spec:
  replicas: 3
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
    spec:
      affinity:
        nodeAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            nodeSelectorTerms:
              - matchExpressions:
                  - key: kubernetes.io/arch
                    operator: In
                    values:
                      - arm64
      containers:
        - name: my-app
          image: my-registry/my-app:latest
          ports:
            - containerPort: 8080
          resources:
            requests:
              cpu: 250m
              memory: 256Mi
```

## Step 7: Build Multi-Architecture Images with Flux Image Automation

Set up Flux Image Automation to track and deploy multi-arch images. First, configure the image repository:

```yaml
# clusters/my-graviton-cluster/image-automation/image-repository.yaml
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImageRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  image: my-registry/my-app
  interval: 5m
```

Create an image policy to select the latest semver tag:

```yaml
# clusters/my-graviton-cluster/image-automation/image-policy.yaml
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImagePolicy
metadata:
  name: my-app
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: my-app
  policy:
    semver:
      range: ">=1.0.0"
```

## Step 8: Configure Topology-Aware Scheduling

Spread workloads across availability zones for high availability on Graviton nodes:

```yaml
# clusters/my-graviton-cluster/apps/ha-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ha-app
  namespace: default
spec:
  replicas: 6
  selector:
    matchLabels:
      app: ha-app
  template:
    metadata:
      labels:
        app: ha-app
    spec:
      topologySpreadConstraints:
        - maxSkew: 1
          topologyKey: topology.kubernetes.io/zone
          whenUnsatisfiable: DoNotSchedule
          labelSelector:
            matchLabels:
              app: ha-app
      affinity:
        nodeAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
            - weight: 100
              preference:
                matchExpressions:
                  - key: kubernetes.io/arch
                    operator: In
                    values:
                      - arm64
      containers:
        - name: ha-app
          image: nginx:1.25
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
```

## Step 9: Deploy Monitoring on ARM Nodes

Deploy Prometheus and Grafana on Graviton nodes. Both support ARM64 natively.

```yaml
# clusters/my-graviton-cluster/monitoring/helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: kube-prometheus-stack
  namespace: monitoring
spec:
  interval: 1h
  chart:
    spec:
      chart: kube-prometheus-stack
      version: "56.*"
      sourceRef:
        kind: HelmRepository
        name: prometheus-community
        namespace: flux-system
      interval: 24h
  values:
    prometheus:
      prometheusSpec:
        nodeSelector:
          kubernetes.io/arch: arm64
    grafana:
      nodeSelector:
        kubernetes.io/arch: arm64
    alertmanager:
      alertmanagerSpec:
        nodeSelector:
          kubernetes.io/arch: arm64
```

## Step 10: Commit and Push

Push all configurations to Git:

```bash
git add -A
git commit -m "Set up Flux on EKS with Graviton ARM nodes"
git push origin main
```

## Cost Comparison

Graviton instances provide significant savings. For reference, typical pricing differences in us-west-2:

| Instance Type | Architecture | vCPUs | Memory | Relative Cost |
|---------------|-------------|-------|--------|---------------|
| m6i.xlarge    | x86 (Intel) | 4     | 16 GiB | Baseline      |
| m7g.xlarge    | ARM (Graviton3) | 4 | 16 GiB | ~20% less     |
| m7g.xlarge    | ARM (Spot)  | 4     | 16 GiB | ~60-70% less  |

## Troubleshooting

If pods fail to start on Graviton nodes:

```bash
# Check for architecture-related image pull errors
kubectl describe pod <pod-name>

# Verify the image supports arm64
docker manifest inspect <image>:<tag> | grep architecture

# Check node taints
kubectl get nodes -o custom-columns=NAME:.metadata.name,TAINTS:.spec.taints
```

Common issues include container images that only support amd64, Helm charts with hardcoded x86 image references, and init containers that lack ARM64 support.

## Conclusion

Running Flux on EKS with Graviton ARM nodes provides a cost-efficient, GitOps-managed Kubernetes platform. Flux controllers run natively on ARM64, and the multi-architecture support across the container ecosystem means most workloads can run on Graviton without modification. The combination of Graviton's price-performance advantage and Flux's declarative management model makes this setup well-suited for organizations looking to optimize their EKS infrastructure costs while maintaining operational consistency.
