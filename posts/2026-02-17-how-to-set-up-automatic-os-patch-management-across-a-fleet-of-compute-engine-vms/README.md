# How to Set Up Automatic OS Patch Management Across a Fleet of Compute Engine VMs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Compute Engine, OS Patch Management, Security, VM Manager

Description: Learn how to configure automatic OS patch management for your Compute Engine VM fleet using GCP VM Manager and OS Patch Management service.

---

Keeping your VMs patched is one of those tasks that everyone agrees is important but nobody wants to do manually. Unpatched systems are a top attack vector, and the longer you wait to patch, the higher the risk. GCP's OS Patch Management service, part of VM Manager, lets you automate patching across your entire fleet of Compute Engine VMs. You define what to patch, when to patch it, and how to handle rollouts, and the service takes care of the rest.

Let me walk through setting this up from scratch.

## Prerequisites: Enable VM Manager

OS Patch Management requires the VM Manager (OS Config) agent to be running on your instances. First, enable the API:

```bash
# Enable the OS Config API
gcloud services enable osconfig.googleapis.com
```

Then ensure the OS Config agent is installed on your VMs. For VMs created from recent GCP images (2020+), the agent is already installed. For older VMs, install it:

```bash
# Install the OS Config agent on Debian/Ubuntu
sudo apt-get update && sudo apt-get install -y google-osconfig-agent

# Install on CentOS/RHEL
sudo yum install -y google-osconfig-agent

# Verify it is running
sudo systemctl status google-osconfig-agent
```

You also need to enable the OS Config metadata on your VMs or project:

```bash
# Enable OS Config at the project level
gcloud compute project-info add-metadata \
    --metadata=enable-osconfig=TRUE
```

## Creating a Patch Job (One-Time)

Let us start with a one-time patch job to understand how it works before setting up recurring schedules.

```bash
# Run a one-time patch job on all VMs in the project
gcloud compute os-config patch-jobs execute \
    --instance-filter-all \
    --display-name="Manual security patch - February 2026"
```

You can filter which instances get patched:

```bash
# Patch only VMs with a specific label
gcloud compute os-config patch-jobs execute \
    --instance-filter-names="zones/us-central1-a/instances/web-1,zones/us-central1-a/instances/web-2" \
    --display-name="Patch web servers"

# Patch VMs by label
gcloud compute os-config patch-jobs execute \
    --instance-filter-group-labels="env=production,team=backend" \
    --display-name="Patch production backend servers"

# Patch VMs in specific zones
gcloud compute os-config patch-jobs execute \
    --instance-filter-zones="us-central1-a,us-central1-b" \
    --display-name="Patch US Central VMs"
```

## Configuring What Gets Patched

You can control which patches are applied. Here is how to create a patch job that only applies security updates:

```bash
# Apply only security updates on Debian/Ubuntu VMs
gcloud compute os-config patch-jobs execute \
    --instance-filter-all \
    --apt-type=dist \
    --apt-excludes=linux-image-* \
    --display-name="Security patches only"
```

For more control, use a patch config file:

```bash
# Create a patch configuration that specifies exactly what to patch
gcloud compute os-config patch-jobs execute \
    --instance-filter-group-labels="env=production" \
    --apt-type=dist \
    --reboot-config=DEFAULT \
    --display-name="Production security patches" \
    --duration=3600s
```

The `--reboot-config` options are:

- **DEFAULT**: Reboot if the package manager says a reboot is needed
- **ALWAYS**: Always reboot after patching
- **NEVER**: Never reboot (patches that require a reboot will be pending)

## Setting Up Recurring Patch Deployments

The real power comes from scheduling patches to run automatically.

```bash
# Create a recurring patch deployment that runs weekly on Sundays at 2 AM
gcloud compute os-config patch-deployments create weekly-patch \
    --instance-filter-group-labels="env=production" \
    --recurring-schedule-frequency=weekly \
    --recurring-schedule-day-of-week=SUNDAY \
    --recurring-schedule-time-of-day="02:00" \
    --recurring-schedule-time-zone="America/Chicago" \
    --reboot-config=DEFAULT \
    --apt-type=dist \
    --rollout-mode=zone-by-zone \
    --rollout-disruption-budget-percent=25 \
    --description="Weekly production patching"
```

The rollout configuration is critical for production:

- **--rollout-mode=zone-by-zone**: Patches one zone at a time, so your service stays available across zones.
- **--rollout-disruption-budget-percent=25**: Only patches 25% of instances in each zone simultaneously.

For monthly patching:

```bash
# Create a monthly patch deployment on the first Saturday
gcloud compute os-config patch-deployments create monthly-patch \
    --instance-filter-all \
    --recurring-schedule-frequency=monthly \
    --recurring-schedule-day-of-month=1 \
    --recurring-schedule-time-of-day="03:00" \
    --recurring-schedule-time-zone="UTC" \
    --reboot-config=DEFAULT \
    --rollout-mode=zone-by-zone \
    --rollout-disruption-budget-percent=33 \
    --description="Monthly patching for all VMs"
```

## Terraform Configuration

Here is how to set up patch deployments with Terraform.

```hcl
# Recurring weekly patch deployment
resource "google_os_config_patch_deployment" "weekly" {
  patch_deployment_id = "weekly-production-patch"

  instance_filter {
    group_labels {
      labels = {
        env = "production"
      }
    }
  }

  patch_config {
    reboot_config = "DEFAULT"

    apt {
      type = "DIST"
    }

    yum {
      security = true
    }
  }

  recurring_schedule {
    time_zone {
      id = "America/Chicago"
    }

    time_of_day {
      hours = 2
    }

    weekly {
      day_of_week = "SUNDAY"
    }
  }

  rollout {
    mode = "ZONE_BY_ZONE"

    disruption_budget {
      percentage = 25
    }
  }
}
```

## Pre and Post Patch Scripts

You can run scripts before and after patching. This is useful for draining traffic before patching and bringing it back after.

```bash
# Create a patch job with pre and post scripts
gcloud compute os-config patch-jobs execute \
    --instance-filter-group-labels="role=web-server" \
    --pre-patch-linux-executable="/opt/scripts/drain-traffic.sh" \
    --post-patch-linux-executable="/opt/scripts/restore-traffic.sh" \
    --reboot-config=DEFAULT \
    --display-name="Patch with traffic drain"
```

Example pre-patch script:

```bash
#!/bin/bash
# drain-traffic.sh - Remove this instance from the load balancer before patching

# Signal the health check to fail so the LB stops sending traffic
echo "unhealthy" > /var/www/html/health

# Wait for existing connections to drain
sleep 30

echo "Instance drained, ready for patching"
```

Example post-patch script:

```bash
#!/bin/bash
# restore-traffic.sh - Add this instance back to the load balancer after patching

# Verify the application is running
systemctl is-active nginx || systemctl start nginx

# Restore the health check
echo "healthy" > /var/www/html/health

echo "Instance restored to service"
```

## Monitoring Patch Compliance

After setting up patching, you need to verify it is actually working.

```bash
# List all patch jobs and their status
gcloud compute os-config patch-jobs list --limit=10

# Get details of a specific patch job
gcloud compute os-config patch-jobs describe JOB_ID

# List instance details for a patch job to see per-VM status
gcloud compute os-config patch-jobs list-instance-details JOB_ID
```

Check the OS inventory for each VM to see its patch status:

```bash
# View the OS inventory for an instance
gcloud compute os-config inventories describe my-vm \
    --location=us-central1-a

# List available package updates for a specific VM
gcloud compute os-config inventories list-vulnerability-reports \
    --location=us-central1-a \
    --filter="name:my-vm"
```

## Handling Patch Failures

Not every patch job succeeds on every VM. Here is how to handle failures:

```bash
# List instances that failed in a patch job
gcloud compute os-config patch-jobs list-instance-details JOB_ID \
    --filter="state=FAILED"
```

Common failure reasons:

1. **Agent not running**: The OS Config agent crashed or was not installed
2. **Network issues**: The VM cannot reach the package repositories
3. **Disk full**: Not enough space to download and install updates
4. **Package conflicts**: Dependency issues preventing updates
5. **Timeout**: The patch process took longer than the allowed duration

For each failure, check the VM's patch output:

```bash
# Get detailed failure information for a specific instance
gcloud compute os-config patch-jobs list-instance-details JOB_ID \
    --filter="instanceName:my-failing-vm" \
    --format=json
```

## Best Practices

1. **Start with non-production**: Test your patch schedule on staging/dev VMs for a few weeks before applying to production.
2. **Use disruption budgets**: Never patch all instances simultaneously. A disruption budget of 25-33% is a good starting point.
3. **Schedule during low-traffic windows**: Patch during your quietest hours.
4. **Use pre/post scripts** for load-balanced services to drain and restore traffic gracefully.
5. **Monitor patch compliance**: Set up alerts for patch job failures.
6. **Separate schedules by environment**: Patch dev weekly, staging bi-weekly, and production monthly.
7. **Test reboots**: Some patches require a reboot. Make sure your services recover automatically after reboot.
8. **Keep track of rollback plans**: If a patch causes issues, know how to revert.

## Wrapping Up

Automated patch management removes one of the most tedious and error-prone tasks from your operational burden. With GCP's OS Patch Management, you define what to patch, when to patch, and how to roll it out, and the system handles the execution. Combined with disruption budgets and zone-by-zone rollouts, you can keep your fleet up to date without causing service disruptions. Start with simple weekly patches and iterate from there as you gain confidence in the process.
