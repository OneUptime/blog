# How to Deploy Ray Cluster on Kubernetes with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, Ray, KubeRay, Distributed Computing, Machine Learning, HelmRelease

Description: Learn how to deploy Ray distributed computing cluster using the KubeRay operator on Kubernetes managed by Flux CD.

---

## Introduction

Ray is a distributed computing framework that simplifies scaling Python workloads across multiple machines, with native support for distributed training, hyperparameter tuning (Ray Tune), model serving (Ray Serve), and reinforcement learning (RLlib). The KubeRay operator brings Ray to Kubernetes as native custom resources, enabling declarative cluster management.

By managing KubeRay and RayCluster resources with Flux CD, you treat your Ray compute clusters as GitOps-managed infrastructure. Data scientists can request a RayCluster by submitting a YAML file to Git, and Flux will provision the cluster automatically. Autoscaling configurations, worker type definitions, and resource quotas all live in version-controlled YAML, providing the same auditability as any other Kubernetes infrastructure.

In this guide you will deploy the KubeRay operator using Flux CD, create a RayCluster with heterogeneous worker node groups, and deploy a Ray Serve application for low-latency model serving.

## Prerequisites

- A Kubernetes cluster with Flux CD installed (minimum 8 CPUs, 16GB RAM for Ray workloads)
- `kubectl` and `flux` CLI tools installed
- Basic understanding of Ray concepts (head node, worker nodes, tasks, actors)
- A container registry with your Ray application Docker image

## Step 1: Add the KubeRay HelmRepository

```yaml
# clusters/production/sources/kuberay.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: kuberay
  namespace: flux-system
spec:
  interval: 1h
  url: https://ray-project.github.io/kuberay-helm/
```

## Step 2: Deploy the KubeRay Operator

```yaml
# clusters/production/infrastructure/kuberay-operator-helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v2beta2
kind: HelmRelease
metadata:
  name: kuberay-operator
  namespace: flux-system
spec:
  interval: 1h
  targetNamespace: ray-system
  createNamespace: true
  chart:
    spec:
      chart: kuberay-operator
      version: "1.x"
      sourceRef:
        kind: HelmRepository
        name: kuberay
  values:
    # Operator resource limits
    resources:
      requests:
        cpu: 100m
        memory: 128Mi
      limits:
        cpu: 500m
        memory: 512Mi
    # Enable batch scheduling support
    batchScheduler:
      enabled: false
    # Prometheus metrics
    metricsPort: 8080
```

## Step 3: Create a RayCluster for General Workloads

```yaml
# apps/ray-clusters/general-raycluster.yaml
apiVersion: ray.io/v1
kind: RayCluster
metadata:
  name: general-cluster
  namespace: ray-workloads
spec:
  # Ray version must match your application's Ray version
  rayVersion: "2.10.0"
  # Number of replicas for the head node (always 1 for standard clusters)
  enableInTreeAutoscaling: true
  autoscalerOptions:
    resources:
      requests:
        cpu: 500m
        memory: 512Mi
      limits:
        cpu: 1000m
        memory: 1Gi

  # Head node configuration
  headGroupSpec:
    rayStartParams:
      # Dashboard accessible from outside
      dashboard-host: "0.0.0.0"
      num-cpus: "0"  # Head node does not run tasks
    template:
      spec:
        containers:
          - name: ray-head
            image: myregistry/ray-app:2.10.0
            ports:
              - containerPort: 6379   # Redis/GCS port
                name: gcs
              - containerPort: 8265   # Dashboard port
                name: dashboard
              - containerPort: 10001  # Client port
                name: client
              - containerPort: 8080   # Metrics port
                name: metrics
            resources:
              requests:
                cpu: 1000m
                memory: 2Gi
              limits:
                cpu: 2000m
                memory: 4Gi
            env:
              - name: RAY_GRAFANA_HOST
                value: "http://grafana.monitoring.svc.cluster.local:3000"

  # Worker node groups
  workerGroupSpecs:
    # CPU workers for general tasks
    - groupName: cpu-workers
      replicas: 3
      minReplicas: 1
      maxReplicas: 10
      rayStartParams:
        num-cpus: "4"
      template:
        spec:
          containers:
            - name: ray-worker
              image: myregistry/ray-app:2.10.0
              resources:
                requests:
                  cpu: 4000m
                  memory: 8Gi
                limits:
                  cpu: 4000m
                  memory: 8Gi

    # GPU workers for ML training
    - groupName: gpu-workers
      replicas: 0        # Starts at 0, scales up on demand
      minReplicas: 0
      maxReplicas: 4
      rayStartParams:
        num-cpus: "4"
        num-gpus: "1"
      template:
        spec:
          containers:
            - name: ray-worker-gpu
              image: myregistry/ray-gpu-app:2.10.0
              resources:
                requests:
                  cpu: 4000m
                  memory: 16Gi
                  nvidia.com/gpu: "1"
                limits:
                  cpu: 4000m
                  memory: 16Gi
                  nvidia.com/gpu: "1"
          tolerations:
            - key: "nvidia.com/gpu"
              operator: "Exists"
              effect: "NoSchedule"
          nodeSelector:
            accelerator: nvidia-tesla-v100
```

## Step 4: Deploy a Ray Serve Application

```yaml
# apps/ray-clusters/model-serve-rayservice.yaml
apiVersion: ray.io/v1
kind: RayService
metadata:
  name: model-serve
  namespace: ray-workloads
spec:
  serviceUnhealthySecondThreshold: 300
  deploymentUnhealthySecondThreshold: 300
  serveConfigV2: |
    applications:
      - name: recommender
        import_path: app.recommender:build_app
        runtime_env:
          pip:
            - torch==2.1.0
            - transformers==4.36.0
        deployments:
          - name: RecommenderModel
            num_replicas: 2
            ray_actor_options:
              num_cpus: 2
              num_gpus: 0
            autoscaling_config:
              min_replicas: 1
              max_replicas: 10
              target_num_ongoing_requests_per_replica: 5
  rayClusterConfig:
    rayVersion: "2.10.0"
    headGroupSpec:
      rayStartParams:
        dashboard-host: "0.0.0.0"
        num-cpus: "0"
      template:
        spec:
          containers:
            - name: ray-head
              image: myregistry/ray-serve-app:2.10.0
              resources:
                requests:
                  cpu: 2000m
                  memory: 4Gi
    workerGroupSpecs:
      - groupName: serve-workers
        replicas: 2
        minReplicas: 1
        maxReplicas: 8
        rayStartParams:
          num-cpus: "4"
        template:
          spec:
            containers:
              - name: ray-worker
                image: myregistry/ray-serve-app:2.10.0
                resources:
                  requests:
                    cpu: 4000m
                    memory: 8Gi
```

## Step 5: Create Flux Kustomizations

```yaml
# clusters/production/apps/ray-workloads-kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: ray-workloads
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: app-repo
  path: ./apps/ray-clusters
  prune: true
  wait: true
  timeout: 15m
  dependsOn:
    - name: kuberay-operator
```

## Step 6: Monitor the Ray Cluster

```bash
# Check RayCluster status
kubectl get raycluster -n ray-workloads
kubectl describe raycluster general-cluster -n ray-workloads

# Access Ray dashboard via port-forward
kubectl port-forward -n ray-workloads \
  svc/general-cluster-head-svc 8265:8265
# Open http://localhost:8265

# View worker pods
kubectl get pods -n ray-workloads -l ray.io/node-type=worker

# Connect to Ray cluster from local Python
# export RAY_ADDRESS="http://localhost:8265"
# ray.init(address=os.environ["RAY_ADDRESS"])

# Check RayService status
kubectl get rayservice -n ray-workloads
kubectl describe rayservice model-serve -n ray-workloads

# Test Ray Serve endpoint
SERVE_URL=$(kubectl get svc -n ray-workloads model-serve-serve-svc -o jsonpath='{.spec.clusterIP}')
curl http://$SERVE_URL:8000/recommend -d '{"user_id": 123}'
```

## Best Practices

- Set `num-cpus: "0"` on the head node so it only handles coordination, not task execution
- Use GPU worker groups with `minReplicas: 0` to scale to zero when no GPU tasks are pending
- Pin your Ray Docker image version to match the `rayVersion` in the RayCluster spec exactly
- Configure Prometheus scraping on the metrics port (8080) for cluster observability
- Use RayService (not RayCluster + manual serve deploy) for production model serving to get built-in health checks
- Set resource limits equal to requests on worker containers to guarantee scheduling on appropriate nodes

## Conclusion

Deploying Ray clusters on Kubernetes with Flux CD and the KubeRay operator enables your data science and ML teams to request distributed compute clusters through Git pull requests. Heterogeneous worker groups with GPU support, autoscaling, and Ray Serve for model deployment are all managed declaratively. When a team needs more compute, they update the RayCluster YAML in Git, and Flux reconciles the change, scaling the cluster automatically.
