# How to Configure Kubernetes Request Right-Sizing Automation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, VPA, Resource Optimization, Automation, Right-Sizing

Description: Implement automated resource request right-sizing using VPA in recommendation mode with custom controllers to continuously optimize pod resource requests based on actual usage patterns.

---

Manual resource request tuning is time-consuming and error-prone. The Vertical Pod Autoscaler in recommendation mode generates sizing suggestions without automatically applying them, allowing you to implement custom automation for gradual, controlled right-sizing. This guide shows you how to build an automated right-sizing pipeline using VPA recommendations.

## Deploying VPA in Recommendation Mode

Install VPA components:

```bash
git clone https://github.com/kubernetes/autoscaler.git
cd autoscaler/vertical-pod-autoscaler
./hack/vpa-up.sh
```

Create VPA objects in recommendation-only mode:

```yaml
# vpa-recommendation.yaml

apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: myapp-vpa
  namespace: production
spec:
  targetRef:
    apiVersion: "apps/v1"
    kind: Deployment
    name: myapp
  updatePolicy:
    updateMode: "Off"  # Recommendation mode only
  resourcePolicy:
    containerPolicies:
    - containerName: "*"
      minAllowed:
        cpu: "50m"
        memory: "64Mi"
      maxAllowed:
        cpu: "4"
        memory: "8Gi"
      controlledResources: ["cpu", "memory"]
```

## Building Automated Right-Sizing Controller

Create a controller that applies VPA recommendations:

```python
#!/usr/bin/env python3
# vpa-rightsizing-controller.py

import os
import time
from decimal import Decimal, ROUND_UP
from kubernetes import client, config
from kubernetes.utils.quantity import parse_quantity

config.load_incluster_config()
custom_api = client.CustomObjectsApi()
apps_v1 = client.AppsV1Api()

MIN_CHANGE_RATIO = Decimal(os.getenv("MIN_CHANGE_RATIO", "0.20"))  # Only apply if recommendation differs by 20%+
UPDATE_INTERVAL = int(os.getenv("UPDATE_INTERVAL", "3600"))
VPA_GROUP = "autoscaling.k8s.io"
VPA_VERSION = "v1"
VPA_PLURAL = "verticalpodautoscalers"

def get_vpa_recommendation(namespace, vpa_name):
    """Get VPA recommendation"""
    vpa_data = custom_api.get_namespaced_custom_object(
        VPA_GROUP,
        VPA_VERSION,
        namespace,
        VPA_PLURAL,
        vpa_name,
    )
    recommendation = vpa_data.get('status', {}).get('recommendation', {})

    if not recommendation:
        return None

    container_recs = recommendation.get('containerRecommendations', [])
    return container_recs

def quantity(resource_str):
    """Convert a Kubernetes resource quantity to Decimal."""
    return parse_quantity(resource_str or "0")

def doubled_cpu_millicores(cpu_quantity):
    """Return a CPU limit string equal to 2x the requested CPU."""
    millicores = (quantity(cpu_quantity) * Decimal(2000)).quantize(Decimal("1"), rounding=ROUND_UP)
    return f"{millicores}m"

def doubled_memory_mi(memory_quantity):
    """Return a memory limit string equal to 2x the requested memory."""
    mebibytes = (quantity(memory_quantity) * Decimal(2) / Decimal(1024 * 1024)).quantize(Decimal("1"), rounding=ROUND_UP)
    return f"{mebibytes}Mi"

def get_current_requests_by_container(deployment):
    """Get current resource requests keyed by container name."""
    requests_by_container = {}
    for container in deployment.spec.template.spec.containers:
        resources = container.resources
        requests_by_container[container.name] = resources.requests if resources and resources.requests else {}
    return requests_by_container

def should_update_deployment(current_requests_by_container, recommendations):
    """Determine if update is warranted"""
    for container_rec in recommendations:
        container_name = container_rec['containerName']
        target = container_rec['target']
        current_requests = current_requests_by_container.get(container_name, {})

        if not current_requests:
            return True

        current_cpu = quantity(current_requests.get('cpu'))
        recommended_cpu = quantity(target.get('cpu'))

        current_mem = quantity(current_requests.get('memory'))
        recommended_mem = quantity(target.get('memory'))

        # Check if difference exceeds threshold
        cpu_diff = abs(current_cpu - recommended_cpu) / current_cpu if current_cpu > 0 else Decimal(0)
        mem_diff = abs(current_mem - recommended_mem) / current_mem if current_mem > 0 else Decimal(0)

        if cpu_diff > MIN_CHANGE_RATIO or mem_diff > MIN_CHANGE_RATIO:
            return True

    return False

def update_deployment_resources(namespace, deployment_name, recommendations):
    """Update deployment with recommended resources"""
    deployment = apps_v1.read_namespaced_deployment(deployment_name, namespace)
    recommendation_by_container = {
        rec['containerName']: rec
        for rec in recommendations
    }
    container_patches = []

    for container in deployment.spec.template.spec.containers:
        rec = recommendation_by_container.get(container.name)
        if not rec:
            continue

        target = rec['target']
        requests = {
            'cpu': target.get('cpu'),
            'memory': target.get('memory'),
        }
        limits = {
            'cpu': doubled_cpu_millicores(target.get('cpu')),
            'memory': doubled_memory_mi(target.get('memory')),
        }
        container_patches.append({
            'name': container.name,
            'resources': {
                'requests': requests,
                'limits': limits,
            },
        })

        print(f"Updated {container.name} to CPU: {target.get('cpu')}, Memory: {target.get('memory')}")

    # Apply update
    if container_patches:
        apps_v1.patch_namespaced_deployment(
            deployment_name,
            namespace,
            {'spec': {'template': {'spec': {'containers': container_patches}}}},
        )

def process_vpa_recommendations():
    """Main controller loop"""
    while True:
        try:
            # Get all VPA objects
            vpas = custom_api.list_cluster_custom_object(
                VPA_GROUP,
                VPA_VERSION,
                VPA_PLURAL,
            )

            for vpa in vpas.get('items', []):
                metadata = vpa.get('metadata', {})
                namespace = metadata.get('namespace')
                name = metadata.get('name')
                annotations = metadata.get('annotations', {})

                if annotations.get('vpa.rightsizing.io/exclude') == 'true':
                    print(f"Skipping {namespace}/{name} - excluded by annotation")
                    continue

                target_ref = vpa.get('spec', {}).get('targetRef', {})
                if target_ref.get('apiVersion') != 'apps/v1' or target_ref.get('kind') != 'Deployment':
                    print(f"Skipping {namespace}/{name} - only apps/v1 Deployments are supported")
                    continue

                deployment_name = target_ref.get('name')

                recommendations = get_vpa_recommendation(namespace, name)

                if recommendations:
                    # Get current deployment resources
                    deployment = apps_v1.read_namespaced_deployment(deployment_name, namespace)
                    current_requests = get_current_requests_by_container(deployment)

                    if should_update_deployment(current_requests, recommendations):
                        print(f"Applying recommendations to {namespace}/{deployment_name}")
                        update_deployment_resources(namespace, deployment_name, recommendations)
                    else:
                        print(f"Skipping {namespace}/{deployment_name} - within threshold")

        except Exception as e:
            print(f"Error: {e}")

        time.sleep(UPDATE_INTERVAL)  # Run every hour by default

if __name__ == '__main__':
    process_vpa_recommendations()
```

Deploy as a Kubernetes Deployment:

```yaml
# rightsizing-controller.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: vpa-controller
  namespace: kube-system
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: vpa-rightsizing-controller
rules:
- apiGroups: ["autoscaling.k8s.io"]
  resources: ["verticalpodautoscalers"]
  verbs: ["get", "list", "watch"]
- apiGroups: ["apps"]
  resources: ["deployments"]
  verbs: ["get", "list", "watch", "patch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: vpa-rightsizing-controller
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: vpa-rightsizing-controller
subjects:
- kind: ServiceAccount
  name: vpa-controller
  namespace: kube-system
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: vpa-rightsizing-controller
  namespace: kube-system
spec:
  replicas: 1
  selector:
    matchLabels:
      app: vpa-rightsizing-controller
  template:
    metadata:
      labels:
        app: vpa-rightsizing-controller
    spec:
      serviceAccountName: vpa-controller
      containers:
      - name: controller
        image: vpa-rightsizing-controller:v1.0
        env:
        - name: MIN_CHANGE_RATIO
          value: "0.20"
        - name: UPDATE_INTERVAL
          value: "3600"
```

## Gradual Rollout Strategy

Implement phased adoption:

```python
# Phase 1: Dry-run mode
DRY_RUN = True

if should_update_deployment(current_requests, recommendations):
    if DRY_RUN:
        print(f"DRY RUN: Would update {deployment_name}")
    else:
        update_deployment_resources(namespace, deployment_name, recommendations)

# Phase 2: Non-production only
if namespace in ['development', 'staging']:
    update_deployment_resources(namespace, deployment_name, recommendations)

# Phase 3: Production with approval
if namespace == 'production':
    # Create PR or require manual approval
    create_approval_request(namespace, deployment_name, recommendations)
```

## Monitoring Right-Sizing Impact

Track savings from automated right-sizing:

```promql
# Cost reduction from rightsizing, using your own recorded before/after request metrics
sum(
  (workload_cpu_requests_before - workload_cpu_requests_after)
  * cost_per_core
)

# Resource request efficiency
sum(rate(container_cpu_usage_seconds_total{container!="",pod!=""}[5m])) /
sum(kube_pod_container_resource_requests{resource="cpu",unit="core"})
```

## Safety Guardrails

Implement safety limits:

```yaml
resourcePolicy:
  containerPolicies:
  - containerName: "*"
    minAllowed:
      cpu: "100m"      # Never go below 100m CPU
      memory: "128Mi"   # Never go below 128Mi memory
    maxAllowed:
      cpu: "8"         # Cap at 8 cores
      memory: "16Gi"    # Cap at 16GB
    controlledResources: ["cpu", "memory"]
    mode: Auto
```

Exclude critical workloads:

```yaml
metadata:
  annotations:
    vpa.rightsizing.io/exclude: "true"
```

## Conclusion

Automated resource request right-sizing using VPA recommendations reduces manual tuning overhead while periodically optimizing pod resource allocations. Custom controllers enable gradual, controlled adoption with safety guardrails, and can reduce cost when workloads are consistently over-requested.
