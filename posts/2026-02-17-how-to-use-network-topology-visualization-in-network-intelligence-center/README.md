# How to Use Network Topology Visualization in Network Intelligence Center

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Network Topology, Network Intelligence Center, VPC, Google Cloud Networking

Description: Learn how to use Network Topology in GCP Network Intelligence Center to visualize your cloud network architecture, identify traffic patterns, and troubleshoot connectivity.

---

Understanding the actual topology of a cloud network gets harder as you add more VPCs, subnets, peering connections, VPNs, and load balancers. Documentation goes stale quickly, and diagrams drawn six months ago rarely match reality. Network Topology in Network Intelligence Center solves this by generating an interactive visualization of your GCP network infrastructure and its associated metrics.

In this post, I will show you how to use Network Topology to explore your network, understand traffic flows, and catch issues you might not have noticed otherwise.

## What Network Topology Shows

Network Topology creates an automatically generated map of your GCP network resources and the traffic flowing between them. It visualizes:

- VPC networks and subnets
- VM instances and their network interfaces
- Load balancers and forwarding rules
- VPC peering connections
- Cloud VPN tunnels and Cloud Interconnect attachments
- Traffic volume and bandwidth between resources
- Cross-region and cross-project traffic flows

The topology is generated from your actual configuration and traffic data, so it reflects the resources and communication relationships that existed during the selected hourly segment.

## Enabling VPC Flow Logs

Network Topology does not require additional setup before you can open the graph in the Google Cloud console. VPC Flow Logs are useful when you want to look up detailed flow records for specific traffic paths or use the generated BigQuery queries from the topology details pane.

```bash
# Enable VPC Flow Logs on a specific subnet

gcloud compute networks subnets update my-subnet \
  --region=us-central1 \
  --enable-flow-logs \
  --logging-aggregation-interval=interval-5-sec \
  --logging-flow-sampling=0.5 \
  --logging-metadata=include-all \
  --project=my-project
```

For cost management, you can adjust the sampling rate. A 50% sampling rate (0.5) provides good visibility while keeping logging costs reasonable.

To enable flow logs across all subnets in a VPC:

```bash
# Enable flow logs on all subnets in a VPC
for subnet in $(gcloud compute networks subnets list \
  --network=my-vpc \
  --format="csv[no-heading](name,region)" \
  --project=my-project); do

  name=$(echo "$subnet" | cut -d',' -f1)
  region=$(echo "$subnet" | cut -d',' -f2)

  gcloud compute networks subnets update "$name" \
    --region="$region" \
    --enable-flow-logs \
    --project=my-project
done
```

## Navigating the Topology View

Once you open Network Topology in the GCP Console, you see a hierarchical view of your network. The default view groups resources by:

1. **Project** - Top-level grouping
2. **VPC Network** - Each VPC appears as a container
3. **Region/Zone** - Resources grouped by location
4. **Resources** - Individual VMs, load balancers, etc.

You can zoom in and out to different levels of detail. At the highest level, you see traffic flowing between VPCs. Zoom into a VPC and you see traffic between subnets. Zoom further and you see individual VM-to-VM traffic.

## Understanding Traffic Flows

The lines between resources represent traffic flows. Thicker lines indicate higher bandwidth. You can click on any line to see details about the traffic:

- Ingress and egress traffic charts
- Throughput values for the selected hourly segment
- Supported metrics such as latency or packet loss where available

This is incredibly useful for understanding which services communicate with each other and how much bandwidth they use. It can reveal unexpected traffic patterns, like a service that is sending far more data than expected or traffic flowing through an unexpected path.

## Using Topology for Troubleshooting

Here are some real scenarios where Network Topology has helped me catch problems.

### Finding Asymmetric Routing

When traffic takes different paths in each direction, it can cause performance issues and confuse stateful firewalls. In the topology view, you can compare the visible communication relationships from Service A to Service B with the return traffic. If you need to trace the exact packet path, use Connectivity Tests alongside Network Topology.

### Identifying Single Points of Failure

Look for resources that serve as the sole connection point between two parts of your network. A single VPN tunnel, Cloud Interconnect attachment, or load balancer backend path can show up clearly in the topology view.

### Spotting Unused Resources

Resources that you expect to see but that do not appear in a selected hourly segment might not have communicated with any other entity during that hour. These could be forgotten VMs, unused load balancers, or services that have been decommissioned but not cleaned up.

## Exporting Topology Data

While the visual tool is great for exploration, sometimes you need the data in a structured format. You can query VPC Flow Logs in Cloud Logging or use Cloud Monitoring metrics directly.

```bash
# Query VPC flow data to understand traffic between subnets
gcloud logging read \
  'resource.type="gce_subnetwork" AND
   logName="projects/my-project/logs/compute.googleapis.com%2Fvpc_flows"' \
  --project=my-project \
  --limit=100 \
  --format="json(jsonPayload.connection,jsonPayload.bytes_sent,jsonPayload.src_vpc,jsonPayload.dest_vpc)"
```

For a summary of traffic between VPCs:

```bash
# Get aggregate traffic metrics between VPCs using Monitoring
gcloud monitoring time-series list \
  --project=my-project \
  --filter='metric.type="networking.googleapis.com/vm_flow/egress_bytes_count"' \
  --interval-start-time=$(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%SZ) \
  --interval-end-time=$(date -u +%Y-%m-%dT%H:%M:%SZ) \
  --format="table(metric.labels,points.value)"
```

## Filtering and Focusing

The topology can get overwhelming in large environments. Use filters to focus on what matters:

- **Filter by VPC**: Show only resources in a specific VPC
- **Filter by region**: Focus on a particular geographic area
- **Filter by traffic type**: Focus on traffic categories such as cross-zonal, internet, or hybrid egress
- **Filter by resource type**: Show only VMs, only load balancers, etc.

In the Console, these filters are available in the View options panel of the topology view. You can also toggle different hierarchies and resource types on and off.

## Network Topology and Multi-Project Environments

If you use a shared VPC or have VPC peering across projects, Network Topology can show cross-project traffic. You need to have the appropriate permissions in each project.

```bash
# Grant the necessary roles for topology viewing
gcloud projects add-iam-policy-binding shared-vpc-host-project \
  --member="user:admin@example.com" \
  --role="roles/networkmanagement.viewer"

gcloud projects add-iam-policy-binding shared-vpc-host-project \
  --member="user:admin@example.com" \
  --role="roles/monitoring.viewer"
```

To see multiple projects in one graph, configure a Cloud Monitoring metrics scope that includes the relevant host and service projects. With the correct scope and permissions, the topology can show entities and communication across the shared VPC.

## Comparing Topology Over Time

Network Topology includes a time slider that lets you view the topology at different points in time. This is useful for:

- Seeing how traffic patterns changed after a deployment
- Identifying when a new traffic flow appeared
- Understanding the impact of a configuration change

You can step through time in increments and watch how traffic flows shift. This is particularly helpful during incident investigations when you need to understand what changed.

## Best Practices

Keep VPC Flow Logs enabled on all production subnets. The cost is manageable with a reasonable sampling rate, and the visibility is worth it.

Review the topology regularly, not just during incidents. Quarterly reviews can catch drift between your intended architecture and reality.

Use topology data to validate network segmentation. If you expect two subnets to be isolated, the topology should show zero traffic between them. If there is traffic, your segmentation is not working as intended.

Document your expected topology and compare it with the actual topology. Any differences are worth investigating.

## Summary

Network Topology in Network Intelligence Center gives you an accurate picture of your GCP network for the selected time segment. It shows you not just what resources exist, but how they communicate. Use it for troubleshooting, architecture reviews, security validation, and capacity planning. Combined with the other Network Intelligence Center tools, it provides comprehensive visibility into your cloud network.
