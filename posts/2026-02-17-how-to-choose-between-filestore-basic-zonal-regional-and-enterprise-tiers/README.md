# How to Choose Between Filestore Basic Zonal Regional and Enterprise Tiers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Filestore, Storage Tiers, NFS, Architecture

Description: A practical comparison of Google Cloud Filestore tiers including Basic HDD, Basic SSD, Zonal, Regional, and Enterprise to help you pick the right one for your workload.

---

Google Cloud Filestore offers five distinct service tiers, and picking the right one is one of the first decisions you need to make. Each tier has different performance characteristics, availability guarantees, minimum capacity requirements, and pricing. Choosing wrong means either overpaying for features you do not need or running into performance limits that require a painful migration later.

Let me walk through each tier, when to use it, and how to think about the trade-offs.

## The Five Tiers at a Glance

Before diving deep, here is a quick summary:

| Tier | Min Capacity | Max Capacity | Availability | Best For |
|------|-------------|-------------|--------------|----------|
| Basic HDD | 1 TB | 63.9 TB | Single zone | Dev/test, cold storage |
| Basic SSD | 2.5 TB | 63.9 TB | Single zone | Low-latency reads |
| Zonal | 1 TB | 100 TB | Single zone | Production workloads |
| Regional | 1 TB | 100 TB | Multi-zone | HA production workloads |
| Enterprise | 1 TB | 10 TB | Multi-zone | Mission-critical apps |

## Basic HDD

Basic HDD is the entry-level tier. It uses standard hard disk drives and provides consistent, moderate performance.

**Performance:** 100 MB/s read, 100 MB/s write, regardless of capacity size. IOPS are limited to 600 for reads and 1000 for writes.

**When to use it:** Development and testing environments, storing large datasets that are accessed infrequently (like log archives or backup staging areas), or any workload where throughput is not the bottleneck.

**When to avoid it:** Anything latency-sensitive. HDD random read latency is measured in milliseconds, which adds up fast for workloads with lots of small file operations.

```bash
# Create a Basic HDD instance - good for dev/test
gcloud filestore instances create dev-share \
  --zone=us-central1-a \
  --tier=BASIC_HDD \
  --file-share=name=data,capacity=1TB \
  --network=name=default
```

**Cost:** This is the cheapest Filestore tier by a significant margin. If cost is your primary concern and performance is secondary, this is the right choice.

## Basic SSD

Basic SSD swaps the hard drives for solid-state drives, which dramatically improves both throughput and IOPS.

**Performance:** Up to 1.2 GB/s read and 350 MB/s write. IOPS jump to 60,000 for reads and 25,000 for writes. These numbers scale with capacity.

**When to use it:** Workloads that need low latency for random reads, such as serving web content, CI/CD build artifacts, or ML training datasets where many small files are read in parallel.

**When to avoid it:** If you need more than 63.9 TB of capacity or if you need high availability across zones. Basic SSD is still single-zone.

```bash
# Create a Basic SSD instance - good for read-heavy workloads
gcloud filestore instances create fast-share \
  --zone=us-central1-a \
  --tier=BASIC_SSD \
  --file-share=name=data,capacity=2.5TB \
  --network=name=default
```

**Cost:** Roughly 3-4x more expensive per TB than Basic HDD. The minimum of 2.5 TB also means a higher starting price.

## Zonal (High Scale SSD)

The Zonal tier provides SSD performance with much higher throughput ceilings and more granular capacity options.

**Performance:** Throughput and IOPS scale with capacity. At 10 TB, you get up to 2.4 GB/s read throughput. At higher capacities, throughput can reach 4.8 GB/s or more.

**When to use it:** Production workloads that need high throughput and consistent performance. Media processing pipelines, large-scale data analytics, and applications with many concurrent clients all benefit from Zonal tier.

**When to avoid it:** If you need cross-zone redundancy. Zonal tier instances are in a single zone, so a zone outage takes the instance offline.

```bash
# Create a Zonal instance - good for high-throughput production
gcloud filestore instances create prod-share \
  --zone=us-central1-a \
  --tier=ZONAL \
  --file-share=name=data,capacity=5TB \
  --network=name=default
```

**Cost:** More expensive per TB than Basic tiers, but the performance per dollar is actually better because throughput scales with capacity.

## Regional

Regional tier is essentially the same as Zonal but with data replicated across two zones in the region. If one zone goes down, the instance fails over to the other zone automatically.

**Performance:** Same as Zonal tier. Throughput and IOPS scale with capacity.

**When to use it:** Production workloads that cannot tolerate zone-level outages. If your application has a strict uptime SLA, Regional tier ensures the file system stays available even during zone failures.

**When to avoid it:** If cost is a major concern and you can tolerate brief outages during zone failures. The cross-zone replication adds significant cost.

```bash
# Create a Regional instance - good for HA production workloads
gcloud filestore instances create ha-share \
  --zone=us-central1-a \
  --tier=REGIONAL \
  --file-share=name=data,capacity=1TB \
  --network=name=default
```

**Cost:** Roughly double the price of Zonal tier due to the cross-zone replication.

## Enterprise

Enterprise is the premium tier designed for business-critical workloads. It provides multi-zone availability, snapshot support, and the widest range of management features.

**Performance:** Designed for consistent, predictable performance. Throughput scales with capacity, similar to Zonal and Regional tiers.

**When to use it:** Applications where data integrity, availability, and manageability are all critical. Financial systems, healthcare applications, and any workload subject to compliance requirements that mandate specific data protection features.

**When to avoid it:** Development environments, batch processing, or any workload where the additional management features are not needed.

```bash
# Create an Enterprise instance - for mission-critical workloads
# Note: Enterprise uses --location (region) instead of --zone
gcloud filestore instances create critical-share \
  --location=us-central1 \
  --tier=ENTERPRISE \
  --file-share=name=data,capacity=1TB \
  --network=name=default
```

**Cost:** The most expensive tier, but you are paying for the highest level of availability and management features.

## Decision Framework

Here is how I think about tier selection in practice:

**Start with the workload requirements:**

1. Is this dev/test or production? If dev/test, use Basic HDD and save money.
2. Do you need low latency? If yes, eliminate Basic HDD.
3. Do you need more than 63.9 TB? If yes, you need Zonal, Regional, or Enterprise.
4. Can you tolerate a zone outage? If no, you need Regional or Enterprise.
5. Do you need snapshots and advanced management? If yes, Enterprise is the way to go.

**Then consider capacity and cost:**

The minimum capacity requirements are important. Basic SSD starts at 2.5 TB, which might be overkill if you only need 100 GB of storage. In that case, Basic HDD at 1 TB might be more economical even if the performance is lower.

For small volumes that need performance, Enterprise tier at 1 TB can actually be more cost-effective than Basic SSD at 2.5 TB, depending on the specific throughput you need.

## Migration Between Tiers

You cannot change the tier of an existing Filestore instance. To move to a different tier, you need to:

1. Create a new instance at the desired tier
2. Copy the data using rsync or a similar tool
3. Update your applications to point to the new instance
4. Delete the old instance

This is disruptive, which is why getting the tier right at the beginning matters. When in doubt, err on the side of a higher tier - the cost of downtime during a migration is usually higher than the incremental cost of a better tier.

## Summary

Basic HDD is for development and cold data. Basic SSD is for read-heavy workloads that fit in a single zone. Zonal is for production workloads needing high throughput. Regional adds cross-zone HA on top of Zonal. Enterprise is for mission-critical applications that need every management feature available. Match the tier to your actual requirements, and you will avoid both overspending and under-provisioning.
