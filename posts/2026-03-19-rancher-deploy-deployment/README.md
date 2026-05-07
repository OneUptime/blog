# How to Deploy a Deployment Workload in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Deployment, Workload

Description: Learn how to deploy a Deployment workload in Rancher using both the UI and kubectl, including replica configuration and rolling update strategies.

Deployments are one of the most common workload types in Kubernetes. They manage stateless applications by maintaining a desired number of pod replicas and handling rolling updates. Rancher makes deploying and managing Deployments straightforward through its intuitive web UI. In this guide, you will learn how to create a Deployment workload in Rancher step by step.

## Prerequisites

Before you begin, make sure you have:

- A running Rancher instance (v2.7 or later)
- At least one managed Kubernetes cluster registered in Rancher
- Access to a project and namespace within that cluster
- A container image to deploy (we will use `nginx:latest` in this example)

## Step 1: Navigate to the Workloads Page

Log in to your Rancher dashboard and select the cluster where you want to deploy your workload. From the left sidebar, click on **Workloads** and then select **Deployments**.

You will see a list of existing Deployments in the current namespace. If this is your first deployment, the list will be empty.

## Step 2: Create a New Deployment

Click the **Create** button in the top-right corner. This opens the Deployment creation form.

Fill in the basic details:

- **Name**: Enter a name for your deployment, such as `my-nginx-app`
- **Namespace**: Select the namespace where you want to deploy, or create a new one
- **Replicas**: Set the number of pod replicas (default is 1, set it to 3 for high availability)

## Step 3: Configure the Container

In the **Container** section, configure your container image:

- **Container Image**: Enter `nginx:latest`
- **Pull Policy**: Select `Always` to ensure the latest image is pulled each time

Add port mappings if your application needs to expose ports:

- Click **Add Port**
- Set **Container Port** to `80`
- Set **Protocol** to `TCP`
- Optionally set a **Service Type** (ClusterIP, NodePort, or LoadBalancer)

## Step 4: Configure the Update Strategy

Scroll down to the **Upgrade Strategy** section. Rancher supports two strategies for Deployments:

- **Rolling Update** (default): Gradually replaces old pods with new ones
- **Recreate**: Terminates all existing pods before creating new ones

For Rolling Update, configure:

- **Max Unavailable**: The maximum number of pods that can be unavailable during the update (default: 25%)
- **Max Surge**: The maximum number of pods that can be created over the desired count (default: 25%)

## Step 5: Deploy

Click the **Create** button at the bottom of the form. Rancher will submit the Deployment to the Kubernetes API and begin creating pods.

You can monitor the deployment progress on the Workloads page. The status will show the number of available replicas out of the desired count.

## Alternative: Deploy via YAML

If you prefer working with YAML, click the **Import YAML** button on the Deployments page and paste the following:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-nginx-app
  namespace: default
spec:
  replicas: 3
  selector:
    matchLabels:
      app: my-nginx-app
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 25%
      maxUnavailable: 25%
  template:
    metadata:
      labels:
        app: my-nginx-app
    spec:
      containers:
        - name: nginx
          image: nginx:latest
          ports:
            - containerPort: 80
              protocol: TCP
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
            limits:
              cpu: 250m
              memory: 256Mi
```

Click **Import** to create the Deployment from the YAML definition.

## Alternative: Deploy via kubectl

You can also use `kubectl` through the Rancher UI. Click the **Kubectl Shell** button in the top navigation of the cluster dashboard to open a shell, then run:

```bash
kubectl apply -f - <<EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-nginx-app
  namespace: default
spec:
  replicas: 3
  selector:
    matchLabels:
      app: my-nginx-app
  template:
    metadata:
      labels:
        app: my-nginx-app
    spec:
      containers:
        - name: nginx
          image: nginx:latest
          ports:
            - containerPort: 80
EOF
```

## Step 6: Verify the Deployment

After creating the Deployment, verify it is running correctly:

1. Navigate to **Workloads > Deployments** in the Rancher UI
2. Click on your deployment name to see detailed information
3. Check the **Pods** tab to confirm all replicas are in a `Running` state

You can also verify using kubectl:

```bash
kubectl get deployment my-nginx-app -n default
kubectl get pods -l app=my-nginx-app -n default
```

## Step 7: Expose the Deployment with a Service

If you already added a port in Step 3, Rancher creates a corresponding Service for the workload automatically. If you need a separate Service, navigate to **Service Discovery > Services** and click **Create**. Select the service type:

- **ClusterIP**: Internal access only
- **NodePort**: Access via node IP and a port
- **LoadBalancer**: External access via a cloud load balancer

Map the service port to your container port (80 in this case).

## Scaling the Deployment

To scale your Deployment after creation:

1. Go to **Workloads > Deployments**
2. Click the three-dot menu next to your deployment
3. Select **Edit Config**
4. Change the **Replicas** count
5. Click **Save**

Or use kubectl:

```bash
kubectl scale deployment my-nginx-app --replicas=5 -n default
```

## Summary

You have successfully deployed a Deployment workload in Rancher. Deployments are ideal for stateless applications that need rolling updates and easy scaling. Rancher simplifies the process by providing a visual interface on top of Kubernetes, while still allowing you to use YAML and kubectl when needed. From here, you can configure health checks, environment variables, and resource limits to further harden your deployment.
