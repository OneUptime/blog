# How to Deploy Containers to Azure ACI via Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Azure, ACI, Container Instances, Cloud

Description: Learn how to deploy containers to Azure Container Instances (ACI) using Portainer as a management interface.

## What Is Azure Container Instances?

Azure Container Instances (ACI) is a serverless container service that runs containers without managing virtual machines. You pay per second of execution. ACI is ideal for:

- Short-lived batch jobs
- Event-driven workloads
- Burst capacity for Kubernetes clusters
- Quick demos and testing

## Connecting Portainer to Azure ACI

Portainer talks to Azure Resource Manager directly using a service principal, so no extra Docker context setup is required on the Portainer host (Docker's own ACI context integration was retired in November 2023).

### Step 1: Create an Azure Service Principal

In the Azure Portal, register an application under **Microsoft Entra ID > App registrations**, then create a client secret under **Certificates & secrets**. Grant the service principal the **Contributor** role on the resource group where containers will be deployed.

### Step 2: Add the ACI Environment in Portainer

1. In Portainer, go to **Environments > Add environment**.
2. Select **Azure ACI** as the environment type and click **Start Wizard**.
3. Enter your Azure details:
   - **Name** (a label for the environment)
   - **Subscription ID**
   - **Tenant ID**
   - **Client ID** (Application ID of the registered app)
   - **Client Secret** (Authentication Key)
   - **Resource group**
   - **Location** (e.g. `eastus`)
4. Click **Connect**.

## Deploying a Container to ACI via Portainer

Once the ACI environment is connected:

1. Navigate to the ACI environment.
2. Go to **Containers > Add container**.
3. Configure:
   - **Image**: Container image (e.g., `nginx:alpine`).
   - **CPU and memory**: Resource allocation.
   - **Ports**: Port mappings.
   - **Environment variables**: Configuration.
4. Click **Deploy the container**.

## Equivalent Azure CLI Deployment

```bash
# Deploy a container to ACI via CLI
az container create \
  --resource-group my-resource-group \
  --name my-container \
  --image nginx:alpine \
  --cpu 1 \
  --memory 1 \
  --ports 80 \
  --ip-address Public \
  --location eastus

# Check deployment status
az container show \
  --resource-group my-resource-group \
  --name my-container \
  --query "{status:instanceView.state, fqdn:ipAddress.fqdn}"

# View container logs
az container logs \
  --resource-group my-resource-group \
  --name my-container
```

## ACI with a Custom Registry

```bash
# Deploy from a private registry
az container create \
  --resource-group my-resource-group \
  --name my-app \
  --image registry.mycompany.com/my-app:latest \
  --registry-login-server registry.mycompany.com \
  --registry-username myuser \
  --registry-password mypassword \
  --cpu 1 \
  --memory 2
```

## Cost Considerations

ACI pricing is per second:
- vCPU: ~$0.0000135/second (~$1.17/day for 1 vCPU)
- Memory: ~$0.0000015/GB-second

For workloads running continuously, ACI becomes more expensive than a small VM. Use ACI for:
- Workloads running < 8 hours/day
- Bursty or event-driven processing
- Development and testing

## Conclusion

Portainer's Azure ACI integration lets you manage serverless containers alongside your Swarm and Kubernetes workloads from a single interface. ACI is best for sporadic, short-lived workloads where you want to avoid VM overhead.
