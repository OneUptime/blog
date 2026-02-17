# How to Configure GKE Maintenance Windows to Control When Automatic Upgrades Happen

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, GKE, Kubernetes, Maintenance Windows, Cluster Management

Description: Learn how to configure GKE maintenance windows and exclusions to control when automatic node and control plane upgrades occur in your clusters.

---

Google Kubernetes Engine handles a lot of the operational burden of running Kubernetes clusters, including automatic upgrades to keep your nodes and control plane up to date. But if you have ever been surprised by an upgrade happening during peak traffic hours, you know that "automatic" does not always mean "convenient." That is where maintenance windows come in.

Maintenance windows let you tell GKE when it is acceptable to perform automatic maintenance operations - things like node upgrades, control plane upgrades, and security patches. Outside of those windows, GKE will hold off on making changes to your cluster. This gives you the control you need without giving up the convenience of managed upgrades.

## Why Maintenance Windows Matter

By default, GKE can perform maintenance at any time. For many workloads, this is fine. But production systems with strict uptime requirements or traffic patterns need more predictability. Consider these scenarios:

- An e-commerce platform that cannot afford disruptions during business hours
- A financial services application that needs stability during market hours
- A batch processing system that has idle periods overnight when upgrades would be least disruptive

Maintenance windows address all of these by giving you a say in the timing.

## Setting Up a Maintenance Window with gcloud

The simplest way to configure a maintenance window is through the gcloud CLI. You define a recurring time window during which GKE is allowed to perform maintenance.

This command sets a daily four-hour maintenance window starting at 2 AM UTC:

```bash
# Configure a daily maintenance window from 2 AM to 6 AM UTC
gcloud container clusters update my-cluster \
  --zone us-central1-a \
  --maintenance-window-start 2026-02-17T02:00:00Z \
  --maintenance-window-end 2026-02-17T06:00:00Z \
  --maintenance-window-recurrence "FREQ=DAILY"
```

GKE uses RFC 5545 recurrence rules, so you have flexibility in how you define the schedule. Here are a few common patterns.

This sets a weekly window on Sundays only:

```bash
# Allow maintenance only on Sundays between midnight and 6 AM UTC
gcloud container clusters update my-cluster \
  --zone us-central1-a \
  --maintenance-window-start 2026-02-15T00:00:00Z \
  --maintenance-window-end 2026-02-15T06:00:00Z \
  --maintenance-window-recurrence "FREQ=WEEKLY;BYDAY=SU"
```

And this allows maintenance on weekdays during off-peak hours:

```bash
# Maintenance on weekdays from 11 PM to 5 AM UTC
gcloud container clusters update my-cluster \
  --zone us-central1-a \
  --maintenance-window-start 2026-02-16T23:00:00Z \
  --maintenance-window-end 2026-02-17T05:00:00Z \
  --maintenance-window-recurrence "FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR"
```

## Maintenance Exclusions

Sometimes you need to block maintenance entirely during specific periods - think Black Friday, end-of-quarter processing, or a product launch. Maintenance exclusions let you do exactly that.

This adds a maintenance exclusion for a one-week period:

```bash
# Block all maintenance during a product launch week
gcloud container clusters update my-cluster \
  --zone us-central1-a \
  --add-maintenance-exclusion-name "product-launch" \
  --add-maintenance-exclusion-start 2026-03-01T00:00:00Z \
  --add-maintenance-exclusion-end 2026-03-08T00:00:00Z \
  --add-maintenance-exclusion-scope no_upgrades
```

The `--add-maintenance-exclusion-scope` flag accepts three values:

- `no_upgrades` - blocks all upgrades (node and control plane)
- `no_minor_upgrades` - blocks minor version upgrades but allows patch updates
- `no_minor_or_node_upgrades` - blocks minor upgrades and node upgrades but allows control plane patches

## Configuring with Terraform

If you manage your infrastructure as code, here is how to set up maintenance windows using Terraform.

This Terraform configuration creates a cluster with a recurring maintenance window and a one-time exclusion:

```hcl
resource "google_container_cluster" "primary" {
  name     = "my-cluster"
  location = "us-central1-a"

  # Define a recurring maintenance window
  maintenance_policy {
    recurring_window {
      start_time = "2026-02-17T02:00:00Z"
      end_time   = "2026-02-17T06:00:00Z"
      recurrence = "FREQ=DAILY"
    }

    # Block maintenance during the end of quarter
    maintenance_exclusion {
      exclusion_name = "end-of-quarter"
      start_time     = "2026-03-28T00:00:00Z"
      end_time       = "2026-04-01T00:00:00Z"
      exclusion_options {
        scope = "NO_UPGRADES"
      }
    }
  }
}
```

## How Maintenance Windows Interact with Release Channels

If your cluster is enrolled in a release channel (Rapid, Regular, or Stable), maintenance windows work alongside the channel's upgrade cadence. GKE will still follow the release channel schedule, but it will only apply upgrades during your defined maintenance windows.

One thing to keep in mind: if your maintenance windows are too narrow, upgrades might get delayed significantly. GKE requires a minimum window of at least 48 hours in a 32-day rolling period. If you do not meet this requirement, GKE may override your window for critical security patches.

## Checking Your Current Configuration

You can verify your maintenance window settings at any time.

This command shows the current maintenance policy for your cluster:

```bash
# View the current maintenance window configuration
gcloud container clusters describe my-cluster \
  --zone us-central1-a \
  --format="yaml(maintenancePolicy)"
```

The output will show your recurring window and any active exclusions.

## Removing a Maintenance Window

If you want to go back to the default behavior where GKE can perform maintenance at any time, you can remove the maintenance window.

```bash
# Remove the maintenance window, allowing upgrades at any time
gcloud container clusters update my-cluster \
  --zone us-central1-a \
  --clear-maintenance-window
```

To remove a specific exclusion:

```bash
# Remove a named maintenance exclusion
gcloud container clusters update my-cluster \
  --zone us-central1-a \
  --remove-maintenance-exclusion "product-launch"
```

## Practical Tips

After working with maintenance windows across many clusters, here are some things I have found helpful:

First, always account for time zones. The maintenance window uses UTC, so make sure you convert your preferred local time correctly. A 2 AM maintenance window in UTC is 6 PM PST the previous day, which might not be what you intended.

Second, do not make your windows too small. If you set a one-hour window, GKE might not have enough time to drain nodes, apply the upgrade, and bring everything back up. Four hours is usually a safe minimum for most clusters.

Third, combine maintenance windows with Pod Disruption Budgets. Maintenance windows control when upgrades start, but PDBs control how quickly nodes get drained. Together, they give you fine-grained control over the entire upgrade process.

Fourth, monitor upgrade events. Use Cloud Logging to track when maintenance operations actually happen. Filter on `resource.type="gke_cluster"` and look for upgrade-related events to verify that your windows are working as expected.

## A Real-World Setup

Here is a configuration I have used for a production cluster running a web application with most traffic during US business hours:

```bash
# Allow maintenance only during US nighttime hours on weekdays
gcloud container clusters update production-cluster \
  --zone us-central1-a \
  --maintenance-window-start 2026-02-17T06:00:00Z \
  --maintenance-window-end 2026-02-17T12:00:00Z \
  --maintenance-window-recurrence "FREQ=WEEKLY;BYDAY=TU,WE,TH"
```

This translates to midnight to 6 AM Central Time on Tuesday through Thursday. I skip Monday because weekend deployments might still be stabilizing, and I skip Friday because nobody wants to deal with upgrade issues heading into the weekend.

Maintenance windows are one of those GKE features that seem simple but make a real difference in how confidently you can run production workloads. Take the time to set them up early - future you will be grateful when that automatic upgrade does not coincide with your busiest hour of the week.
