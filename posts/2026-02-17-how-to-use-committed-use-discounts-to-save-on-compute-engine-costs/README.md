# How to Use Committed Use Discounts to Save on Compute Engine Costs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Committed Use Discounts, Compute Engine, Cost Optimization, Google Cloud

Description: A practical guide to purchasing and managing Committed Use Discounts on Google Cloud Compute Engine to significantly reduce your VM costs.

---

Compute Engine is often the biggest line item on a GCP bill. If you are running VMs around the clock for production workloads, you are leaving money on the table by paying on-demand prices. Committed Use Discounts (CUDs) let you commit to a specific amount of resources for one or three years in exchange for steep discounts - up to 70% off on-demand pricing for memory-optimized machine types and up to 55% for other machine types.

This post covers how CUDs work, when they make sense, and how to purchase and manage them effectively.

## How Committed Use Discounts Work

The concept is simple. You tell Google that you will use a certain amount of vCPUs and memory for one year or three years. In return, Google gives you a significant discount on those resources. You pay for the committed amount whether you use it or not, so the commitment needs to be based on your baseline usage, not your peak.

There are two types of CUDs:

- **Resource-based commitments**: You commit to a specific number of vCPUs and amount of memory in a particular region and machine series. These apply across eligible machine types within that series.
- **Spend-based commitments**: You commit to spending a minimum amount per hour on eligible services. Compute flexible CUDs can apply across Compute Engine, GKE, and Cloud Run, while other spend-based CUDs apply to services like Cloud SQL or VMware Engine.

For stable Compute Engine VM capacity that is tied to a specific region and machine series, you will typically use resource-based commitments.

## Discount Amounts

The discounts vary based on commitment length and machine type:

| Commitment Type | 1-Year Discount | 3-Year Discount |
|----------------|----------------|-----------------|
| Resource-based CUDs for vCPU, memory, or both | Up to 37% | Up to 55% for most machine types, and up to 70% for memory-optimized machine types |
| Compute flexible CUDs | 28% | 46% |

These percentages are off the on-demand price. For workloads running 24/7, this adds up to serious savings over a year.

## When CUDs Make Sense

CUDs are a good fit when:

1. You have a stable baseline of compute that runs continuously
2. You can predict your resource needs for the next one to three years
3. You are already past the experimentation phase and have settled on your architecture
4. Your VMs run in specific regions that are unlikely to change

CUDs are not ideal when:

- Your workload is bursty or unpredictable
- You are still in the early stages of figuring out your infrastructure
- You might migrate to a different service (like GKE Autopilot or Cloud Run) in the near future

## How to Purchase a CUD

### Using the Cloud Console

Navigate to Compute Engine, then click on "Committed use discounts" in the left sidebar. Click "Purchase commitment."

You will need to specify:

- **Name**: A descriptive name for this commitment
- **Region**: Where the resources will be used
- **Commitment type**: The machine series commitment type, such as General purpose N2, Compute-optimized C2, or Memory-optimized M3
- **Duration**: 1 year or 3 years
- **vCPUs**: Number of vCPUs to commit to
- **Memory**: Amount of RAM (in GB) to commit to

### Using the gcloud CLI

You can also create commitments from the command line:

```bash
# Purchase a 1-year commitment for 16 vCPUs and 64 GB RAM in us-central1

gcloud compute commitments create my-prod-commitment \
  --region=us-central1 \
  --resources=vcpu=16,memory=64GB \
  --plan=12-month \
  --type=general-purpose-n2
```

For a three-year commitment:

```bash
# Purchase a 3-year commitment for deeper discounts
gcloud compute commitments create my-prod-commitment-3yr \
  --region=us-central1 \
  --resources=vcpu=32,memory=128GB \
  --plan=36-month \
  --type=general-purpose-n2
```

## Analyzing Your Usage Before Committing

Before buying a CUD, you need to understand your baseline usage. Here is a BigQuery query you can run against your billing export to estimate your average daily vCPU and memory usage over the past 90 days:

```sql
-- Estimate average daily vCPU and memory usage by region for Compute Engine.
-- Divide daily pricing-unit usage by 24 to estimate average committed units.
WITH daily_usage AS (
  SELECT
    DATE(usage_start_time) AS usage_date,
    location.region,
    CASE
      WHEN sku.description LIKE '%Instance Core%' THEN 'vcpu'
      WHEN sku.description LIKE '%Instance Ram%' THEN 'memory'
    END AS resource_type,
    SUM(usage.amount_in_pricing_units) AS daily_pricing_units
  FROM
    `my-project.billing_export.gcp_billing_export_v1_*`
  WHERE
    service.description = 'Compute Engine'
    AND (
      sku.description LIKE '%Instance Core%'
      OR sku.description LIKE '%Instance Ram%'
    )
    AND usage_start_time >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 90 DAY)
  GROUP BY
    usage_date,
    location.region,
    resource_type
)
SELECT
  region,
  resource_type,
  AVG(daily_pricing_units / 24) AS avg_committed_units,
  MIN(daily_pricing_units / 24) AS min_committed_units,
  MAX(daily_pricing_units / 24) AS max_committed_units
FROM
  daily_usage
GROUP BY
  region,
  resource_type
ORDER BY
  region,
  resource_type
```

The minimum committed units are your safest baseline for a commitment. Committing to more than your minimum means you might be paying for resources you are not always using.

## Using the Recommendations Hub

Google Cloud provides commitment recommendations based on your actual usage patterns. Go to the Recommendations Hub in the Cloud Console and look for "Committed use discount recommendations." These suggestions are based on your historical usage and tell you exactly how many vCPUs and how much memory to commit to for maximum savings.

```bash
# List commitment recommendations via gcloud
gcloud recommender recommendations list \
  --recommender=google.compute.commitment.UsageCommitmentRecommender \
  --location=us-central1 \
  --project=my-project \
  --format="table(content.operationGroups[0].operations[0].value)"
```

## How CUDs Apply to Running VMs

CUDs are not tied to specific VM instances. Instead, resource-based CUDs apply at the region level across eligible VMs of the committed machine series. If you commit to 16 vCPUs of N2 general-purpose compute in us-central1, the discount automatically applies to eligible N2 VMs running in that region, up to 16 vCPUs. It would not cover N2D or E2 usage unless you bought separate commitments for those machine series.

This flexibility is important. You can resize, delete, and recreate VMs without worrying about losing your discount, as long as your total usage in that region stays at or above the committed amount.

## CUDs and Sustained Use Discounts

Sustained Use Discounts (SUDs) are automatic discounts that GCP applies when VMs run for more than 25% of the month. CUDs and SUDs do not stack. If you have a CUD, it takes priority over the SUD for the committed resources. Any usage beyond your commitment gets SUDs applied automatically.

This means you should only commit to your baseline usage and let SUDs handle the variable portion.

## Managing Existing Commitments

You can view your active commitments at any time:

```bash
# List all active commitments
gcloud compute commitments list \
  --format="table(name, region, status, plan, startTimestamp, endTimestamp)"
```

Important things to know about managing CUDs:

- **CUDs cannot be cancelled** once purchased. You are locked in for the full term.
- **Resource-based CUDs are purchased for a specific project**. You cannot change the project for the commitment, but you can share eligible discounts across projects on the same Cloud Billing account if CUD sharing is enabled.
- **CUDs auto-apply** to eligible usage - you do not need to assign them to specific VMs.
- **Resource-based CUDs do not auto-renew by default** - you can enable auto-renewal on new or existing active commitments, or set a reminder before they expire.

## Best Practices

1. **Start conservative** - Commit to 60-70% of your average usage rather than the peak. You can always purchase additional commitments later.

2. **Use 1-year commitments first** - The 3-year discounts are deeper, but a lot can change in three years. Start with 1-year and graduate to 3-year once you have more confidence in your usage patterns.

3. **Layer your commitments** - Instead of one large commitment, buy multiple smaller ones at different times. This staggers your renewal dates and gives you more flexibility.

4. **Monitor utilization** - Track how much of your commitment you are actually using. If utilization drops below 80%, you may have over-committed.

5. **Combine with other discounts** - Use CUDs for baseline workloads, Spot VMs for fault-tolerant batch jobs, and SUDs for everything in between.

## Calculating Expected Savings

Here is a quick back-of-the-envelope calculation. Say you run 32 vCPUs of n2-standard instances 24/7 in us-central1:

- On-demand cost per vCPU-hour: ~$0.031
- Monthly on-demand cost: 32 * $0.031 * 730 hours = ~$724/month
- With 1-year resource-based CUD (up to 37% off): ~$456/month (saving ~$268/month)
- With 3-year resource-based CUD (up to 55% off): ~$326/month (saving ~$398/month)

Over three years, a 3-year CUD on 32 vCPUs saves roughly $14,328 compared to on-demand pricing.

## Wrapping Up

Committed Use Discounts are one of the most straightforward ways to reduce your Compute Engine bill. The key is to base your commitment on stable, predictable baseline usage and leave the variable portion for Sustained Use Discounts and Spot VMs. Start small, monitor your utilization, and add more commitments as your confidence in your usage patterns grows.
