# How to Set Up AKS Cluster Extensions for Azure Machine Learning Workload Deployment

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AKS, Azure Machine Learning, Kubernetes, ML, Cluster Extensions, Azure, MLOps

Description: Learn how to install the Azure Machine Learning extension on AKS to deploy training jobs and inference endpoints directly on your Kubernetes cluster.

---

Running machine learning workloads on Kubernetes gives you fine-grained control over resource allocation, GPU scheduling, and infrastructure costs. Azure Machine Learning integrates with AKS through a cluster extension that turns your Kubernetes cluster into a compute target for training jobs and inference endpoints. Instead of provisioning separate Azure ML compute instances, you can use the same AKS cluster that runs your other workloads.

This guide walks through installing the Azure ML extension on AKS, configuring it for both training and inference, and deploying your first model.

## Why Use AKS for Azure ML

Azure Machine Learning has its own managed compute options (compute instances, compute clusters, managed online endpoints), so why bother with AKS? A few reasons:

- **Cost consolidation**: Run ML workloads alongside your other services on the same cluster instead of paying for separate compute
- **GPU sharing**: Use tools like NVIDIA MIG or time-slicing to share GPUs across multiple ML jobs and inference endpoints
- **Existing infrastructure**: If you already have an AKS cluster with networking, security policies, and monitoring configured, reuse it for ML
- **Hybrid scenarios**: Run ML workloads on-premises or in edge locations using Arc-enabled Kubernetes with the same extension
- **Custom environments**: Full control over the runtime environment, including custom container images and system libraries

## Prerequisites

- An AKS cluster running Kubernetes 1.25 or later
- Azure CLI with the `k8s-extension` and `ml` extensions
- An Azure Machine Learning workspace
- For GPU workloads: a node pool with GPU-enabled VMs (NC, ND, or NV series)

## Step 1: Install Required CLI Extensions

Make sure you have the necessary Azure CLI extensions installed.

```bash
# Install or update the k8s-extension CLI extension
az extension add --name k8s-extension --upgrade

# Install or update the ml CLI extension
az extension add --name ml --upgrade

# Verify installations
az extension list -o table | grep -E "k8s-extension|ml"
```

## Step 2: Install the Azure ML Extension on AKS

The extension deploys several components to your cluster: an inference router, a training operator, metric collection agents, and more.

For training workloads only:

```bash
# Install Azure ML extension for training workloads
az k8s-extension create \
  --name azureml \
  --extension-type Microsoft.AzureML.Kubernetes \
  --cluster-type managedClusters \
  --cluster-name myAKSCluster \
  --resource-group myResourceGroup \
  --scope cluster \
  --configuration-settings \
    enableTraining=True \
    enableInference=False
```

For both training and inference:

```bash
# Install Azure ML extension for both training and inference
# Inference requires an SSL certificate or can use HTTP for testing
az k8s-extension create \
  --name azureml \
  --extension-type Microsoft.AzureML.Kubernetes \
  --cluster-type managedClusters \
  --cluster-name myAKSCluster \
  --resource-group myResourceGroup \
  --scope cluster \
  --configuration-settings \
    enableTraining=True \
    enableInference=True \
    inferenceRouterServiceType=LoadBalancer \
    allowInsecureConnections=True
```

For production inference with SSL:

```bash
# Install with SSL enabled for production inference
az k8s-extension create \
  --name azureml \
  --extension-type Microsoft.AzureML.Kubernetes \
  --cluster-type managedClusters \
  --cluster-name myAKSCluster \
  --resource-group myResourceGroup \
  --scope cluster \
  --configuration-settings \
    enableTraining=True \
    enableInference=True \
    inferenceRouterServiceType=LoadBalancer \
    sslCertPemFile=<path-to-cert> \
    sslKeyPemFile=<path-to-key>
```

## Step 3: Verify the Extension Installation

The installation can take 10-15 minutes. Monitor the progress:

```bash
# Check extension installation status
az k8s-extension show \
  --name azureml \
  --cluster-type managedClusters \
  --cluster-name myAKSCluster \
  --resource-group myResourceGroup \
  --query "{ \
    provisioningState: provisioningState, \
    version: version, \
    releaseTrain: releaseTrain \
  }" -o table

# Check that all Azure ML pods are running
kubectl get pods -n azureml --watch
```

You should see several pods in the `azureml` namespace:

```bash
# Expected pods in the azureml namespace
kubectl get pods -n azureml -o custom-columns=\
NAME:.metadata.name,\
STATUS:.status.phase,\
READY:.status.containerStatuses[0].ready
```

## Step 4: Attach the Cluster to Your ML Workspace

Now connect the AKS cluster to your Azure ML workspace as a compute target.

```bash
# Get the cluster's Azure Resource Manager ID
CLUSTER_ID=$(az aks show \
  --resource-group myResourceGroup \
  --name myAKSCluster \
  --query id -o tsv)

# Attach the cluster to the ML workspace
az ml compute attach \
  --resource-group myMLResourceGroup \
  --workspace-name myMLWorkspace \
  --type Kubernetes \
  --name aks-compute \
  --resource-id $CLUSTER_ID \
  --namespace azureml-workloads
```

Verify the attachment:

```bash
# Check the compute target status
az ml compute show \
  --resource-group myMLResourceGroup \
  --workspace-name myMLWorkspace \
  --name aks-compute \
  --query "{ \
    name: name, \
    provisioningState: provisioning_state, \
    type: type \
  }" -o table
```

## Step 5: Create Instance Types for Resource Allocation

Instance types define the CPU, memory, and GPU resources allocated to ML jobs. They map to Kubernetes resource requests and limits.

```yaml
# instance-types.yaml
# Define resource profiles for different ML workload types
apiVersion: amlarc.azureml.com/v1alpha1
kind: InstanceType
metadata:
  name: cpu-small
  namespace: azureml
spec:
  resources:
    requests:
      cpu: "2"
      memory: "4Gi"
    limits:
      cpu: "4"
      memory: "8Gi"
---
apiVersion: amlarc.azureml.com/v1alpha1
kind: InstanceType
metadata:
  name: cpu-large
  namespace: azureml
spec:
  resources:
    requests:
      cpu: "8"
      memory: "32Gi"
    limits:
      cpu: "16"
      memory: "64Gi"
---
apiVersion: amlarc.azureml.com/v1alpha1
kind: InstanceType
metadata:
  name: gpu-training
  namespace: azureml
spec:
  resources:
    requests:
      cpu: "4"
      memory: "16Gi"
      nvidia.com/gpu: "1"
    limits:
      cpu: "8"
      memory: "32Gi"
      nvidia.com/gpu: "1"
  nodeSelector:
    # Schedule GPU workloads on GPU node pool
    agentpool: gpupool
```

Apply the instance types:

```bash
kubectl apply -f instance-types.yaml
```

## Step 6: Submit a Training Job

With the compute target ready, submit a training job from the Azure ML CLI or SDK.

Using the CLI:

```yaml
# training-job.yaml
# Azure ML training job configuration targeting the AKS compute
$schema: https://azuremlschemas.azureedge.net/latest/commandJob.schema.json
type: command
compute: azureml:aks-compute
resources:
  instance_type: gpu-training
environment:
  image: mcr.microsoft.com/azureml/curated/pytorch-2.0-cuda11.8:latest
command: >
  python train.py
  --data-path ${{inputs.training_data}}
  --epochs 50
  --batch-size 32
inputs:
  training_data:
    type: uri_folder
    path: azureml://datastores/mydata/paths/training/
```

Submit it:

```bash
# Submit the training job to the AKS compute target
az ml job create \
  --resource-group myMLResourceGroup \
  --workspace-name myMLWorkspace \
  --file training-job.yaml
```

## Step 7: Deploy an Inference Endpoint

For real-time inference, deploy a model as a Kubernetes online endpoint.

```yaml
# endpoint.yaml
# Online endpoint configuration for model serving on AKS
$schema: https://azuremlschemas.azureedge.net/latest/kubernetesOnlineEndpoint.schema.json
name: my-model-endpoint
compute: azureml:aks-compute
auth_mode: key
```

```yaml
# deployment.yaml
# Model deployment configuration with resource allocation
$schema: https://azuremlschemas.azureedge.net/latest/kubernetesOnlineDeployment.schema.json
name: blue
endpoint_name: my-model-endpoint
model: azureml:my-model:1
environment:
  image: mcr.microsoft.com/azureml/curated/minimal-ubuntu20.04-py38-cpu-inference:latest
code_configuration:
  code: ./score
  scoring_script: score.py
instance_type: cpu-small
instance_count: 2
request_settings:
  request_timeout_ms: 3000
  max_concurrent_requests_per_instance: 10
```

Deploy:

```bash
# Create the endpoint
az ml online-endpoint create \
  --resource-group myMLResourceGroup \
  --workspace-name myMLWorkspace \
  --file endpoint.yaml

# Create the deployment
az ml online-deployment create \
  --resource-group myMLResourceGroup \
  --workspace-name myMLWorkspace \
  --file deployment.yaml

# Route all traffic to the blue deployment
az ml online-endpoint update \
  --resource-group myMLResourceGroup \
  --workspace-name myMLWorkspace \
  --name my-model-endpoint \
  --traffic "blue=100"
```

## Step 8: Test the Endpoint

Verify that the inference endpoint is serving predictions.

```bash
# Get the endpoint scoring URI
az ml online-endpoint show \
  --resource-group myMLResourceGroup \
  --workspace-name myMLWorkspace \
  --name my-model-endpoint \
  --query scoring_uri -o tsv

# Test the endpoint
az ml online-endpoint invoke \
  --resource-group myMLResourceGroup \
  --workspace-name myMLWorkspace \
  --name my-model-endpoint \
  --request-file sample-request.json
```

## Monitoring ML Workloads

The Azure ML extension integrates with Azure Monitor. You can view training job metrics, inference endpoint performance, and resource utilization in the Azure ML studio or through Azure Monitor dashboards.

```bash
# Check running ML jobs on the cluster
kubectl get jobs -n azureml-workloads

# Check inference endpoint pods
kubectl get pods -n azureml-workloads -l app=azureml-inference

# View Azure ML extension logs
kubectl logs -n azureml -l app.kubernetes.io/component=gateway --tail=50
```

## Troubleshooting

Common issues when running Azure ML on AKS:

**Training jobs stuck in Queued state**: Usually a resource problem. Check that the node pool has enough capacity for the instance type and that the cluster autoscaler can scale up.

**Inference endpoint returns 503**: The model may be failing to load. Check the deployment pod logs in the `azureml-workloads` namespace.

**Extension installation fails**: Make sure the cluster has enough resources for the extension components. The extension itself needs about 4 CPU cores and 8 GB of memory across its pods.

**GPU not detected**: Ensure the NVIDIA device plugin is installed on your GPU node pool. AKS installs it automatically on GPU node pools, but verify with `kubectl get ds -n kube-system | grep nvidia`.

Running Azure ML workloads on AKS gives you the best of both worlds - the managed ML lifecycle from Azure ML and the infrastructure control from Kubernetes. It is especially valuable for teams that already have significant AKS infrastructure and want to avoid the cost and complexity of maintaining separate compute for ML.
