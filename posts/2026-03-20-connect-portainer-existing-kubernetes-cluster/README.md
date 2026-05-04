# How to Connect Portainer to an Existing Kubernetes Cluster

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Kubernetes, Environment, Agent, DevOps

Description: Learn how to add an existing Kubernetes cluster as an environment in Portainer using the Portainer Agent.

## Overview

Portainer can manage multiple Kubernetes clusters from a single interface. To manage an existing cluster, you deploy the Portainer Agent (or use the Edge Agent for remote clusters) in that cluster and register it with your Portainer Server.

## Method 1: Direct Connection (Same Network)

Use this when Portainer Server can reach the Kubernetes cluster's API.

### Step 1: Deploy the Portainer Agent

```bash
# Apply the Portainer Agent manifest to your Kubernetes cluster

kubectl apply -f https://downloads.portainer.io/ce2-19/portainer-agent-k8s-lb.yaml

# Wait for the agent to be ready
kubectl rollout status deployment/portainer-agent -n portainer

# Get the agent's external IP
kubectl get service portainer-agent -n portainer
```

### Step 2: Add the Environment in Portainer

1. In Portainer, go to **Environments** and click **Add environment**.
2. Select **Kubernetes** as the environment type.
3. Choose **Agent** as the connection method.
4. Enter:
   - **Name**: A friendly name for the cluster
   - **Environment URL**: `https://<agent-external-ip>:9001`
5. Click **Connect**.

## Method 2: Kubeconfig Import

If you have a kubeconfig for the cluster, you can import it directly:

1. Go to **Environments > Add environment**.
2. Select **Kubernetes** and then **Import**.
3. Paste or upload your kubeconfig file.

```bash
# Export your kubeconfig to paste into Portainer
cat ~/.kube/config

# Or for a specific context
kubectl config view --context=my-cluster --flatten
```

## Agent Manifest (Customized)

```yaml
# portainer-agent-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: portainer-agent
  namespace: portainer
spec:
  replicas: 1
  selector:
    matchLabels:
      app: portainer-agent
  template:
    metadata:
      labels:
        app: portainer-agent
    spec:
      serviceAccountName: portainer-sa-clusteradmin
      containers:
        - name: portainer-agent
          image: portainer/agent:latest
          env:
            # Expose the pod's own IP to the agent for cluster communication
            - name: KUBERNETES_POD_IP
              valueFrom:
                fieldRef:
                  fieldPath: status.podIP
          ports:
            - containerPort: 9001
```

## Verifying the Connection

After connecting, the cluster should appear in Portainer's **Environments** list with status **Up**.

```bash
# Check agent pod logs if the connection fails
kubectl logs -n portainer -l app=portainer-agent

# Verify the agent service is accessible
kubectl get svc -n portainer portainer-agent
```

## Conclusion

Connecting Portainer to an existing Kubernetes cluster takes under 5 minutes using the agent manifest. Once connected, all cluster resources - deployments, services, pods, ConfigMaps - are manageable through Portainer's UI.
