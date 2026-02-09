# How to Configure Kubernetes Request Right-Sizing Automation with VPA in Recommendation Mode

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

import subprocess
import json
import time
from kubernetes import client, config

config.load_incluster_config()
v1 = client.CoreV1Api()
apps_v1 = client.AppsV1Api()

UTILIZATION_THRESHOLD = 0.8  # Only apply if recommendation differs by 20%+

def get_vpa_recommendation(namespace, vpa_name):
    """Get VPA recommendation"""
    cmd = f"kubectl get vpa {vpa_name} -n {namespace} -o json"
    result = subprocess.run(cmd.split(), capture_output=True, text=True)

    if result.returncode != 0:
        return None

    vpa_data = json.loads(result.stdout)
    recommendation = vpa_data.get('status', {}).get('recommendation', {})

    if not recommendation:
        return None

    container_recs = recommendation.get('containerRecommendations', [])
    return container_recs

def parse_resource(resource_str):
    """Convert resource string to numeric value"""
    if resource_str.endswith('m'):
        return float(resource_str[:-1]) / 1000
    elif resource_str.endswith('Mi'):
        return float(resource_str[:-2])
    elif resource_str.endswith('Gi'):
        return float(resource_str[:-2]) * 1024
    return float(resource_str)

def should_update_deployment(current_requests, recommendations):
    """Determine if update is warranted"""
    for container_rec in recommendations:
        container_name = container_rec['containerName']
        target = container_rec['target']

        current_cpu = parse_resource(current_requests.get('cpu', '0'))
        recommended_cpu = parse_resource(target.get('cpu', '0'))

        current_mem = parse_resource(current_requests.get('memory', '0'))
        recommended_mem = parse_resource(target.get('memory', '0'))

        # Check if difference exceeds threshold
        cpu_diff = abs(current_cpu - recommended_cpu) / current_cpu if current_cpu > 0 else 0
        mem_diff = abs(current_mem - recommended_mem) / current_mem if current_mem > 0 else 0

        if cpu_diff > (1 - UTILIZATION_THRESHOLD) or mem_diff > (1 - UTILIZATION_THRESHOLD):
            return True

    return False

def update_deployment_resources(namespace, deployment_name, recommendations):
    """Update deployment with recommended resources"""
    deployment = apps_v1.read_namespaced_deployment(deployment_name, namespace)

    for container in deployment.spec.template.spec.containers:
        for rec in recommendations:
            if rec['containerName'] == container.name or rec['containerName'] == '*':
                target = rec['target']

                # Update requests
                if not container.resources:
                    container.resources = client.V1ResourceRequirements()

                if not container.resources.requests:
                    container.resources.requests = {}

                container.resources.requests['cpu'] = target.get('cpu')
                container.resources.requests['memory'] = target.get('memory')

                # Set limits to 2x requests
                if not container.resources.limits:
                    container.resources.limits = {}

                cpu_cores = parse_resource(target.get('cpu'))
                mem_mi = parse_resource(target.get('memory'))

                container.resources.limits['cpu'] = f"{int(cpu_cores * 2000)}m"
                container.resources.limits['memory'] = f"{int(mem_mi * 2)}Mi"

                print(f"Updated {container.name} to CPU: {target.get('cpu')}, Memory: {target.get('memory')}")

    # Apply update
    apps_v1.patch_namespaced_deployment(deployment_name, namespace, deployment)

def process_vpa_recommendations():
    """Main controller loop"""
    while True:
        try:
            # Get all VPA objects
            cmd = "kubectl get vpa --all-namespaces -o json"
            result = subprocess.run(cmd.split(), capture_output=True, text=True)
            vpas = json.loads(result.stdout)

            for vpa in vpas.get('items', []):
                metadata = vpa.get('metadata', {})
                namespace = metadata.get('namespace')
                name = metadata.get('name')

                target_ref = vpa.get('spec', {}).get('targetRef', {})
                deployment_name = target_ref.get('name')

                recommendations = get_vpa_recommendation(namespace, name)

                if recommendations:
                    # Get current deployment resources
                    deployment = apps_v1.read_namespaced_deployment(deployment_name, namespace)
                    current_requests = deployment.spec.template.spec.containers[0].resources.requests

                    if should_update_deployment(current_requests, recommendations):
                        print(f"Applying recommendations to {namespace}/{deployment_name}")
                        update_deployment_resources(namespace, deployment_name, recommendations)
                    else:
                        print(f"Skipping {namespace}/{deployment_name} - within threshold")

        except Exception as e:
            print(f"Error: {e}")

        time.sleep(3600)  # Run every hour

if __name__ == '__main__':
    process_vpa_recommendations()
```

Deploy as a Kubernetes Deployment:

```yaml
# rightsizing-controller.yaml
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
        - name: UTILIZATION_THRESHOLD
          value: "0.8"
        - name: UPDATE_INTERVAL
          value: "3600"
```

## Gradual Rollout Strategy

Implement phased adoption:

```python
# Phase 1: Dry-run mode
DRY_RUN = True

if should_update_deployment(current, recommendations):
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
# Cost reduction from rightsizing
sum(
  (kube_pod_container_resource_requests_before - kube_pod_container_resource_requests_after)
  * cost_per_core
)

# Resource request efficiency
sum(container_cpu_usage_seconds_total) /
sum(kube_pod_container_resource_requests{resource="cpu"})
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

Automated resource request right-sizing using VPA recommendations eliminates manual tuning overhead while continuously optimizing pod resource allocations. Custom controllers enable gradual, controlled adoption with safety guardrails, typically achieving 20-30% cost reduction from more accurate resource requests.
