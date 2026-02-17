# How to Deploy a Microservice to Azure Container Apps with Custom Scaling Rules

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Container Apps, Microservices, Scaling, Cloud, DevOps, Serverless

Description: Learn how to deploy a microservice to Azure Container Apps and configure custom scaling rules based on HTTP traffic, CPU, and external metrics.

---

Azure Container Apps is a fully managed serverless container platform that lets you run microservices without worrying about the underlying infrastructure. One of its strongest features is the built-in scaling engine powered by KEDA, which allows you to define custom scaling rules that go well beyond simple CPU thresholds. In this guide, I will walk you through deploying a microservice and setting up scaling rules that actually match your workload.

## Prerequisites

Before you start, make sure you have the following ready:

- An Azure subscription
- Azure CLI installed (version 2.45 or later)
- A container image pushed to Azure Container Registry (ACR) or Docker Hub
- Basic familiarity with the command line

## Step 1: Create the Environment

Azure Container Apps run inside a Container Apps Environment. Think of it as a logical boundary for your apps, similar to a Kubernetes namespace but with built-in networking and logging.

The following command creates a resource group and a Container Apps environment.

```bash
# Create a resource group in East US
az group create --name my-rg --location eastus

# Create the Container Apps environment
az containerapp env create \
  --name my-env \
  --resource-group my-rg \
  --location eastus
```

## Step 2: Deploy Your Microservice

Now deploy the actual container. For this example, I will use a simple Node.js API that processes incoming HTTP requests.

```bash
# Deploy the container app with basic settings
az containerapp create \
  --name order-service \
  --resource-group my-rg \
  --environment my-env \
  --image myregistry.azurecr.io/order-service:v1 \
  --target-port 3000 \
  --ingress external \
  --min-replicas 1 \
  --max-replicas 10 \
  --cpu 0.5 \
  --memory 1.0Gi
```

This creates a container app called `order-service` with external ingress on port 3000. It will start with 1 replica and scale up to 10 based on the scaling rules you define.

## Step 3: Configure HTTP Scaling Rules

The default scaling behavior in Azure Container Apps is based on concurrent HTTP requests. You can customize the threshold to match your application's capacity.

Here is how to set an HTTP scaling rule where each replica handles up to 50 concurrent requests.

```bash
# Update the app with a custom HTTP scaling rule
az containerapp update \
  --name order-service \
  --resource-group my-rg \
  --scale-rule-name http-scaling \
  --scale-rule-type http \
  --scale-rule-http-concurrency 50
```

With this rule, if there are 200 concurrent requests, the platform will scale to 4 replicas. If traffic drops, replicas scale back down.

## Step 4: Add a Custom Scaling Rule Based on Azure Queue

HTTP scaling is great, but many microservices process work from queues. Azure Container Apps supports KEDA scalers, which means you can scale based on Azure Storage Queue length, Service Bus queue depth, and many other triggers.

Here is an example using an Azure Storage Queue scaler. The container app will create new replicas when the queue length exceeds 5 messages per replica.

```json
{
  "properties": {
    "template": {
      "scale": {
        "minReplicas": 0,
        "maxReplicas": 20,
        "rules": [
          {
            "name": "queue-scaling",
            "custom": {
              "type": "azure-queue",
              "metadata": {
                "queueName": "order-queue",
                "queueLength": "5",
                "accountName": "mystorageaccount"
              },
              "auth": [
                {
                  "secretRef": "storage-connection",
                  "triggerParameter": "connection"
                }
              ]
            }
          }
        ]
      }
    }
  }
}
```

Notice the `minReplicas` is set to 0. This means the app scales to zero when the queue is empty, saving costs. When messages arrive, KEDA triggers a scale-up.

## Step 5: Combine Multiple Scaling Rules

You are not limited to a single scaling rule. You can combine HTTP and custom scalers, and Azure Container Apps will scale based on whichever rule demands the most replicas.

```json
{
  "properties": {
    "template": {
      "scale": {
        "minReplicas": 1,
        "maxReplicas": 30,
        "rules": [
          {
            "name": "http-rule",
            "http": {
              "metadata": {
                "concurrentRequests": "50"
              }
            }
          },
          {
            "name": "queue-rule",
            "custom": {
              "type": "azure-queue",
              "metadata": {
                "queueName": "order-queue",
                "queueLength": "10",
                "accountName": "mystorageaccount"
              },
              "auth": [
                {
                  "secretRef": "storage-connection",
                  "triggerParameter": "connection"
                }
              ]
            }
          }
        ]
      }
    }
  }
}
```

## Understanding the Scaling Behavior

When you deploy with multiple rules, the scaling engine evaluates all of them in parallel. The replica count is determined by the rule that requires the highest number of replicas at any given moment. This ensures your application can handle both HTTP traffic spikes and queue backlogs simultaneously.

The scale-down behavior is more conservative by design. The platform waits for a stabilization period before reducing replicas to avoid flapping. Typically, you will see a cooldown of about 5 minutes before replicas are removed.

## Step 6: Verify Scaling

After deploying, you can check the current replica count and revision status.

```bash
# Check the current replica count
az containerapp replica list \
  --name order-service \
  --resource-group my-rg \
  --revision order-service--revision-name

# View the scaling configuration
az containerapp show \
  --name order-service \
  --resource-group my-rg \
  --query "properties.template.scale"
```

You can also monitor scaling events in the Azure Portal under the "Metrics" tab, where you can see replica count over time plotted against request volume.

## Common Scaling Patterns

Here are some patterns I have found useful in production:

**Scale-to-zero for background workers:** If your microservice only processes messages from a queue, set `minReplicas` to 0. This saves money during off-hours while handling bursts automatically.

**Fixed minimum for APIs:** For user-facing APIs, keep `minReplicas` at 1 or higher. Cold starts from zero can add noticeable latency (a few seconds depending on image size).

**Aggressive scaling for batch processing:** If your workload is bursty, lower the `queueLength` threshold. Setting it to 1 means each message gets its own replica, which is great for CPU-heavy tasks.

**Conservative scaling for stateful services:** If your service holds in-memory state or connections, increase the stabilization window by setting higher thresholds so replicas are not churned frequently.

## Troubleshooting

If scaling does not work as expected, check the following:

1. Make sure secrets referenced in scaling rules are correctly configured in the Container App.
2. Verify that the connection string or account name is correct and the Container App has access.
3. Check the system logs in Log Analytics for KEDA-related errors.
4. Ensure `minReplicas` and `maxReplicas` are set to reasonable values.

## Wrapping Up

Azure Container Apps makes it straightforward to deploy microservices with production-ready scaling rules. The KEDA integration gives you access to dozens of scalers out of the box, from HTTP concurrency to external event sources like queues and databases. By combining multiple rules, you can build a scaling strategy that matches how your application actually behaves under load.

Start with the defaults, observe how your application scales, and then fine-tune the thresholds. Scaling is one of those things that benefits from iteration rather than trying to get it perfect on the first try.
