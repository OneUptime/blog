# How to Set Up Cross-Region Replication in AlloyDB for Disaster Recovery

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, AlloyDB, PostgreSQL, Disaster Recovery, Cross-Region Replication

Description: Learn how to configure cross-region replication in AlloyDB for PostgreSQL to protect your database against regional outages with automated failover capabilities.

---

Regional outages are rare but they happen. When your entire database infrastructure is in a single GCP region and that region goes down, your application goes down with it. Cross-region replication in AlloyDB lets you maintain a standby cluster in a different region that can take over if the primary region becomes unavailable. It is the foundation of any serious disaster recovery strategy for AlloyDB workloads.

In this post, I will walk through setting up a cross-region replica, configuring it for your RPO and RTO requirements, testing failover, and understanding the costs involved.

## How Cross-Region Replication Works in AlloyDB

AlloyDB cross-region replication works at the cluster level. You create a secondary cluster in a different region that continuously receives updates from the primary cluster. The secondary cluster has its own storage and compute resources.

The replication is asynchronous, which means there is always some lag between the primary and secondary. In practice, this lag is typically under a second, but during heavy write loads it can increase. This is important for setting RPO (Recovery Point Objective) expectations.

When you promote the secondary cluster, it becomes an independent read-write cluster. The old primary is disconnected and the secondary takes over as the new primary.

## Prerequisites

- An existing AlloyDB cluster in the primary region
- The AlloyDB API enabled
- Private Services Access configured in both the primary and secondary regions
- Sufficient quota in both regions

## Step 1 - Verify the Primary Cluster

Make sure your primary cluster is healthy and running:

```bash
# Check the primary cluster status
gcloud alloydb clusters describe my-primary-cluster \
  --region=us-central1 \
  --format="yaml(state,clusterType,primaryConfig)"
```

## Step 2 - Set Up Private Services Access in the Secondary Region

If Private Services Access is not already configured in the secondary region's network, set it up:

```bash
# Verify or create private services access for the secondary region
gcloud compute addresses create google-managed-services-secondary \
  --global \
  --purpose=VPC_PEERING \
  --prefix-length=20 \
  --network=default

# Update the VPC peering connection to include the new range
gcloud services vpc-peerings update \
  --service=servicenetworking.googleapis.com \
  --ranges=google-managed-services,google-managed-services-secondary \
  --network=default
```

## Step 3 - Create the Secondary Cluster

Create a secondary cluster in a different region:

```bash
# Create a cross-region secondary cluster
gcloud alloydb clusters create my-secondary-cluster \
  --region=us-east1 \
  --network=default \
  --secondary-config-primary-cluster-name=projects/my-project/locations/us-central1/clusters/my-primary-cluster
```

The `--secondary-config-primary-cluster-name` flag tells AlloyDB that this is a secondary cluster linked to the specified primary.

## Step 4 - Create a Secondary Instance

The secondary cluster needs at least one instance to serve reads and be ready for promotion:

```bash
# Create an instance in the secondary cluster
gcloud alloydb instances create secondary-instance \
  --cluster=my-secondary-cluster \
  --region=us-east1 \
  --instance-type=SECONDARY \
  --cpu-count=4
```

Choose a CPU count that matches your primary instance. During normal operation, the secondary handles only replication traffic. During failover, it needs to handle the full workload.

## Step 5 - Verify Replication Status

After the secondary cluster and instance are created, verify that replication is active:

```bash
# Check the secondary cluster status
gcloud alloydb clusters describe my-secondary-cluster \
  --region=us-east1 \
  --format="yaml(state,secondaryConfig)"
```

The state should be `READY` and the secondary config should reference the primary cluster.

You can also check replication lag from the primary:

```bash
# Check replication details on the primary cluster
gcloud alloydb clusters describe my-primary-cluster \
  --region=us-central1 \
  --format="yaml(state,primaryConfig)"
```

## Step 6 - Testing Failover

You should test failover before you actually need it. AlloyDB supports promoting a secondary cluster, which disconnects it from the primary and makes it an independent read-write cluster.

Before testing, make sure you have a way to reconnect to the new primary. In production, you would use DNS or a load balancer that can be switched.

Perform a test promotion:

```bash
# Promote the secondary cluster to become the new primary
# WARNING: This is irreversible. The secondary becomes independent.
gcloud alloydb clusters promote my-secondary-cluster \
  --region=us-east1
```

After promotion:

```bash
# Verify the secondary is now an independent primary
gcloud alloydb clusters describe my-secondary-cluster \
  --region=us-east1 \
  --format="yaml(state,clusterType)"
```

The cluster type should now show as a primary cluster.

## Failover Procedure

When you need to fail over in a real disaster, follow these steps:

1. **Assess the situation** - Confirm that the primary region is actually down and not just experiencing transient issues.

2. **Promote the secondary cluster** - Run the promote command.

3. **Update connection strings** - Point your applications to the new primary cluster's IP address.

4. **Verify data integrity** - Run validation queries to confirm the data is consistent.

5. **Communicate status** - Let your team and users know that the failover happened.

```bash
# Get the IP of the new primary instance
gcloud alloydb instances describe secondary-instance \
  --cluster=my-secondary-cluster \
  --region=us-east1 \
  --format="value(ipAddress)"
```

## Failback After Recovery

After the original primary region recovers, you have two options:

**Option A - Create a new secondary in the original region:** The promoted cluster becomes the permanent primary, and you create a new secondary in the original region for future DR.

```bash
# Create a new secondary cluster in the original region
gcloud alloydb clusters create new-secondary \
  --region=us-central1 \
  --network=default \
  --secondary-config-primary-cluster-name=projects/my-project/locations/us-east1/clusters/my-secondary-cluster
```

**Option B - Migrate back to the original region:** If you prefer the original region as primary for latency reasons, you would need to do a full migration back using DMS or a dump/restore.

Option A is simpler and recommended unless you have strong reasons to prefer a specific region as primary.

## Monitoring Replication

Set up monitoring to track replication health:

```bash
# Create an alert for replication lag
gcloud alpha monitoring policies create \
  --display-name="AlloyDB Replication Lag" \
  --condition-display-name="High replication lag" \
  --condition-filter='resource.type="alloydb.googleapis.com/Cluster" AND metric.type="alloydb.googleapis.com/database/replication/replica_lag"' \
  --condition-threshold-value=5 \
  --condition-threshold-comparison=COMPARISON_GT \
  --notification-channels=CHANNEL_ID
```

## RPO and RTO Considerations

**RPO (Recovery Point Objective)** - How much data can you afford to lose? Because cross-region replication is asynchronous, your RPO is determined by the replication lag. Under normal conditions, this is less than a second. Under heavy load, it could be several seconds.

**RTO (Recovery Time Objective)** - How quickly do you need to recover? The promotion process takes a few minutes. Adding application failover time, you are looking at 5-15 minutes for a full failover.

If you need RPO close to zero, consider combining cross-region replication with continuous backups to Cloud Storage.

## Cost Implications

Cross-region replication doubles your AlloyDB costs (roughly):

- You pay for compute in both regions (primary and secondary instances)
- You pay for storage in both regions
- You pay for cross-region network egress for the replication traffic

For many organizations, this cost is justified by the disaster recovery capability. You can also use a smaller secondary instance during normal operations and scale it up before promotion if you have warning time.

## Best Practices

1. **Match secondary instance size to primary** - During failover, the secondary needs to handle the full workload.
2. **Test failover quarterly** - A DR plan that has never been tested is not really a plan.
3. **Monitor replication lag** - Set alerts for lag above your RPO threshold.
4. **Document the failover procedure** - Write a runbook with step-by-step instructions.
5. **Use DNS for connection management** - Point applications at a DNS name that you can update during failover, rather than hard-coding IP addresses.

Cross-region replication in AlloyDB provides a solid foundation for disaster recovery. The setup is straightforward, and the promotion process is fast. The key is testing it before you need it and having a clear, documented procedure for when a real disaster occurs.
