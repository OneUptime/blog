# How to Run Docker Containers on Azure Container Instances

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Azure, Azure Container Instances, ACI, Cloud, Serverless Containers, DevOps

Description: Learn how to deploy Docker containers to Azure Container Instances for quick, serverless container execution without managing infrastructure.

---

Azure Container Instances (ACI) runs Docker containers in Azure without managing virtual machines or Kubernetes clusters. You give it an image, and it runs. No cluster provisioning, no node management, no orchestrator to configure. ACI is ideal for batch jobs, development environments, CI/CD tasks, and simple web applications that do not need the full complexity of Kubernetes.

## What ACI Offers

ACI provides per-second billing, fast startup (typically under 30 seconds), and supports both Linux and Windows containers. You can allocate CPU and memory precisely, mount Azure file shares as volumes, and connect containers to Azure Virtual Networks for private networking. Container groups let you run multiple containers together, similar to a Kubernetes pod.

```mermaid
flowchart LR
    A[Docker Image] --> B[Azure Container Instances]
    B --> C[Public IP or VNET]
    B --> D[Azure File Share]
    B --> E[Logs / Monitoring]
```

## Prerequisites

```bash
# Install Azure CLI
brew install azure-cli  # macOS
# or: curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash  # Linux

# Login to Azure
az login

# Set your subscription
az account set --subscription YOUR_SUBSCRIPTION_ID

# Create a resource group
az group create --name myResourceGroup --location eastus
```

## Running Your First Container

The simplest deployment uses a public image:

```bash
# Run an Nginx container on ACI
az container create \
    --resource-group myResourceGroup \
    --name my-nginx \
    --image nginx:alpine \
    --ports 80 \
    --dns-name-label my-nginx-demo \
    --cpu 1 \
    --memory 1

# Get the public URL
az container show \
    --resource-group myResourceGroup \
    --name my-nginx \
    --query ipAddress.fqdn \
    --output tsv
# Output: my-nginx-demo.eastus.azurecontainer.io
```

Open `http://my-nginx-demo.eastus.azurecontainer.io` in your browser to see the Nginx welcome page.

## Running a Custom Image from ACR

For private images stored in Azure Container Registry:

```bash
# First, push your image to ACR (see related guide)
# Then create a container instance from it

az container create \
    --resource-group myResourceGroup \
    --name myapp \
    --image myregistry.azurecr.io/myapp:v1.0.0 \
    --registry-login-server myregistry.azurecr.io \
    --registry-username $ACR_USERNAME \
    --registry-password $ACR_PASSWORD \
    --ports 8080 \
    --dns-name-label myapp-demo \
    --cpu 2 \
    --memory 4
```

For a cleaner approach, use a managed identity:

```bash
# Create a user-assigned managed identity
az identity create \
    --resource-group myResourceGroup \
    --name aci-pull-identity

# Get the identity's principal ID and resource ID
IDENTITY_ID=$(az identity show --resource-group myResourceGroup --name aci-pull-identity --query id --output tsv)
PRINCIPAL_ID=$(az identity show --resource-group myResourceGroup --name aci-pull-identity --query principalId --output tsv)

# Grant the identity pull access to ACR
ACR_ID=$(az acr show --name myregistry --query id --output tsv)
az role assignment create --assignee $PRINCIPAL_ID --role AcrPull --scope $ACR_ID

# Create the container with the managed identity
az container create \
    --resource-group myResourceGroup \
    --name myapp \
    --image myregistry.azurecr.io/myapp:v1.0.0 \
    --assign-identity $IDENTITY_ID \
    --acr-identity $IDENTITY_ID \
    --ports 8080 \
    --dns-name-label myapp-demo \
    --cpu 2 \
    --memory 4
```

## Environment Variables and Configuration

Pass configuration to your containers using environment variables:

```bash
# Create a container with environment variables
az container create \
    --resource-group myResourceGroup \
    --name myapp \
    --image myregistry.azurecr.io/myapp:v1.0.0 \
    --registry-login-server myregistry.azurecr.io \
    --registry-username $ACR_USERNAME \
    --registry-password $ACR_PASSWORD \
    --ports 8080 \
    --environment-variables \
        NODE_ENV=production \
        API_URL=https://api.example.com \
    --secure-environment-variables \
        DATABASE_URL=postgres://user:pass@host:5432/db \
        API_KEY=secret-key-here \
    --cpu 1 \
    --memory 2
```

Secure environment variables are encrypted and not visible in the container properties.

## Container Groups (Multi-Container Pods)

Run multiple containers together that share networking and lifecycle, similar to a Kubernetes pod:

```yaml
# deploy.yaml - Container group with app and sidecar
apiVersion: '2023-05-01'
location: eastus
name: myapp-group
properties:
  containers:
    - name: app
      properties:
        image: myregistry.azurecr.io/myapp:v1.0.0
        ports:
          - port: 8080
        resources:
          requests:
            cpu: 1
            memoryInGb: 2
        environmentVariables:
          - name: PORT
            value: '8080'

    - name: log-collector
      properties:
        image: fluent/fluent-bit:latest
        resources:
          requests:
            cpu: 0.5
            memoryInGb: 0.5
        volumeMounts:
          - name: logs
            mountPath: /var/log/app

  osType: Linux
  ipAddress:
    type: Public
    ports:
      - port: 8080
    dnsNameLabel: myapp-group-demo

  imageRegistryCredentials:
    - server: myregistry.azurecr.io
      username: $ACR_USERNAME
      password: $ACR_PASSWORD

  volumes:
    - name: logs
      emptyDir: {}

type: Microsoft.ContainerInstance/containerGroups
```

Deploy the container group:

```bash
# Deploy using the YAML template
az container create \
    --resource-group myResourceGroup \
    --file deploy.yaml
```

## Persistent Storage with Azure File Shares

Mount Azure Files for persistent data that survives container restarts:

```bash
# Create a storage account and file share
az storage account create \
    --resource-group myResourceGroup \
    --name myappstorageacct \
    --sku Standard_LRS

STORAGE_KEY=$(az storage account keys list \
    --resource-group myResourceGroup \
    --account-name myappstorageacct \
    --query '[0].value' --output tsv)

az storage share create \
    --account-name myappstorageacct \
    --name myapp-data \
    --quota 10

# Create the container with the file share mounted
az container create \
    --resource-group myResourceGroup \
    --name myapp \
    --image myregistry.azurecr.io/myapp:v1.0.0 \
    --registry-login-server myregistry.azurecr.io \
    --registry-username $ACR_USERNAME \
    --registry-password $ACR_PASSWORD \
    --ports 8080 \
    --azure-file-volume-account-name myappstorageacct \
    --azure-file-volume-account-key $STORAGE_KEY \
    --azure-file-volume-share-name myapp-data \
    --azure-file-volume-mount-path /app/data \
    --cpu 1 \
    --memory 2
```

## Monitoring and Logs

View container logs and metrics:

```bash
# View live container logs
az container logs \
    --resource-group myResourceGroup \
    --name myapp

# Stream logs in real time (like docker logs -f)
az container attach \
    --resource-group myResourceGroup \
    --name myapp

# Get container events and status
az container show \
    --resource-group myResourceGroup \
    --name myapp \
    --query '{status:instanceView.state, events:instanceView.events}' \
    --output json

# Execute a command inside the running container
az container exec \
    --resource-group myResourceGroup \
    --name myapp \
    --exec-command "/bin/sh"
```

## Restart Policies

Control what happens when a container exits:

```bash
# Always restart (for long-running services)
az container create \
    --resource-group myResourceGroup \
    --name web-server \
    --image myapp:latest \
    --restart-policy Always \
    --ports 8080

# Never restart (for batch jobs)
az container create \
    --resource-group myResourceGroup \
    --name batch-job \
    --image myapp:latest \
    --restart-policy Never \
    --command-line "python process_data.py"

# Restart on failure only
az container create \
    --resource-group myResourceGroup \
    --name worker \
    --image myapp:latest \
    --restart-policy OnFailure
```

## Cleanup

Remove containers when you are done to stop billing:

```bash
# Delete a specific container instance
az container delete \
    --resource-group myResourceGroup \
    --name myapp \
    --yes

# List all container instances in a resource group
az container list \
    --resource-group myResourceGroup \
    --output table
```

## When to Use ACI vs AKS

ACI is the right choice for simple deployments, batch processing, event-driven workloads, and development environments. If you need auto-scaling across multiple replicas, service mesh, rolling updates, or complex networking, use AKS (Azure Kubernetes Service) instead.

ACI also works well as a burst target for AKS. The Virtual Kubelet project lets AKS schedule pods on ACI when the cluster runs out of capacity.

Azure Container Instances strips away infrastructure management and lets you focus on your containers. You specify the image, resources, and networking, and Azure handles the rest. For workloads that do not need orchestration, ACI delivers fast deployment, per-second billing, and zero operational overhead.
