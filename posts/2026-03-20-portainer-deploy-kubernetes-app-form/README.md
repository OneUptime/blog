# How to Deploy a Kubernetes Application via Form in Portainer - Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Kubernetes, Deployment, Application, DevOps

Description: Learn how to deploy Kubernetes applications using Portainer's form-based interface without writing YAML manifests.

## Introduction

Portainer's form-based application deployment makes Kubernetes accessible to teams who are not comfortable writing YAML manifests. The form wizard generates Kubernetes workloads and related resources based on your inputs, such as Deployments or StatefulSets, Services, PersistentVolumeClaims, Ingresses, and HorizontalPodAutoscalers. Existing ConfigMaps and Secrets can also be attached through the form. This guide walks through deploying a complete application using the form interface.

## Prerequisites

- Portainer with a Kubernetes environment
- At least one namespace to deploy into
- Image accessible from the cluster (registry credentials configured if private)

## Step 1: Navigate to Application Deployment

1. Select your Kubernetes environment in Portainer
2. Click **Applications** in the sidebar
3. Click **Add with form**

## Step 2: Configure Basic Details

```text
Application name:  my-web-app
Namespace:        production
```

**Naming rules:**
- Lowercase letters, numbers, hyphens only
- Must start with a letter
- Maximum 63 characters

## Step 3: Configure the Image

```bash
Image:           nginx:alpine
Registry:        Docker Hub (or your private registry)
```

For private registries, select the registry from the dropdown - Portainer uses stored credentials automatically.

## Step 4: Configure Deployment and Resources

```text
Deployment type:  Replicated
Instance count:   3

Resource limits:
  Memory limit:   256Mi
  CPU limit:      500m

Resource requests:
  Memory request: 128Mi
  CPU request:    100m
```

## Step 5: Configure Environment Variables

Click **+ Add environment variable** for each variable:

```text
DATABASE_URL:    postgresql://postgres:5432/mydb
NODE_ENV:        production
LOG_LEVEL:       info
```

Use Portainer's separate **ConfigMaps** and **Secrets** sections if you want to attach existing configuration objects.

## Step 6: Configure Persistent Storage

Under **Persisted folders**, click **Add persisted folder**:

```text
Path in container:   /data
Volume:              New volume
Requested size:      5 GB
Storage:             standard

Data access policy:  Shared
```

Choose `Shared` to keep the application as a `Deployment` with shared storage. Choose `Isolated` to deploy it as a `StatefulSet` with per-instance data.

## Step 7: Configure Published Services

Under **Publishing the application**, select the **NodePort**, **LoadBalancer**, or **ClusterIP** tab and click **Create service**:

```text
Container port:    80
Service port:      80
Service type:      NodePort
Published port:    30080      (optional; leave blank for system allocation)
```

For internal services (ClusterIP):

```text
Container port:    8080
Service port:      8080
Service type:      ClusterIP
```

For `LoadBalancer`, the cluster must allow external load balancers in **Cluster Setup**.

## Step 8: Configure ConfigMaps and Secrets (Optional)

Use the **ConfigMaps** and **Secrets** sections to attach existing resources:

```text
ConfigMap:         app-config
Mode:              Auto (all keys exposed as environment variables)

Secret:            db-secret
Mode:              Auto (all keys exposed as environment variables)
```

Use **Override** if you want to control individual keys instead of exposing all keys automatically, including mounting keys as files.

## Step 9: Configure Auto-Scaling (Optional)

```text
Auto-scaling:    Enabled
Minimum instances: 2
Maximum instances: 10

Target CPU usage: 70%
```

This creates a HorizontalPodAutoscaler (HPA) automatically. It also requires the Kubernetes metrics server to be installed and metrics features to be enabled in the cluster setup.

## Step 10: Configure Annotations (Optional)

```text
Annotations:
  description: "Main web application"
```

Portainer also lets you add annotations to published services if needed.

## Step 11: Deploy the Application

1. Review all settings
2. Click **Deploy application**
3. Portainer creates the Kubernetes resources:
   - `Deployment`: manages the pods
   - `Service`: exposes the application
   - `PersistentVolumeClaim`: if storage was configured
   - `HorizontalPodAutoscaler`: if auto-scaling was configured

If you chose `Isolated` for the data access policy, Portainer deploys a `StatefulSet` instead of a `Deployment`.

## Step 12: Verify the Deployment

After deploying:

1. Go to **Applications** to see the application listed
2. Click on it to see application details, pod status, and events
3. Check that the application is **Running**

```bash
# CLI verification

kubectl get deployment my-web-app -n production
kubectl get pods -n production
kubectl get svc -n production

# Check details and recent events
kubectl describe deployment my-web-app -n production
```

If you selected `Isolated` storage access, inspect the `StatefulSet` instead of the `Deployment`.

## Viewing the Generated YAML

Portainer generates YAML behind the scenes. To see it:

1. Click on the application
2. Click the **YAML** tab
3. View the generated manifest

The generated YAML is shown in the **YAML** tab. Editing from that tab is available in Portainer Business Edition.

This is a great way to learn Kubernetes YAML by using the form first.

## Conclusion

Portainer's form-based application deployment makes Kubernetes accessible without requiring YAML knowledge. The form covers all essential configuration including deployment mode, resource reservations, environment variables, persisted storage, configuration objects, and services. As you become more comfortable with Kubernetes, use the generated YAML as a learning tool and transition to YAML-based deployments for more advanced configurations.
