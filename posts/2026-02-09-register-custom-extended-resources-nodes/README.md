# How to Register Custom Extended Resources on Kubernetes Nodes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Resource Management, Extended Resources

Description: Learn how to register and advertise custom extended resources on Kubernetes nodes to track specialized hardware, licenses, or custom capacity beyond CPU and memory.

---

Kubernetes tracks CPU and memory by default, but what if you need to manage specialized resources like FPGA cards, software licenses, or custom hardware accelerators? Extended resources let you advertise and schedule workloads based on any resource type you define. This guide shows you how to register custom extended resources on your nodes.

## What Are Extended Resources?

Extended resources are custom resource types that live outside the standard CPU and memory namespace. They let you:

- Track specialized hardware like GPUs, FPGAs, or network cards
- Manage software licenses or seats
- Advertise custom capacity metrics (database connections, API rate limits)
- Schedule pods based on resource availability

Extended resources must be integer quantities and are advertised at the node level. Once registered, the scheduler treats them like any other resource.

## How Extended Resources Work

Extended resources use the `kubernetes.io/` or custom domain prefix in their name. You advertise them by patching the node's capacity and allocatable fields. The kubelet doesn't track these resources automatically - you must update them via the API server.

The workflow:

1. Register the resource by patching node status
2. Pods request the resource in their spec
3. The scheduler places pods only on nodes with available capacity
4. The scheduler decrements available capacity when scheduling

## Registering an Extended Resource

To register a custom resource, patch the node's status. Here's how to add 4 units of a custom FPGA resource:

```bash
# Register 4 FPGA cards on node worker-1
kubectl proxy &
PROXY_PID=$!

curl --header "Content-Type: application/json-patch+json" \
  --request PATCH \
  --data '[{"op": "add", "path": "/status/capacity/example.com~1fpga", "value": "4"}]' \
  http://localhost:8001/api/v1/nodes/worker-1/status

kill $PROXY_PID
```

The tilde (`~1`) escapes the forward slash in the resource name. After this patch, the node advertises 4 FPGA units.

## Using kubectl to Register Resources

You can also use kubectl with a JSON patch:

```bash
kubectl patch node worker-1 --type='json' \
  -p='[{"op": "add", "path": "/status/capacity/example.com~1fpga", "value": "4"}]'
```

Verify the resource appears in node capacity:

```bash
kubectl get node worker-1 -o jsonpath='{.status.capacity}' | jq
```

You should see your custom resource listed alongside cpu and memory.

## Requesting Extended Resources in Pods

Once registered, pods can request the resource in their containers:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: fpga-workload
spec:
  containers:
  - name: app
    image: fpga-processor:latest
    resources:
      requests:
        example.com/fpga: "2"
      limits:
        example.com/fpga: "2"
```

This pod requests 2 FPGA units. The scheduler will only place it on nodes with at least 2 available FPGAs.

## Extended Resources vs Device Plugins

Extended resources are simple but manual. For complex hardware with health checks and allocation logic, use device plugins instead. Device plugins automatically register extended resources and handle device lifecycle.

Use extended resources when:

- The resource is simple (licenses, abstract capacity)
- You don't need per-device health monitoring
- You want manual control over advertisement

Use device plugins when:

- The resource is physical hardware
- You need health checks and hot-plug support
- You want automatic discovery and registration

## Building a Resource Advertisement Controller

For dynamic resources, build a controller that watches capacity and updates node status. Here's a simple example in Python:

```python
from kubernetes import client, config, watch
import time

config.load_kube_config()
v1 = client.CoreV1Api()

def get_fpga_count():
    # Your logic to detect FPGAs
    # This could query hardware, check licenses, etc.
    return 4

def advertise_resource(node_name, resource_name, quantity):
    patch_body = [{
        "op": "add",
        "path": f"/status/capacity/{resource_name.replace('/', '~1')}",
        "value": str(quantity)
    }]

    v1.patch_node_status(
        name=node_name,
        body=patch_body
    )

# Run on each node
node_name = "worker-1"
fpga_count = get_fpga_count()
advertise_resource(node_name, "example.com/fpga", fpga_count)

# Periodically update
while True:
    current_count = get_fpga_count()
    advertise_resource(node_name, "example.com/fpga", current_count)
    time.sleep(60)
```

Run this as a DaemonSet to advertise resources on all nodes automatically.

## Managing Software Licenses as Extended Resources

Extended resources work well for software licenses. Here's how to advertise 10 MATLAB licenses:

```bash
kubectl patch node worker-1 --type='json' \
  -p='[{"op": "add", "path": "/status/capacity/example.com~1matlab-license", "value": "10"}]'
```

Pods requesting licenses:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: matlab-job
spec:
  containers:
  - name: matlab
    image: matlab:r2024a
    resources:
      requests:
        example.com/matlab-license: "1"
      limits:
        example.com/matlab-license: "1"
```

The scheduler ensures no more than 10 MATLAB pods run simultaneously across all nodes advertising the license.

## Handling Resource Updates

Extended resources don't persist across kubelet restarts. If the kubelet restarts, you must re-advertise resources. Use a DaemonSet or systemd service to re-register resources on node startup.

Here's a systemd unit that runs on boot:

```ini
[Unit]
Description=Register FPGA Extended Resources
After=kubelet.service

[Service]
Type=oneshot
ExecStart=/usr/local/bin/register-fpga-resources.sh
RemainAfterExit=yes

[Install]
WantedBy=multi-user.target
```

The script uses kubectl or the API to patch the node status.

## Removing Extended Resources

To remove a resource, set its capacity to zero or remove the key:

```bash
kubectl patch node worker-1 --type='json' \
  -p='[{"op": "remove", "path": "/status/capacity/example.com~1fpga"}]'
```

Existing pods using the resource continue running, but new pods cannot schedule.

## Monitoring Extended Resource Usage

Check resource allocation with kubectl:

```bash
kubectl describe node worker-1 | grep -A 5 "Allocated resources"
```

You'll see your extended resource alongside CPU and memory with requests and limits.

For more detailed monitoring, query the metrics API:

```bash
kubectl get --raw /apis/metrics.k8s.io/v1beta1/nodes/worker-1
```

## Common Pitfalls

**Resource Names Must Use Domain Prefix**: Avoid using the `kubernetes.io` prefix - it's reserved. Use your own domain like `example.com/resource-name`.

**Only Integer Quantities**: Extended resources must be whole numbers. You can't advertise 2.5 units.

**No Kubelet Tracking**: The kubelet doesn't validate extended resource usage. If you advertise 4 FPGAs but only have 2, the kubelet won't detect the mismatch.

**Manual Synchronization**: You must keep the advertised capacity in sync with actual availability. Build automation to handle this.

## Best Practices

- Use descriptive names: `company.com/gpu-a100` is clearer than `company.com/gpu`
- Build automated controllers for dynamic resources
- Document resource semantics in your team's runbook
- Monitor actual vs advertised capacity
- Use ResourceQuotas to prevent overconsumption
- Consider device plugins for hardware resources

## Real-World Example: Database Connection Pools

Here's a creative use case: advertising available database connection slots. If you have a database that supports 100 connections, advertise them as an extended resource:

```bash
kubectl patch node db-node --type='json' \
  -p='[{"op": "add", "path": "/status/capacity/example.com~1db-connections", "value": "100"}]'
```

Pods that connect to the database request connections:

```yaml
resources:
  requests:
    example.com/db-connections: "5"
  limits:
    example.com/db-connections: "5"
```

This prevents over-subscription at the scheduler level, though you still need application-level connection pooling.

## Conclusion

Extended resources give you flexibility to track any resource type in Kubernetes. They're simple to implement but require manual management. For physical hardware, consider device plugins. For abstract resources like licenses or capacity limits, extended resources are perfect. Build automation to keep advertised capacity synchronized with reality, and use descriptive naming to make resource semantics clear to your team.
