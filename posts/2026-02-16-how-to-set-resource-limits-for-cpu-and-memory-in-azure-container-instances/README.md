# How to Set Resource Limits for CPU and Memory in Azure Container Instances

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Container Instances, Resource Limits, CPU, Memory, Performance, Cloud Computing

Description: How to configure CPU and memory resource requests and limits for Azure Container Instances to optimize performance and control costs.

---

Getting resource allocation right in Azure Container Instances (ACI) directly affects both the performance of your containers and how much you pay. Allocate too little and your containers get throttled or killed. Allocate too much and you are wasting money on resources you do not use. ACI uses a request/limit model that gives you control over both the guaranteed resources and the maximum resources your containers can consume.

This post covers how the resource model works in ACI, how to set appropriate values, and how to troubleshoot resource-related issues.

## How Resources Work in ACI

ACI has two concepts for resource allocation:

- **Requests** - The guaranteed amount of CPU and memory that your container gets. ACI reserves these resources for your container. You are billed based on requests.
- **Limits** - The maximum amount of CPU and memory your container can use. If the container tries to use more than the limit, it gets throttled (CPU) or killed (memory).

If you only specify requests (which is the most common case), the limits default to the same values as the requests.

## Setting Resource Requests

### Using Azure CLI

```bash
# Create a container with specific CPU and memory requests
az container create \
    --resource-group my-resource-group \
    --name my-container \
    --image myregistry.azurecr.io/my-app:latest \
    --cpu 2 \
    --memory 4 \
    --ports 8080 \
    --ip-address Public
```

The `--cpu` flag accepts decimal values (0.5, 1, 1.5, 2, etc.) and `--memory` is in GB.

### Using YAML

YAML gives you the ability to set both requests and limits:

```yaml
# resource-config.yaml - Container with explicit resource requests and limits
apiVersion: '2021-09-01'
location: eastus
name: my-app
properties:
  containers:
    - name: web-app
      properties:
        image: myregistry.azurecr.io/web-app:latest
        resources:
          # Guaranteed resources
          requests:
            cpu: 1.0
            memoryInGb: 2.0
          # Maximum resources (optional - defaults to requests if not set)
          limits:
            cpu: 2.0
            memoryInGb: 4.0
        ports:
          - port: 8080
            protocol: TCP
  osType: Linux
  ipAddress:
    type: Public
    ports:
      - port: 8080
        protocol: TCP
type: Microsoft.ContainerInstance/containerGroups
```

In this example, the container is guaranteed 1 CPU core and 2 GB of memory, but can burst up to 2 CPU cores and 4 GB if the host has capacity available.

## Resource Limits for Container Groups

When you have multiple containers in a group, the total resources for the group are the sum of all container requests. ACI allocates resources at the group level.

```yaml
# multi-container-resources.yaml - Resource allocation across containers
apiVersion: '2021-09-01'
location: eastus
name: multi-container-group
properties:
  containers:
    # Main application - gets the bulk of resources
    - name: web-app
      properties:
        image: myregistry.azurecr.io/web-app:latest
        resources:
          requests:
            cpu: 1.5
            memoryInGb: 3.0
          limits:
            cpu: 2.0
            memoryInGb: 4.0
        ports:
          - port: 80
            protocol: TCP

    # Sidecar - lightweight, needs fewer resources
    - name: log-forwarder
      properties:
        image: myregistry.azurecr.io/log-forwarder:latest
        resources:
          requests:
            cpu: 0.5
            memoryInGb: 0.5
          limits:
            cpu: 0.5
            memoryInGb: 1.0

  # Total group resources: 2.0 CPU, 3.5 GB memory (sum of requests)
  osType: Linux
  ipAddress:
    type: Public
    ports:
      - port: 80
        protocol: TCP
type: Microsoft.ContainerInstance/containerGroups
```

## Available Resource Tiers

ACI has specific resource combinations you can use. Not every CPU/memory combination is valid. Here are the general ranges:

For Linux containers:
- CPU: 0.25 to 4.0 cores (per container)
- Memory: 0.5 to 16 GB (per container)
- Maximum per container group: 4 CPU cores and 16 GB memory

For Windows containers:
- CPU: 1.0 to 4.0 cores
- Memory: 1.0 to 16 GB

The available combinations depend on the Azure region. Some regions support higher limits.

```bash
# Check available resource capabilities in your region
az container list-capabilities \
    --location eastus \
    --output table
```

## Choosing the Right Resource Values

### CPU Sizing

CPU allocation in ACI represents virtual CPU cores. Here are rough guidelines based on workload type:

- **0.25 - 0.5 CPU** - Very lightweight tasks like cron jobs, health checkers, or simple scripts
- **0.5 - 1.0 CPU** - Light web servers, APIs with low traffic, background workers
- **1.0 - 2.0 CPU** - Moderate web applications, API servers with medium traffic
- **2.0 - 4.0 CPU** - CPU-intensive workloads like data processing, image processing, or high-traffic APIs

To figure out what your application actually needs, measure it. Run your container locally and monitor CPU usage under realistic load:

```bash
# Monitor CPU usage of a running container locally
docker stats my-container --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}"
```

### Memory Sizing

Memory is usually the more critical dimension. If a container exceeds its memory limit, it gets killed (OOMKilled). CPU throttling is annoying but recoverable - memory exhaustion is fatal.

Guidelines:

- **0.5 - 1.0 GB** - Simple scripts, lightweight APIs, Go applications
- **1.0 - 2.0 GB** - Node.js applications, Python APIs, small Java applications
- **2.0 - 4.0 GB** - Java applications with default heap sizes, .NET applications with moderate data
- **4.0+ GB** - Data-intensive processing, large in-memory caches, ML inference

Always set memory limits higher than your peak usage to account for spikes and garbage collection overhead.

## Monitoring Resource Usage

Check how much CPU and memory your running container is actually using:

```bash
# View container metrics including CPU and memory usage
az container show \
    --resource-group my-resource-group \
    --name my-container \
    --query "containers[0].instanceView" \
    --output json
```

For more detailed monitoring, use Azure Monitor metrics:

```bash
# Query CPU usage over the last hour
az monitor metrics list \
    --resource "/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.ContainerInstance/containerGroups/{name}" \
    --metric "CpuUsage" \
    --interval PT1M \
    --output table

# Query memory usage
az monitor metrics list \
    --resource "/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.ContainerInstance/containerGroups/{name}" \
    --metric "MemoryUsage" \
    --interval PT1M \
    --output table
```

## What Happens When Resources Are Exceeded

### CPU Limit Exceeded

When a container tries to use more CPU than its limit, it gets throttled. The container still runs but at reduced performance. You will see higher response times and slower processing.

Signs of CPU throttling:
- Increased response times without a corresponding increase in traffic
- Background tasks taking longer than expected
- CPU metrics consistently at or near the limit

### Memory Limit Exceeded

When a container exceeds its memory limit, ACI kills the container (similar to the Linux OOM killer). Depending on the restart policy:

- `Always` - ACI restarts the container automatically
- `OnFailure` - ACI restarts the container (OOM kill counts as a failure)
- `Never` - The container stays dead

Signs of memory issues:
- Container restarts in the event log with exit code 137 (OOM killed)
- Gradually increasing memory usage over time (memory leak)
- Sudden memory spikes during specific operations

Check the container events to see if OOM kills are happening:

```bash
# Look for restart events that might indicate OOM kills
az container show \
    --resource-group my-resource-group \
    --name my-container \
    --query "containers[0].instanceView.events" \
    --output table
```

## Cost Optimization

ACI bills per second based on the requested CPU and memory. Here are strategies to keep costs down:

### Right-Size Your Containers

Do not request more resources than you need. If your container uses 0.3 CPU cores on average, requesting 2 cores means you are paying for 1.7 unused cores.

### Use the Request/Limit Model

Set requests to your baseline usage and limits higher for burst capacity. You pay for requests, not limits. This way, your container gets extra resources when available without paying for them at all times.

### Clean Up Idle Containers

ACI charges as long as the container group exists, even if it is stopped. Delete container groups you are not using:

```bash
# Delete container groups that are no longer needed
az container delete \
    --resource-group my-resource-group \
    --name my-container \
    --yes
```

### Use Spot Containers for Batch Workloads

For fault-tolerant batch processing, consider using spot containers which offer significant discounts in exchange for the possibility of preemption.

## Resource Quotas

Azure has subscription-level quotas for ACI resources:

- Default: 100 container groups per subscription per region
- Default: 100 CPU cores per subscription per region
- Default: 100 GB memory per subscription per region

Check your current usage:

```bash
# Check ACI quotas and usage for your subscription
az container list \
    --resource-group my-resource-group \
    --query "[].{name:name, cpu:containers[0].resources.requests.cpu, memory:containers[0].resources.requests.memoryInGb}" \
    --output table
```

If you hit quota limits, request an increase through the Azure Portal under Subscriptions > Usage + quotas.

## Summary

Resource configuration in ACI is a balancing act between performance and cost. Start with conservative requests based on your workload profile, set limits higher for burst capacity, and monitor actual usage to fine-tune over time. Always leave a margin above peak usage for memory to avoid OOM kills, and keep an eye on CPU metrics to catch throttling before it impacts your users. The per-second billing model makes it important to right-size your containers, so review your resource allocation periodically and adjust based on real data.
