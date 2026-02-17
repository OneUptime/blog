# How to Set Up VPC Access Connector for App Engine to Communicate with Private Resources

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, App Engine, VPC, Networking, Serverless VPC Access

Description: A hands-on guide to creating and configuring a Serverless VPC Access connector so App Engine can reach private resources like Memorystore and internal VMs.

---

App Engine Standard runs in a Google-managed environment that is separate from your project's VPC network. This means that by default, your App Engine application cannot talk to resources on private IP addresses - things like Memorystore Redis instances, internal-only Compute Engine VMs, or Cloud SQL instances via private IP. The Serverless VPC Access connector bridges this gap, giving your App Engine app a path into your VPC network.

In this post, I will cover how to create a VPC Access connector, configure it with App Engine, and handle common networking scenarios.

## Why You Need a VPC Access Connector

Resources in your VPC network use private IP addresses (like `10.0.0.x`). These addresses are not routable from the public internet or from App Engine's managed environment. Without a VPC connector, your App Engine app can only reach resources that have public IP addresses or that expose public endpoints.

A VPC Access connector is essentially a managed set of small VMs that act as a bridge. Your App Engine app sends traffic to the connector, and the connector forwards it into your VPC. Return traffic flows back through the connector to your app.

Common use cases include:

- Connecting to Memorystore (Redis/Memcached) instances
- Reaching Cloud SQL via private IP instead of the public proxy
- Communicating with internal Compute Engine or GKE services
- Accessing resources in peered VPC networks

## Step 1: Enable the Required API

The Serverless VPC Access API needs to be enabled:

```bash
# Enable the Serverless VPC Access API
gcloud services enable vpcaccess.googleapis.com --project=your-project-id
```

## Step 2: Create the VPC Access Connector

You can create a connector using either a custom IP range or an existing subnet.

Using a custom IP range (simpler, recommended for most cases):

```bash
# Create a VPC Access connector with a custom /28 IP range
gcloud compute networks vpc-access connectors create app-connector \
  --network=default \
  --region=us-central1 \
  --range=10.8.0.0/28 \
  --min-instances=2 \
  --max-instances=3 \
  --machine-type=e2-micro \
  --project=your-project-id
```

The `/28` range gives you 16 IP addresses, which is the minimum. The connector uses a few of these for its internal VMs. Make sure this range does not overlap with any existing subnets in your VPC.

Using an existing subnet (useful for shared VPC or specific network configurations):

```bash
# First, create a dedicated subnet for the connector
gcloud compute networks subnets create connector-subnet \
  --network=default \
  --region=us-central1 \
  --range=10.9.0.0/28

# Then create the connector using this subnet
gcloud compute networks vpc-access connectors create app-connector \
  --subnet=connector-subnet \
  --region=us-central1 \
  --min-instances=2 \
  --max-instances=3 \
  --project=your-project-id
```

## Step 3: Verify the Connector

After creation, verify the connector is running:

```bash
# Check connector status
gcloud compute networks vpc-access connectors describe app-connector \
  --region=us-central1 \
  --project=your-project-id
```

The output shows the connector state, which should be `READY`. If it shows `ERROR`, check that the IP range does not conflict with existing subnets.

## Step 4: Configure App Engine to Use the Connector

Add the VPC connector to your `app.yaml`:

```yaml
# app.yaml - Configure VPC Access connector
runtime: python312

vpc_access_connector:
  name: "projects/your-project-id/locations/us-central1/connectors/app-connector"
  egress_setting: private-ranges-only

env_variables:
  REDIS_HOST: "10.0.0.3"
  INTERNAL_API: "http://10.128.0.5:8080"
```

The `egress_setting` controls which traffic goes through the connector:

- `private-ranges-only` - Only traffic to private IP ranges (10.x.x.x, 172.16.x.x, 192.168.x.x) goes through the connector. All other traffic goes directly to the internet.
- `all-traffic` - All outbound traffic routes through the connector, including public internet requests.

Use `private-ranges-only` unless you have a specific reason to route all traffic through your VPC (like needing a static egress IP through Cloud NAT).

## Step 5: Deploy and Test

Deploy your application with the updated configuration:

```bash
# Deploy the application with VPC connector configuration
gcloud app deploy app.yaml --project=your-project-id
```

Test connectivity to your private resources from the deployed app. Here is a simple health check endpoint that verifies Redis connectivity:

```python
# main.py - Test VPC connectivity through the connector
import redis
import os
from flask import Flask, jsonify

app = Flask(__name__)

@app.route("/health/redis")
def redis_health():
    try:
        # Connect to Redis on private IP through VPC connector
        r = redis.Redis(
            host=os.environ.get("REDIS_HOST", "10.0.0.3"),
            port=6379,
            socket_connect_timeout=5
        )
        r.ping()
        return jsonify({"redis": "connected", "host": os.environ.get("REDIS_HOST")}), 200
    except redis.ConnectionError as e:
        return jsonify({"redis": "failed", "error": str(e)}), 500

@app.route("/health/internal")
def internal_health():
    try:
        # Test connectivity to an internal service
        import requests
        response = requests.get(
            os.environ.get("INTERNAL_API", "http://10.128.0.5:8080/health"),
            timeout=5
        )
        return jsonify({"internal_service": "connected", "status": response.status_code}), 200
    except Exception as e:
        return jsonify({"internal_service": "failed", "error": str(e)}), 500
```

## Connector Sizing

The connector's throughput depends on the machine type and number of instances:

```
e2-micro:  100 Mbps per instance (default)
e2-standard-4: 2 Gbps per instance (high throughput)

With min-instances=2, max-instances=3:
  e2-micro: 200-300 Mbps throughput
  e2-standard-4: 4-6 Gbps throughput
```

For most applications, `e2-micro` instances are sufficient. If you are transferring large amounts of data through the connector (like bulk database reads), consider upgrading to `e2-standard-4`:

```bash
# Create a high-throughput connector
gcloud compute networks vpc-access connectors create high-throughput-connector \
  --network=default \
  --region=us-central1 \
  --range=10.8.0.16/28 \
  --min-instances=2 \
  --max-instances=10 \
  --machine-type=e2-standard-4
```

## Egress Through Cloud NAT

If your private resources require connections from a known IP address (for allowlisting), you can combine the VPC connector with Cloud NAT to get a static egress IP:

```bash
# Reserve a static IP
gcloud compute addresses create nat-ip \
  --region=us-central1

# Create a Cloud Router
gcloud compute routers create app-router \
  --network=default \
  --region=us-central1

# Configure Cloud NAT to use the static IP
gcloud compute routers nats create app-nat \
  --router=app-router \
  --region=us-central1 \
  --nat-external-ip-pool=nat-ip \
  --nat-all-subnet-ip-ranges
```

Then set the egress to `all-traffic` in your `app.yaml` so all outbound traffic goes through the connector and gets NAT'd:

```yaml
vpc_access_connector:
  name: "projects/your-project-id/locations/us-central1/connectors/app-connector"
  egress_setting: all-traffic  # Route ALL traffic through VPC for NAT
```

## Shared VPC Configuration

If your organization uses Shared VPC, the connector needs to be created in the host project's network:

```bash
# Create connector in a shared VPC subnet
gcloud compute networks vpc-access connectors create shared-connector \
  --subnet=projects/host-project-id/regions/us-central1/subnetworks/connector-subnet \
  --region=us-central1 \
  --project=service-project-id
```

The service account for your App Engine project needs the `compute.networkUser` role on the host project's subnet.

## Firewall Rules

The VPC connector uses instances in your VPC, so your firewall rules apply. Make sure you have rules that allow traffic from the connector's IP range to your destination resources:

```bash
# Allow traffic from the connector to Redis
gcloud compute firewall-rules create allow-connector-to-redis \
  --network=default \
  --allow=tcp:6379 \
  --source-ranges=10.8.0.0/28 \
  --target-tags=redis-server \
  --project=your-project-id
```

If you are using the default network with its default allow-internal rule, you probably do not need additional firewall rules. But in custom networks with restricted firewalls, explicitly creating rules for the connector IP range is necessary.

## Monitoring Connector Health

Monitor your connector's throughput and health in Cloud Monitoring:

```bash
# List connector details including current throughput
gcloud compute networks vpc-access connectors describe app-connector \
  --region=us-central1
```

Watch for these metrics in Cloud Monitoring:

- `connector/sent_bytes_count` - data sent through the connector
- `connector/received_bytes_count` - data received through the connector
- `connector/instances` - number of active connector instances

If you see the connector consistently maxing out its instances, increase `max-instances` or upgrade the machine type.

## Troubleshooting

If your App Engine app cannot reach private resources after setting up the connector, check these things in order:

1. Verify the connector is in `READY` state
2. Confirm the connector region matches your App Engine region
3. Check that the connector's IP range does not overlap with existing subnets
4. Verify firewall rules allow traffic from the connector IP range
5. Make sure the target resource is in the same VPC network (or a peered network)
6. Check that the `vpc_access_connector` name in `app.yaml` matches exactly

## Summary

The Serverless VPC Access connector is the link between App Engine's managed environment and your private VPC resources. Setting it up takes about 10 minutes - create the connector, add it to your `app.yaml`, deploy, and you are connected. For most applications, a pair of `e2-micro` instances with `private-ranges-only` egress is the right configuration. Scale up the connector only when monitoring tells you it is becoming a bottleneck.
