# How to Debug Serverless VPC Access Connector Throughput Bottlenecks and Scaling Issues

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Serverless VPC Access, Cloud Functions, Cloud Run, Networking

Description: Debug and resolve throughput bottlenecks and scaling issues with Serverless VPC Access connectors in Google Cloud for Cloud Functions and Cloud Run.

---

Serverless VPC Access connectors let your Cloud Functions, Cloud Run services, and App Engine apps reach resources inside your VPC network. They work well for moderate workloads, but once you start pushing significant traffic through them, you can run into throughput bottlenecks that are not immediately obvious. Your functions start timing out, latency spikes, and the connector seems to be a black box. This post covers how to figure out what is going on and how to fix it.

## How Serverless VPC Access Connectors Work

Under the hood, a Serverless VPC Access connector is a group of Compute Engine instances (e2-micro by default) that sit in your VPC and proxy traffic between your serverless workloads and VPC resources. When your Cloud Function needs to talk to a database on a private IP, the traffic goes through these connector instances.

The important thing to understand is that these instances have finite bandwidth. An e2-micro instance tops out at around 200 Mbps. If you have a connector with the default configuration, you are limited by the number and type of these proxy instances.

## Step 1: Check Current Connector Metrics

Start by looking at the connector's throughput and instance count in Cloud Monitoring.

```bash
# Check the current state of your VPC connector
gcloud compute networks vpc-access connectors describe your-connector \
    --region=us-central1 \
    --format="json(machineType, minInstances, maxInstances, minThroughput, maxThroughput, state)"
```

You can also query metrics from Cloud Monitoring to see historical data:

```bash
# Query connector throughput metrics from the last hour
gcloud monitoring time-series list \
    --filter='metric.type="vpcaccess.googleapis.com/connector/sent_bytes_count" AND resource.labels.connector_name="your-connector"' \
    --interval-start-time=$(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%SZ) \
    --format="table(points.value.int64Value, points.interval.endTime)"
```

Look at the sent and received bytes count. If the numbers are consistently near the connector's throughput limit, you have found your bottleneck.

## Step 2: Understand the Throughput Limits

Connectors have throughput ranges specified in Mbps. The default range is 200-300 Mbps. When you create a connector, you can set a minimum and maximum throughput, and the connector autoscales within that range by adding or removing instances.

Here are the machine types and their approximate throughput per instance:

| Machine Type | Throughput per Instance | Use Case |
|---|---|---|
| e2-micro | ~200 Mbps | Low traffic workloads |
| e2-standard-4 | ~4 Gbps | High traffic workloads |

If you created your connector with the default e2-micro machine type and your workload needs more throughput, this is your problem.

## Step 3: Upgrade the Connector Machine Type

Unfortunately, you cannot change the machine type of an existing connector. You need to create a new one and update your serverless services to use it.

Create a new connector with a larger machine type:

```bash
# Create a new connector with e2-standard-4 instances for higher throughput
gcloud compute networks vpc-access connectors create your-connector-v2 \
    --region=us-central1 \
    --network=your-vpc-network \
    --range=10.8.0.0/28 \
    --machine-type=e2-standard-4 \
    --min-instances=2 \
    --max-instances=10
```

Note that the IP range must not overlap with any existing subnets or connectors in your VPC.

Then update your Cloud Function or Cloud Run service to use the new connector:

```bash
# Update a Cloud Run service to use the new connector
gcloud run services update your-service \
    --region=us-central1 \
    --vpc-connector=your-connector-v2 \
    --vpc-egress=private-ranges-only
```

## Step 4: Check for Instance Scaling Issues

Even if the machine type is adequate, the connector might not be scaling up fast enough to handle traffic spikes. The connector autoscales based on throughput, but there is a lag.

Check the instance count over time in Cloud Monitoring. If you see the instance count staying at the minimum during traffic spikes, the autoscaler might not be reacting fast enough. You can increase the minimum instance count to handle baseline traffic:

```bash
# Update the connector with higher minimum instances
gcloud compute networks vpc-access connectors update your-connector \
    --region=us-central1 \
    --min-instances=3 \
    --max-instances=10
```

Setting a higher minimum means you always have enough capacity for your baseline, and the autoscaler handles spikes on top of that.

## Step 5: Check the Subnet IP Exhaustion

Each connector instance needs an IP address from the connector's subnet or IP range. If you specified a /28 range (the default minimum), you only have 16 IP addresses, and some are reserved. This can limit how many instances the connector can scale to.

If you need more instances, create a new connector with a larger range:

```bash
# Create a connector with a /24 range for more scaling headroom
gcloud compute networks vpc-access connectors create your-connector-large \
    --region=us-central1 \
    --subnet=your-connector-subnet \
    --subnet-project=your-project \
    --machine-type=e2-standard-4 \
    --min-instances=2 \
    --max-instances=20
```

## Step 6: Check VPC Egress Configuration

The `vpc-egress` setting on your Cloud Function or Cloud Run service affects which traffic goes through the connector. There are two options:

- `private-ranges-only` - Only traffic to private IP ranges goes through the connector
- `all-traffic` - All egress traffic goes through the connector, including traffic to public IPs

If you have `all-traffic` set but only need to reach private resources, switch to `private-ranges-only`. This reduces the load on the connector significantly because external API calls and other public traffic will bypass it entirely.

```bash
# Switch to private-ranges-only to reduce connector load
gcloud functions deploy your-function \
    --region=us-central1 \
    --vpc-connector=your-connector \
    --egress-settings=private-ranges-only
```

## Step 7: Look at Connection Patterns

High connection counts can also bottleneck a connector, even if raw throughput is not maxed out. If your application opens many short-lived connections (for example, creating a new database connection for every request), you might be exhausting the connector's connection tracking capacity.

Consider implementing connection pooling in your application. For Cloud SQL, use the Cloud SQL connector library which manages connection pooling efficiently:

```python
# Example: Using Cloud SQL connector with connection pooling in Python
from google.cloud.sql.connector import Connector
import sqlalchemy

connector = Connector()

def get_connection():
    # This returns a pooled connection instead of creating a new one each time
    return connector.connect(
        "project:region:instance",
        "pg8000",
        user="your-user",
        password="your-password",
        db="your-database"
    )

# Create a connection pool with SQLAlchemy
pool = sqlalchemy.create_engine(
    "postgresql+pg8000://",
    creator=get_connection,
    pool_size=5,        # Maintain 5 connections in the pool
    max_overflow=2,     # Allow 2 additional connections under load
    pool_timeout=30,    # Wait 30 seconds for a connection before failing
    pool_recycle=1800   # Recycle connections every 30 minutes
)
```

## Step 8: Consider Direct VPC Egress for Cloud Run

If you are using Cloud Run, you can bypass Serverless VPC Access connectors entirely by using Direct VPC egress. This feature lets your Cloud Run instances attach directly to a VPC subnet without going through a connector. It offers better throughput and lower latency.

```bash
# Deploy a Cloud Run service with Direct VPC egress
gcloud run services update your-service \
    --region=us-central1 \
    --network=your-vpc-network \
    --subnet=your-subnet \
    --vpc-egress=private-ranges-only
```

Direct VPC egress eliminates the connector bottleneck entirely because your Cloud Run instances get their own VPC IP addresses.

## Monitoring and Alerting

Set up monitoring on your connector's throughput and instance count so you catch bottlenecks before they impact users. With [OneUptime](https://oneuptime.com), you can create dashboards tracking connector metrics alongside your application performance metrics, giving you end-to-end visibility into how network connectivity affects your serverless workloads.

The bottom line is that Serverless VPC Access connectors are great for convenience but have real throughput limits. If you are pushing heavy traffic, upgrade the machine type, increase instance counts, or move to Direct VPC egress for Cloud Run.
