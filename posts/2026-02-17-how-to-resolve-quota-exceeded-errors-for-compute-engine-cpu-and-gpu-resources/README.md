# How to Resolve Quota Exceeded Errors for Compute Engine CPU and GPU Resources

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Compute Engine, Quotas, GPU, Troubleshooting

Description: Learn how to diagnose and resolve quota exceeded errors for CPU and GPU resources in Google Compute Engine, including how to request quota increases and optimize resource usage.

---

You are trying to spin up a new Compute Engine instance or scale out your workload and you get slapped with a quota exceeded error. This is GCP telling you that you have hit the ceiling on how many resources you are allowed to use in a given region.

Quota errors are especially common with GPU resources, which have strict default limits, but they can also happen with CPUs, IP addresses, persistent disks, and other resources. Let me show you how to find out what is blocking you and how to get it resolved.

## Understanding the Error

The error typically looks like this:

```
ERROR: (gcloud.compute.instances.create) Could not fetch resource:
 - Quota 'CPUS' exceeded. Limit: 24.0 in region us-central1.
```

For GPU resources, it looks slightly different:

```
ERROR: (gcloud.compute.instances.create) Could not fetch resource:
 - Quota 'NVIDIA_T4_GPUS' exceeded. Limit: 0.0 in region us-central1.
```

That zero limit on GPUs is not a bug. By default, most GCP projects have a GPU quota of zero. You have to explicitly request GPU quota before you can use them.

## Checking Your Current Quotas

The first step is understanding what quotas you have and how much you are using.

This command shows your CPU quota in a specific region:

```bash
# Check CPU quota for a specific region
gcloud compute regions describe us-central1 \
    --format="table(quotas.metric,quotas.limit,quotas.usage)" \
    --project=my-project | grep -i cpu
```

To see all quotas for a region:

```bash
# List all quotas and their usage for a region
# Look for any quota where usage is close to the limit
gcloud compute regions describe us-central1 \
    --format="table(quotas.metric,quotas.limit,quotas.usage)" \
    --project=my-project
```

For a project-wide view:

```bash
# Check project-level quotas (not region-specific)
gcloud compute project-info describe \
    --format="table(quotas.metric,quotas.limit,quotas.usage)" \
    --project=my-project
```

## Common Quota Types

Here are the quotas that most frequently cause issues:

| Quota Metric | Default Limit | What It Controls |
|---|---|---|
| CPUS | 24 per region | Total vCPUs across all VMs |
| CPUS_ALL_REGIONS | 24 globally | Total vCPUs across all regions |
| NVIDIA_T4_GPUS | 0 | T4 GPU accelerators |
| NVIDIA_A100_GPUS | 0 | A100 GPU accelerators |
| NVIDIA_L4_GPUS | 0 | L4 GPU accelerators |
| IN_USE_ADDRESSES | 8 | External IP addresses |
| SSD_TOTAL_GB | 2048 | Total SSD persistent disk |
| INSTANCES | 128 | Total VM instances |
| PREEMPTIBLE_CPUS | 24 | Preemptible/Spot VM vCPUs |

## Requesting a Quota Increase

You can request quota increases through the gcloud CLI or the Console. The CLI approach is faster:

```bash
# Request a CPU quota increase for a specific region
# This sends a request to GCP that is typically reviewed within 24-48 hours
gcloud compute regions update us-central1 \
    --project=my-project \
    --update-quota CPUS=96
```

For GPU quotas, you typically need to go through the Console because GPU requests often require additional review:

1. Go to IAM and Admin then Quotas in the Cloud Console
2. Filter by the specific GPU metric (e.g., NVIDIA_T4_GPUS)
3. Select the region you need
4. Click "Edit Quotas"
5. Enter the new limit and provide a justification

The justification matters. GCP reviews GPU quota requests manually, and a clear explanation of your use case (ML training, inference, rendering, etc.) helps get approvals faster.

## Tips for Getting Quota Requests Approved

Based on my experience, here is what helps:

1. **Start small** - Request what you actually need, not 10x what you need. You can always request more later.
2. **Have billing set up** - Quotas are tied to your billing account. A new project with a trial account will have lower limits.
3. **Explain your use case** - "ML model training for production recommendation system" gets approved faster than "testing."
4. **Request in phases** - Ask for 8 GPUs first, demonstrate usage, then ask for 32.
5. **Check your billing history** - GCP is more generous with quota increases for accounts that have a history of paying bills on time.

## Working Around Quota Limits

While waiting for a quota increase, there are strategies to work within your current limits.

Use Spot VMs to get separate quota:

```bash
# Spot VMs use PREEMPTIBLE_CPUS quota, separate from regular CPUS
# This lets you run more workloads within your regular CPU quota
gcloud compute instances create spot-worker \
    --zone=us-central1-a \
    --machine-type=n1-standard-8 \
    --provisioning-model=SPOT \
    --instance-termination-action=STOP
```

Distribute across regions:

```bash
# If you are hitting quota in one region, try another
# CPU quotas are per-region, so spreading out helps
gcloud compute instances create worker-1 \
    --zone=us-east1-b \
    --machine-type=e2-standard-4

gcloud compute instances create worker-2 \
    --zone=us-west1-a \
    --machine-type=e2-standard-4
```

Use smaller machine types:

```bash
# Custom machine types let you use exactly the CPU/memory you need
# Instead of n1-standard-16 (16 CPUs), use a custom type
gcloud compute instances create efficient-worker \
    --zone=us-central1-a \
    --custom-cpu=6 \
    --custom-memory=12GB
```

## Monitoring Quota Usage

Set up alerts so you know when you are approaching quota limits before they become a problem:

```bash
# Create a monitoring alert policy for quota usage
# This alerts when CPU quota usage exceeds 80%
gcloud alpha monitoring policies create \
    --notification-channels=projects/my-project/notificationChannels/12345 \
    --display-name="CPU Quota Alert" \
    --condition-display-name="CPU quota above 80%" \
    --condition-filter='resource.type="compute.googleapis.com/Location" AND metric.type="compute.googleapis.com/quota/cpus_per_region/usage"' \
    --condition-threshold-value=0.8 \
    --condition-threshold-comparison=COMPARISON_GT
```

You can also view quota usage trends in the Cloud Console under IAM and Admin, then Quotas. This helps you plan ahead and request increases before you actually hit the wall.

## Automated Quota Monitoring Script

Here is a script that checks all your regions for quotas that are over 70% utilized:

```bash
#!/bin/bash
# Check for quotas approaching their limits across all regions
# Alerts on quotas that are over 70% utilized

THRESHOLD=0.7
PROJECT="my-project"

# Get all regions
regions=$(gcloud compute regions list --format="value(name)" --project=$PROJECT)

for region in $regions; do
    # Get quota info and filter for high usage
    gcloud compute regions describe $region \
        --project=$PROJECT \
        --format="json(quotas)" | \
    python3 -c "
import json, sys
data = json.load(sys.stdin)
for q in data.get('quotas', []):
    limit = q.get('limit', 0)
    usage = q.get('usage', 0)
    if limit > 0 and usage / limit > $THRESHOLD:
        pct = (usage / limit) * 100
        print(f'WARNING: {\"$region\"} - {q[\"metric\"]}: {usage}/{limit} ({pct:.0f}%)')
"
done
```

## GPU-Specific Considerations

GPU quotas deserve special attention because they are harder to get and more expensive to waste. A few things to keep in mind:

- GPU quotas are per-GPU-type, per-region. NVIDIA_T4_GPUS and NVIDIA_A100_GPUS are separate quotas.
- Some GPU types are only available in certain regions. Check availability before requesting quota.
- GPU quota increases can take up to a week for first-time requests.
- Consider using Vertex AI Workbench or Vertex AI Training if you just need GPU access for ML - they have separate quotas and may be easier to get.

Quota management is not glamorous, but it is essential for running production workloads on GCP. Stay ahead of your limits, set up monitoring, and plan your quota requests before you need them urgently.
