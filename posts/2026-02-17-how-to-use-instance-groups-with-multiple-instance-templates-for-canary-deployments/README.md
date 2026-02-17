# How to Use Instance Groups with Multiple Instance Templates for Canary Deployments

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Compute Engine, Canary Deployments, Instance Groups, Rolling Updates

Description: Learn how to use managed instance groups with multiple instance templates to implement canary deployments on GCP Compute Engine for safe, gradual rollouts.

---

Deploying a new version of your application to every server at once is risky. If the new version has a bug, all your users are affected simultaneously. Canary deployments solve this by rolling out the new version to a small subset of instances first, monitoring for issues, and then gradually expanding the rollout. GCP managed instance groups support this natively through multiple instance template versions.

In this post, I will show you how to set up canary deployments using managed instance groups, control the rollout percentage, and promote or roll back based on metrics.

## How Multi-Version MIGs Work

A managed instance group can run instances from multiple instance templates simultaneously. You assign a target size or percentage to each template version. For example:

- 90% of instances use template v1 (current stable version)
- 10% of instances use template v2 (new canary version)

The MIG manages the mix automatically, creating or replacing instances to match your target percentages.

## Step 1: Create the Instance Templates

Create two instance templates - one for the current version and one for the canary version:

```bash
# Create the stable version template (v1)
gcloud compute instance-templates create app-template-v1 \
    --machine-type=e2-medium \
    --image-family=my-app-v1 \
    --tags=http-server \
    --metadata=app-version=v1

# Create the canary version template (v2)
gcloud compute instance-templates create app-template-v2 \
    --machine-type=e2-medium \
    --image-family=my-app-v2 \
    --tags=http-server \
    --metadata=app-version=v2
```

The templates should be identical except for the application version. Same machine type, same network configuration, same tags.

## Step 2: Create a MIG with the Stable Version

Start with all instances running the stable version:

```bash
# Create a managed instance group with 10 instances of v1
gcloud compute instance-groups managed create app-mig \
    --template=app-template-v1 \
    --size=10 \
    --zone=us-central1-a
```

## Step 3: Start the Canary Deployment

Now introduce the canary version to a small percentage of instances:

```bash
# Deploy v2 to 10% of instances (1 out of 10)
gcloud compute instance-groups managed rolling-action start-update app-mig \
    --version=template=app-template-v1 \
    --canary-version=template=app-template-v2,target-size=10% \
    --zone=us-central1-a
```

This command tells the MIG to replace 10% of instances (1 instance) with the v2 template while keeping 90% on v1. The MIG handles the replacement gracefully, respecting the update policy settings.

You can also specify an exact number instead of a percentage:

```bash
# Deploy v2 to exactly 2 instances
gcloud compute instance-groups managed rolling-action start-update app-mig \
    --version=template=app-template-v1 \
    --canary-version=template=app-template-v2,target-size=2 \
    --zone=us-central1-a
```

## Step 4: Monitor the Canary

Now comes the critical part - watching the canary instances to make sure the new version is healthy.

```bash
# List instances and their template versions
gcloud compute instance-groups managed list-instances app-mig \
    --zone=us-central1-a \
    --format="table(instance, version.instanceTemplate.basename(), currentAction, instanceHealth[0].detailedHealthState)"
```

Check the health status:

```bash
# Check the overall health of the managed instance group
gcloud compute instance-groups managed describe app-mig \
    --zone=us-central1-a \
    --format="yaml(status)"
```

Compare metrics between v1 and v2 instances using Cloud Monitoring:

```bash
# Query error rates for canary instances
gcloud monitoring time-series list \
    --filter='metric.type="custom.googleapis.com/app/error_rate" AND resource.labels.instance_id=CANARY_INSTANCE_ID' \
    --interval='{"end_time":"now","duration":"3600s"}'
```

## Step 5: Expand or Roll Back

**If the canary looks good**, increase the percentage:

```bash
# Expand canary to 25%
gcloud compute instance-groups managed rolling-action start-update app-mig \
    --version=template=app-template-v1 \
    --canary-version=template=app-template-v2,target-size=25% \
    --zone=us-central1-a
```

Then 50%:

```bash
# Expand canary to 50%
gcloud compute instance-groups managed rolling-action start-update app-mig \
    --version=template=app-template-v1 \
    --canary-version=template=app-template-v2,target-size=50% \
    --zone=us-central1-a
```

**Promote to full deployment** (100% v2):

```bash
# Complete the rollout - all instances now run v2
gcloud compute instance-groups managed rolling-action start-update app-mig \
    --version=template=app-template-v2 \
    --zone=us-central1-a
```

**If the canary has problems**, roll back:

```bash
# Roll back to v1 (remove the canary)
gcloud compute instance-groups managed rolling-action start-update app-mig \
    --version=template=app-template-v1 \
    --zone=us-central1-a
```

## Configuring the Update Policy

Control how the MIG replaces instances during updates:

```bash
# Configure the update policy for safe canary deployments
gcloud compute instance-groups managed rolling-action start-update app-mig \
    --version=template=app-template-v1 \
    --canary-version=template=app-template-v2,target-size=10% \
    --zone=us-central1-a \
    --type=proactive \
    --max-surge=1 \
    --max-unavailable=0 \
    --replacement-method=substitute \
    --min-ready=120
```

The update policy parameters:

- **--type=proactive**: Apply updates immediately (vs. opportunistic, which waits for instances to be recreated)
- **--max-surge=1**: Create at most 1 extra instance during the update (provides capacity while replacing)
- **--max-unavailable=0**: Never have fewer instances than target size (zero downtime)
- **--replacement-method=substitute**: Create a new instance before deleting the old one
- **--min-ready=120**: Wait 120 seconds after an instance is created before marking it as updated

## Terraform Configuration

Here is the Terraform setup for canary deployments:

```hcl
# Stable version template
resource "google_compute_instance_template" "v1" {
  name_prefix  = "app-v1-"
  machine_type = "e2-medium"

  disk {
    source_image = "my-project/my-app-v1"
    auto_delete  = true
    boot         = true
  }

  network_interface {
    network = "default"
  }

  metadata = {
    app-version = "v1"
  }

  tags = ["http-server"]

  lifecycle {
    create_before_destroy = true
  }
}

# Canary version template
resource "google_compute_instance_template" "v2" {
  name_prefix  = "app-v2-"
  machine_type = "e2-medium"

  disk {
    source_image = "my-project/my-app-v2"
    auto_delete  = true
    boot         = true
  }

  network_interface {
    network = "default"
  }

  metadata = {
    app-version = "v2"
  }

  tags = ["http-server"]

  lifecycle {
    create_before_destroy = true
  }
}

# Managed instance group with canary deployment
resource "google_compute_instance_group_manager" "app" {
  name               = "app-mig"
  base_instance_name = "app"
  zone               = "us-central1-a"
  target_size        = 10

  # Primary version (90%)
  version {
    name              = "primary"
    instance_template = google_compute_instance_template.v1.id
  }

  # Canary version (10%)
  version {
    name              = "canary"
    instance_template = google_compute_instance_template.v2.id
    target_size {
      percent = 10
    }
  }

  update_policy {
    type                         = "PROACTIVE"
    minimal_action               = "REPLACE"
    most_disruptive_allowed_action = "REPLACE"
    max_surge_percent            = 10
    max_unavailable_fixed        = 0
    replacement_method           = "SUBSTITUTE"
    min_ready_sec                = 120
  }
}
```

To change the canary percentage, update the `target_size` in the canary version block and apply.

## Automating Canary Promotion

Here is a script that automates the canary promotion process with health checks between each step:

```bash
#!/bin/bash
# canary-deploy.sh - Automated canary deployment with health checks
# Usage: ./canary-deploy.sh MIG_NAME ZONE NEW_TEMPLATE

MIG=$1
ZONE=$2
NEW_TEMPLATE=$3
CURRENT_TEMPLATE=$(gcloud compute instance-groups managed describe "$MIG" \
    --zone="$ZONE" --format="value(versions[0].instanceTemplate.basename())")

CANARY_STAGES=(10 25 50 75 100)
WAIT_MINUTES=5

for PERCENT in "${CANARY_STAGES[@]}"; do
    echo "=== Deploying canary at ${PERCENT}% ==="

    if [ "$PERCENT" -eq 100 ]; then
        # Full deployment
        gcloud compute instance-groups managed rolling-action start-update "$MIG" \
            --version=template="$NEW_TEMPLATE" \
            --zone="$ZONE" \
            --max-unavailable=0
    else
        gcloud compute instance-groups managed rolling-action start-update "$MIG" \
            --version=template="$CURRENT_TEMPLATE" \
            --canary-version=template="$NEW_TEMPLATE",target-size="${PERCENT}%" \
            --zone="$ZONE" \
            --max-unavailable=0
    fi

    # Wait for the update to stabilize
    echo "Waiting for update to complete..."
    gcloud compute instance-groups managed wait-until --stable "$MIG" \
        --zone="$ZONE" --timeout=600

    # Wait and monitor
    echo "Monitoring for ${WAIT_MINUTES} minutes..."
    sleep $((WAIT_MINUTES * 60))

    # Check health (simplified - in production, check your actual metrics)
    UNHEALTHY=$(gcloud compute instance-groups managed list-instances "$MIG" \
        --zone="$ZONE" --format="value(instanceHealth[0].detailedHealthState)" \
        | grep -c "UNHEALTHY" || true)

    if [ "$UNHEALTHY" -gt 0 ]; then
        echo "UNHEALTHY instances detected! Rolling back..."
        gcloud compute instance-groups managed rolling-action start-update "$MIG" \
            --version=template="$CURRENT_TEMPLATE" \
            --zone="$ZONE"
        echo "Rollback complete."
        exit 1
    fi

    echo "Stage ${PERCENT}% is healthy."
done

echo "Canary deployment completed successfully!"
```

## Load Balancer Considerations

When using a load balancer in front of your MIG, the canary instances receive traffic proportional to their share of the instance group. With 10% canary, roughly 10% of traffic goes to canary instances.

If you want more control over traffic splitting, consider using Traffic Director or a service mesh instead of raw instance group percentages.

## Best Practices

1. **Start small**: Begin with 5-10% canary traffic. This limits the blast radius if something goes wrong.
2. **Monitor between stages**: Do not rush through percentages. Wait at least 5-10 minutes between each increase.
3. **Automate the rollback trigger**: Define clear rollback criteria (error rate above X%, latency above Y ms) and automate the rollback.
4. **Use health checks**: Make sure your MIG health check can detect application-level issues, not just that the VM is running.
5. **Keep templates identical except for the app**: Changing machine types, disk sizes, or network configs at the same time as the app makes it hard to isolate issues.
6. **Tag canary instances**: Use metadata to identify canary instances so you can filter metrics.

## Wrapping Up

Canary deployments with managed instance groups give you a safe, controlled way to roll out changes. The built-in support for multiple template versions means you do not need any additional tooling - just gcloud commands and a monitoring dashboard. Start with manual canary promotions to build confidence, then automate the process once your monitoring and rollback criteria are well-defined.
