# How to configure Kustomize replicas for environment-specific scaling

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Kustomize, Scaling

Description: Learn how to use Kustomize replicas field to manage environment-specific scaling configurations without modifying base manifests for different deployment scenarios.

---

Managing replica counts across multiple environments is a common challenge in Kubernetes deployments. Development environments need minimal replicas to conserve resources, while production requires higher counts for availability and load handling. Kustomize provides a clean way to handle this through the replicas field in kustomization.yaml.

Rather than maintaining separate deployment manifests for each environment or using complex patches, the replicas field lets you declare scaling requirements declaratively. This approach keeps your base manifests environment-agnostic while overlays specify appropriate scaling for each deployment target.

## Understanding the replicas field

The replicas field in Kustomize overrides the replica count in Deployments, StatefulSets, and ReplicaSets. It's a simple key-value mapping between resource names and desired replica counts:

```yaml
# kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
- deployment.yaml

replicas:
- name: web-server
  count: 3
```

When you build this kustomization, the web-server Deployment will have 3 replicas regardless of what the base deployment.yaml specifies. This override is clean and explicit, making it easy to see exactly how many replicas each environment runs.

## Setting up base deployments

Your base deployments should specify reasonable defaults, typically the minimum viable replica count:

```yaml
# base/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-service
spec:
  replicas: 1
  selector:
    matchLabels:
      app: api
  template:
    metadata:
      labels:
        app: api
    spec:
      containers:
      - name: api
        image: api:latest
        ports:
        - containerPort: 8080
```

The single replica works fine for development and testing. Production overlays will increase this count based on actual load requirements.

## Environment-specific replica configuration

Create overlays for each environment with appropriate replica counts:

```yaml
# overlays/development/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

bases:
- ../../base

replicas:
- name: api-service
  count: 1

- name: worker-service
  count: 1
```

```yaml
# overlays/staging/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

bases:
- ../../base

replicas:
- name: api-service
  count: 3

- name: worker-service
  count: 2
```

```yaml
# overlays/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

bases:
- ../../base

replicas:
- name: api-service
  count: 10

- name: worker-service
  count: 5
```

Each environment specifies exactly what it needs. This clarity helps with capacity planning and makes it obvious how resources are allocated across environments.

## Scaling for high availability

Production environments often require replica counts that ensure availability during node failures or updates:

```yaml
# overlays/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

bases:
- ../../base

replicas:
# Frontend services - spread across availability zones
- name: web-frontend
  count: 6

# API services - handle variable load
- name: api-gateway
  count: 8

- name: auth-service
  count: 4

# Backend workers - process queues
- name: async-worker
  count: 12

# Database replicas - read scaling
- name: postgres-read-replica
  count: 3
```

The replica counts reflect each service's role and importance. Critical path services like the API gateway run more replicas than supporting services.

## Combining replicas with resource requests

Replica configuration works well alongside resource specifications. Calculate total resource needs based on per-pod requirements multiplied by replica count:

```yaml
# overlays/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

bases:
- ../../base

replicas:
- name: data-processor
  count: 20

patches:
- target:
    kind: Deployment
    name: data-processor
  patch: |-
    - op: add
      path: /spec/template/spec/containers/0/resources
      value:
        requests:
          cpu: "500m"
          memory: "1Gi"
        limits:
          cpu: "1000m"
          memory: "2Gi"
```

With 20 replicas requesting 1GB each, this deployment needs at least 20GB of memory capacity in your cluster. Document these calculations to help with capacity planning.

## Regional deployment variations

Different regions might need different replica counts based on user distribution or data locality requirements:

```yaml
# overlays/us-east/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

bases:
- ../../base

namespace: us-east

replicas:
- name: api-service
  count: 15  # High user concentration

- name: cache-service
  count: 8
```

```yaml
# overlays/eu-west/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

bases:
- ../../base

namespace: eu-west

replicas:
- name: api-service
  count: 8  # Moderate user concentration

- name: cache-service
  count: 4
```

Each region scales independently based on observed traffic patterns. This flexibility lets you optimize resource usage while maintaining performance.

## Scaling StatefulSets carefully

StatefulSets require more care when adjusting replicas because they maintain stable identities and persistent storage:

```yaml
# overlays/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

bases:
- ../../base

replicas:
- name: database-cluster
  count: 3

- name: kafka-cluster
  count: 5

- name: elasticsearch-cluster
  count: 3
```

For StatefulSets, consider the impact of scaling on quorum requirements, data rebalancing, and storage provisioning. Odd numbers work better for consensus-based systems like databases.

## Temporary scaling for load testing

Create temporary overlays for load testing with elevated replica counts:

```yaml
# overlays/loadtest/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

bases:
- ../../base

namespace: loadtest

replicas:
- name: api-service
  count: 50

- name: worker-service
  count: 30
```

Deploy this configuration to a test cluster to validate behavior under load. The isolated namespace prevents interference with other environments.

## Using replicas with HPA

If you use Horizontal Pod Autoscaling, you can still use the replicas field to set the initial replica count:

```yaml
# overlays/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

bases:
- ../../base

replicas:
- name: web-service
  count: 5  # Starting point for HPA

resources:
- hpa.yaml
```

```yaml
# overlays/production/hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: web-service-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: web-service
  minReplicas: 5
  maxReplicas: 50
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

The replicas field sets the initial count, and HPA takes over from there. Ensure the replica count matches or exceeds the HPA minReplicas to avoid conflicts.

## Zero-replica deployments for cost savings

Development or feature branch environments might not need services running constantly:

```yaml
# overlays/feature-branch/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

bases:
- ../../base

namePrefix: feature-auth-

replicas:
- name: feature-auth-api-service
  count: 0

- name: feature-auth-worker-service
  count: 0
```

Scale these to zero when not actively testing, then scale up manually when needed. This saves significant resources in environments with many feature branches.

## Documenting replica decisions

Include comments in your kustomization files explaining replica counts:

```yaml
# overlays/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

bases:
- ../../base

replicas:
# API layer - sized for peak traffic (10k req/min)
- name: api-gateway
  count: 12

# Background workers - processes 500 jobs/min
- name: job-processor
  count: 8

# Cache layer - memory-bound, one per node
- name: redis-cache
  count: 6

# Search service - CPU-intensive queries
- name: search-service
  count: 4
```

These comments help others understand the reasoning behind replica counts and make it easier to adjust them appropriately as requirements change.

## Validating replica configurations

Before applying changes, build and inspect the output:

```bash
kustomize build overlays/production | grep -A 5 "kind: Deployment"
```

Verify that replica counts match your expectations. For critical environments, review changes in pull requests to catch mistakes before deployment.

## Monitoring and adjusting replica counts

Track metrics to validate that replica counts are appropriate:

- CPU and memory utilization per pod
- Request latency and throughput
- Queue depths for worker processes
- Error rates and timeout frequencies

If pods consistently run below 50% utilization, you might be over-provisioned. If you see regular CPU throttling or memory pressure, increase replicas or resources per pod.

## Handling replica count in CI/CD

Integrate replica configuration into your deployment pipeline:

```yaml
# .github/workflows/deploy.yml
- name: Deploy to production
  run: |
    kustomize build overlays/production | kubectl apply -f -

- name: Wait for rollout
  run: |
    kubectl rollout status deployment/api-service -n production
    kubectl rollout status deployment/worker-service -n production
```

The pipeline applies the complete configuration including replica counts. Monitor rollout status to ensure the scaling completes successfully.

## Best practices for replica management

Start with conservative replica counts and scale up based on observed load. It's easier to add capacity than to troubleshoot issues caused by resource exhaustion.

Maintain consistency across similar services. If your API services typically run 5 replicas per 1000 requests per minute, apply that ratio consistently unless specific services have different characteristics.

Review replica configurations quarterly. Application changes, traffic patterns, and infrastructure improvements all affect optimal replica counts. Regular reviews ensure your configurations stay aligned with actual needs.

## Conclusion

Kustomize's replicas field provides a clean, declarative way to manage scaling across environments. By separating replica counts from base manifests, you maintain clear environment-specific configurations that are easy to understand and modify.

This approach scales well from small applications with a few services to large microservice architectures with hundreds of deployments. The explicit nature of the replicas field makes capacity planning straightforward and helps teams understand resource allocation across their infrastructure. Combined with proper monitoring and regular reviews, this pattern supports reliable, cost-effective Kubernetes deployments.
