# How to Use Azure VM Scale Sets with Azure Load Balancer and Health Probes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, VM Scale Sets, Load Balancer, Health Probes, High Availability, Traffic Distribution

Description: A complete guide to integrating Azure VM Scale Sets with Azure Load Balancer including health probe configuration and traffic management.

---

An Azure VM Scale Set without a load balancer is just a collection of VMs. Add a load balancer with properly configured health probes, and it becomes a resilient, self-healing application tier that distributes traffic across healthy instances and automatically removes unhealthy ones from rotation. The combination of scale sets and load balancers is the foundation for most scalable web applications on Azure.

This guide covers the full integration - from creating the load balancer to configuring health probes, setting up NAT rules for individual instance access, and troubleshooting common issues.

## Choosing Between Load Balancer SKUs

Azure offers two Load Balancer SKUs:

**Basic Load Balancer**: Free, supports up to 300 instances, no availability zone support, limited diagnostics. Being deprecated for production use.

**Standard Load Balancer**: Paid, supports up to 1000 instances, zone-redundant, comprehensive diagnostics and metrics. Required for production workloads.

Always use Standard Load Balancer for production scale sets.

```bash
# Create a Standard Load Balancer
az network lb create \
  --resource-group myResourceGroup \
  --name myLoadBalancer \
  --sku Standard \
  --frontend-ip-name myFrontendIP \
  --backend-pool-name myBackendPool \
  --public-ip-address myPublicIP

# Create the public IP first if it does not exist
az network public-ip create \
  --resource-group myResourceGroup \
  --name myPublicIP \
  --sku Standard \
  --allocation-method Static \
  --zone 1 2 3
```

## Creating the Load Balancer with Health Probes

Set up the complete load balancer configuration before creating the scale set:

```bash
# Create a health probe
az network lb probe create \
  --resource-group myResourceGroup \
  --lb-name myLoadBalancer \
  --name httpHealthProbe \
  --protocol Http \
  --port 80 \
  --path /health \
  --interval 15 \
  --threshold 2

# Create a load balancing rule
az network lb rule create \
  --resource-group myResourceGroup \
  --lb-name myLoadBalancer \
  --name httpRule \
  --protocol Tcp \
  --frontend-port 80 \
  --backend-port 80 \
  --frontend-ip-name myFrontendIP \
  --backend-pool-name myBackendPool \
  --probe-name httpHealthProbe \
  --idle-timeout 15 \
  --enable-tcp-reset true

# Add HTTPS rule if needed
az network lb probe create \
  --resource-group myResourceGroup \
  --lb-name myLoadBalancer \
  --name httpsHealthProbe \
  --protocol Https \
  --port 443 \
  --path /health \
  --interval 15 \
  --threshold 2

az network lb rule create \
  --resource-group myResourceGroup \
  --lb-name myLoadBalancer \
  --name httpsRule \
  --protocol Tcp \
  --frontend-port 443 \
  --backend-port 443 \
  --frontend-ip-name myFrontendIP \
  --backend-pool-name myBackendPool \
  --probe-name httpsHealthProbe \
  --idle-timeout 15 \
  --enable-tcp-reset true
```

## Creating the Scale Set with the Load Balancer

Now create the scale set and associate it with the load balancer:

```bash
# Create the scale set attached to the load balancer
az vmss create \
  --resource-group myResourceGroup \
  --name myScaleSet \
  --image Ubuntu2204 \
  --vm-sku Standard_D2s_v5 \
  --instance-count 3 \
  --upgrade-policy-mode Rolling \
  --lb myLoadBalancer \
  --backend-pool-name myBackendPool \
  --health-probe httpHealthProbe \
  --admin-username azureuser \
  --generate-ssh-keys
```

When the scale set is created with the `--lb` flag, Azure automatically adds each instance's NIC to the load balancer's backend pool. New instances added during scale-out are automatically added too.

## Health Probe Types and Configuration

### HTTP Health Probe

The most common choice. It sends an HTTP GET request to a specific path and expects a 200 response:

```bash
az network lb probe create \
  --resource-group myResourceGroup \
  --lb-name myLoadBalancer \
  --name httpProbe \
  --protocol Http \
  --port 80 \
  --path /health \
  --interval 5 \
  --threshold 2
```

Parameters:
- **interval**: Seconds between probe attempts (minimum 5).
- **threshold** (also called numberOfProbes): Consecutive failures before marking unhealthy.
- **path**: The URL path to probe. Use a dedicated health endpoint.

### TCP Health Probe

Simply checks if a TCP port is open. Useful when you do not have an HTTP endpoint:

```bash
az network lb probe create \
  --resource-group myResourceGroup \
  --lb-name myLoadBalancer \
  --name tcpProbe \
  --protocol Tcp \
  --port 3000 \
  --interval 5 \
  --threshold 2
```

### HTTPS Health Probe

For services that only listen on HTTPS:

```bash
az network lb probe create \
  --resource-group myResourceGroup \
  --lb-name myLoadBalancer \
  --name httpsProbe \
  --protocol Https \
  --port 443 \
  --path /health \
  --interval 5 \
  --threshold 2
```

HTTPS probes do not validate certificates. They just verify that the HTTPS handshake completes and the endpoint returns 200.

## Designing a Good Health Endpoint

A health endpoint should accurately reflect whether the instance can serve real traffic:

```python
# health.py - Flask health endpoint example
from flask import Flask, jsonify
import psycopg2
import redis
import os

app = Flask(__name__)

@app.route('/health')
def health_check():
    checks = {}

    # Check database connectivity
    try:
        conn = psycopg2.connect(os.environ['DATABASE_URL'])
        conn.close()
        checks['database'] = 'ok'
    except Exception as e:
        checks['database'] = str(e)
        # Database is critical - return unhealthy
        return jsonify({'status': 'unhealthy', 'checks': checks}), 503

    # Check cache connectivity
    try:
        r = redis.from_url(os.environ['REDIS_URL'])
        r.ping()
        checks['cache'] = 'ok'
    except Exception as e:
        # Cache is not critical - log but continue
        checks['cache'] = str(e)

    return jsonify({'status': 'healthy', 'checks': checks}), 200

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=80)
```

Notice how the database failure returns 503 (unhealthy) but the cache failure still returns 200 (healthy). Only fail the health check for dependencies that truly prevent the instance from functioning.

## NAT Rules for Individual Instance Access

The load balancer distributes traffic to all instances, but sometimes you need to access a specific instance for debugging. Inbound NAT rules map a unique port on the load balancer to a specific port on each instance:

```bash
# Create an inbound NAT pool for SSH access
az network lb inbound-nat-pool create \
  --resource-group myResourceGroup \
  --lb-name myLoadBalancer \
  --name sshNatPool \
  --protocol Tcp \
  --frontend-port-range-start 50000 \
  --frontend-port-range-end 50100 \
  --backend-port 22 \
  --frontend-ip-name myFrontendIP
```

With this configuration, SSH to the load balancer's public IP on port 50000 connects to instance 0's port 22, port 50001 connects to instance 1, and so on.

```bash
# SSH to instance 0
ssh -p 50000 azureuser@<load-balancer-ip>

# SSH to instance 1
ssh -p 50001 azureuser@<load-balancer-ip>
```

## Traffic Distribution Methods

Azure Load Balancer uses a hash-based distribution algorithm by default. It creates a hash from:
- Source IP
- Source port
- Destination IP
- Destination port
- Protocol type

This means requests from the same client IP and port go to the same backend instance (session affinity at the tuple level).

You can change the distribution mode:

```bash
# Configure source IP affinity (sticky sessions by client IP)
az network lb rule update \
  --resource-group myResourceGroup \
  --lb-name myLoadBalancer \
  --name httpRule \
  --load-distribution SourceIP

# Options:
# Default - 5-tuple hash (source IP, source port, dest IP, dest port, protocol)
# SourceIP - 2-tuple hash (source IP, dest IP)
# SourceIPProtocol - 3-tuple hash (source IP, dest IP, protocol)
```

For stateless applications, the Default distribution is fine. For applications that require session stickiness, use SourceIP.

## Monitoring Load Balancer Performance

Standard Load Balancer provides rich metrics through Azure Monitor:

```bash
# Get health probe status
az monitor metrics list \
  --resource "/subscriptions/<sub-id>/resourceGroups/myResourceGroup/providers/Microsoft.Network/loadBalancers/myLoadBalancer" \
  --metric "HealthProbeStatus" \
  --interval PT1M \
  --aggregation Average \
  -o table

# Get data path availability (overall traffic throughput)
az monitor metrics list \
  --resource "/subscriptions/<sub-id>/resourceGroups/myResourceGroup/providers/Microsoft.Network/loadBalancers/myLoadBalancer" \
  --metric "VipAvailability" \
  --interval PT1M \
  --aggregation Average \
  -o table

# Get SNAT connection count
az monitor metrics list \
  --resource "/subscriptions/<sub-id>/resourceGroups/myResourceGroup/providers/Microsoft.Network/loadBalancers/myLoadBalancer" \
  --metric "UsedSnatPorts" \
  --interval PT1M \
  --aggregation Sum \
  -o table
```

Key metrics to watch:

- **HealthProbeStatus**: Percentage of health probe responses that were successful. Should be near 100%.
- **VipAvailability**: Data path availability. Should be 100% for a healthy load balancer.
- **SnatConnectionCount/UsedSnatPorts**: SNAT port exhaustion can cause outbound connection failures.

## Troubleshooting Common Issues

### Instances Not Receiving Traffic

```bash
# Check if instances are in the backend pool
az network lb address-pool show \
  --resource-group myResourceGroup \
  --lb-name myLoadBalancer \
  --name myBackendPool \
  --query "backendIPConfigurations[].id" -o tsv

# Check health probe status per instance
az network lb probe show \
  --resource-group myResourceGroup \
  --lb-name myLoadBalancer \
  --name httpHealthProbe -o json
```

Common causes:
- Health probe is failing (wrong port, path, or the application is not running)
- NSG is blocking the health probe traffic (Azure health probes come from IP 168.63.129.16)
- The application is listening on localhost instead of 0.0.0.0

### Health Probes Failing

Make sure your NSG allows traffic from the Azure health probe source:

```bash
# Add an NSG rule to allow health probe traffic
az network nsg rule create \
  --resource-group myResourceGroup \
  --nsg-name myNSG \
  --name AllowHealthProbe \
  --priority 300 \
  --access Allow \
  --protocol Tcp \
  --direction Inbound \
  --source-address-prefixes AzureLoadBalancer \
  --destination-port-ranges 80 443
```

### Uneven Traffic Distribution

If some instances receive much more traffic than others, check:
- Health probe results (unhealthy instances are excluded, shifting load to healthy ones)
- Client IP distribution (with default 5-tuple hash, a single client IP with many connections goes to the same instance)
- Connection draining settings

Set up comprehensive monitoring with OneUptime to track per-instance traffic and health status. When traffic distribution becomes uneven, you want to know whether it is because of failed health probes, sticky sessions, or actual imbalanced load.

## Wrapping Up

Azure Load Balancer and VM Scale Sets are designed to work together. The load balancer handles traffic distribution and health monitoring while the scale set manages instance lifecycle and scaling. Configure health probes that accurately reflect application health, use Standard SKU for production, set up NAT rules for debugging access, and monitor both the load balancer metrics and per-instance health. This combination gives you a resilient, scalable application tier that recovers from failures automatically.
