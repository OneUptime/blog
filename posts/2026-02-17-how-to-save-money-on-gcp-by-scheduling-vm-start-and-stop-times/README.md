# How to Save Money on GCP by Scheduling VM Start and Stop Times

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Compute Engine, VM Scheduling, Cost Optimization, Google Cloud

Description: Learn how to schedule automatic start and stop times for Google Cloud VMs to avoid paying for compute resources outside of working hours.

---

Development and staging environments do not need to run at 3 AM. Neither do internal tools that nobody uses on weekends. Yet many teams leave their non-production VMs running 24/7 because setting up scheduling feels like a hassle. That hassle costs real money. A single e2-standard-4 VM running around the clock costs about $97/month, but if it only needs to run during business hours on weekdays, you can cut that to roughly $29/month - a 70% savings.

This guide covers multiple approaches to scheduling VM start and stop times, from simple Cloud Scheduler setups to more sophisticated solutions using Instance Schedules.

## The Math Behind VM Scheduling

Let us quantify the savings. Business hours are typically 8 AM to 6 PM, Monday through Friday:

- **24/7 operation**: 730 hours/month
- **Business hours only**: ~220 hours/month (10 hours * 22 weekdays)
- **Savings**: 70% reduction in compute costs

For a team running 20 development VMs:

| Scenario | Monthly Cost | Annual Cost |
|----------|-------------|-------------|
| 24/7 | $1,956 | $23,472 |
| Business hours | $587 | $7,041 |
| **Savings** | **$1,369/month** | **$16,431/year** |

That is meaningful savings for minimal effort.

## Method 1: Instance Schedules (Native GCP Feature)

GCP introduced Instance Schedules as a built-in way to automate VM start and stop times. This is the recommended approach because it requires no custom code.

### Create an Instance Schedule

```bash
# Create a schedule that starts VMs at 8 AM and stops them at 6 PM US Eastern
gcloud compute resource-policies create instance-schedule dev-hours \
  --region=us-central1 \
  --vm-start-schedule="0 8 * * MON-FRI" \
  --vm-stop-schedule="0 18 * * MON-FRI" \
  --timezone="America/New_York" \
  --description="Start at 8 AM, stop at 6 PM ET, weekdays only"
```

The schedule uses cron syntax:
- `0 8 * * MON-FRI` means "at minute 0, hour 8, every day of the month, every month, Monday through Friday"

### Attach the Schedule to VMs

```bash
# Attach the schedule to an existing VM
gcloud compute instances add-resource-policies my-dev-vm \
  --resource-policies=dev-hours \
  --zone=us-central1-a
```

You can attach the same schedule to multiple VMs:

```bash
# Attach to multiple VMs at once
for VM in dev-vm-1 dev-vm-2 dev-vm-3 staging-api staging-worker; do
  gcloud compute instances add-resource-policies $VM \
    --resource-policies=dev-hours \
    --zone=us-central1-a
done
```

### Remove a Schedule

```bash
# Remove a schedule from a VM
gcloud compute instances remove-resource-policies my-dev-vm \
  --resource-policies=dev-hours \
  --zone=us-central1-a
```

### List Active Schedules

```bash
# List all instance schedules in a region
gcloud compute resource-policies list \
  --filter="region:us-central1" \
  --format="table(name, description, instanceSchedulePolicy)"
```

## Method 2: Cloud Scheduler with Cloud Functions

For more flexibility, use Cloud Scheduler to trigger Cloud Functions that start and stop VMs. This approach lets you add custom logic like notifications or conditional scheduling.

### Create the Cloud Function

```python
# main.py - Cloud Function to start/stop VMs
import json
from googleapiclient import discovery

compute = discovery.build('compute', 'v1')

def start_vms(request):
    """Start VMs based on labels."""
    request_json = request.get_json(silent=True)
    project = request_json.get('project', 'my-project')
    zone = request_json.get('zone', 'us-central1-a')
    label_key = request_json.get('label_key', 'schedule')
    label_value = request_json.get('label_value', 'business-hours')

    # Find VMs with the matching label
    result = compute.instances().list(
        project=project,
        zone=zone,
        filter=f'labels.{label_key}={label_value} AND status=TERMINATED'
    ).execute()

    instances = result.get('items', [])
    started = []

    for instance in instances:
        name = instance['name']
        compute.instances().start(
            project=project,
            zone=zone,
            instance=name
        ).execute()
        started.append(name)
        print(f"Started {name}")

    return json.dumps({'started': started})


def stop_vms(request):
    """Stop VMs based on labels."""
    request_json = request.get_json(silent=True)
    project = request_json.get('project', 'my-project')
    zone = request_json.get('zone', 'us-central1-a')
    label_key = request_json.get('label_key', 'schedule')
    label_value = request_json.get('label_value', 'business-hours')

    # Find VMs with the matching label
    result = compute.instances().list(
        project=project,
        zone=zone,
        filter=f'labels.{label_key}={label_value} AND status=RUNNING'
    ).execute()

    instances = result.get('items', [])
    stopped = []

    for instance in instances:
        name = instance['name']
        compute.instances().stop(
            project=project,
            zone=zone,
            instance=name
        ).execute()
        stopped.append(name)
        print(f"Stopped {name}")

    return json.dumps({'stopped': stopped})
```

### Deploy the Functions

```bash
# Deploy the start function
gcloud functions deploy start-vms \
  --runtime=python311 \
  --trigger-http \
  --entry-point=start_vms \
  --region=us-central1 \
  --service-account=vm-scheduler@my-project.iam.gserviceaccount.com

# Deploy the stop function
gcloud functions deploy stop-vms \
  --runtime=python311 \
  --trigger-http \
  --entry-point=stop_vms \
  --region=us-central1 \
  --service-account=vm-scheduler@my-project.iam.gserviceaccount.com
```

### Create Cloud Scheduler Jobs

```bash
# Schedule VMs to start at 8 AM ET on weekdays
gcloud scheduler jobs create http start-dev-vms \
  --schedule="0 8 * * MON-FRI" \
  --time-zone="America/New_York" \
  --uri="https://us-central1-my-project.cloudfunctions.net/start-vms" \
  --http-method=POST \
  --headers="Content-Type=application/json" \
  --message-body='{"project":"my-project","zone":"us-central1-a","label_key":"schedule","label_value":"business-hours"}' \
  --oidc-service-account-email=vm-scheduler@my-project.iam.gserviceaccount.com

# Schedule VMs to stop at 6 PM ET on weekdays
gcloud scheduler jobs create http stop-dev-vms \
  --schedule="0 18 * * MON-FRI" \
  --time-zone="America/New_York" \
  --uri="https://us-central1-my-project.cloudfunctions.net/stop-vms" \
  --http-method=POST \
  --headers="Content-Type=application/json" \
  --message-body='{"project":"my-project","zone":"us-central1-a","label_key":"schedule","label_value":"business-hours"}' \
  --oidc-service-account-email=vm-scheduler@my-project.iam.gserviceaccount.com
```

### Label Your VMs

For the Cloud Function approach to work, label the VMs you want to schedule:

```bash
# Label VMs that should follow the business hours schedule
gcloud compute instances update my-dev-vm \
  --zone=us-central1-a \
  --update-labels=schedule=business-hours
```

## Method 3: Terraform with Instance Schedules

If you manage infrastructure with Terraform, define schedules as code:

```hcl
# Define the instance schedule
resource "google_compute_resource_policy" "dev_hours" {
  name   = "dev-hours"
  region = "us-central1"

  instance_schedule_policy {
    vm_start_schedule {
      schedule = "0 8 * * MON-FRI"
    }
    vm_stop_schedule {
      schedule = "0 18 * * MON-FRI"
    }
    time_zone = "America/New_York"
  }
}

# Attach the schedule to a VM
resource "google_compute_instance" "dev_vm" {
  name         = "dev-vm"
  machine_type = "e2-standard-4"
  zone         = "us-central1-a"

  boot_disk {
    initialize_params {
      image = "debian-cloud/debian-11"
    }
  }

  network_interface {
    network = "default"
  }

  resource_policies = [google_compute_resource_policy.dev_hours.id]

  labels = {
    env  = "development"
    team = "backend"
  }
}
```

## Handling Exceptions

Sometimes you need VMs running outside their normal schedule - a late-night deployment, weekend testing, or an on-call investigation.

### Manual Override

Simply start the VM manually. The schedule will stop it at the next scheduled stop time:

```bash
# Manually start a VM outside its schedule
gcloud compute instances start my-dev-vm --zone=us-central1-a
```

### Temporary Schedule Removal

For longer exceptions, remove the schedule temporarily:

```bash
# Remove schedule for a weekend of testing
gcloud compute instances remove-resource-policies my-dev-vm \
  --resource-policies=dev-hours \
  --zone=us-central1-a

# Re-attach after the weekend
gcloud compute instances add-resource-policies my-dev-vm \
  --resource-policies=dev-hours \
  --zone=us-central1-a
```

### Holiday Awareness

If you use the Cloud Function approach, you can add holiday awareness:

```python
# Add holiday checking to the start function
import holidays

def should_start_today():
    """Check if today is a business day."""
    us_holidays = holidays.US()
    today = datetime.date.today()

    # Skip weekends (handled by cron, but just in case)
    if today.weekday() >= 5:
        return False

    # Skip US holidays
    if today in us_holidays:
        return False

    return True
```

## Monitoring Scheduled VMs

Keep track of your scheduling to make sure it is working:

```bash
# Check which VMs are currently running
gcloud compute instances list \
  --filter="status=RUNNING AND labels.schedule:*" \
  --format="table(name, zone, status, labels.schedule)"

# Check which scheduled VMs are stopped
gcloud compute instances list \
  --filter="status=TERMINATED AND labels.schedule:*" \
  --format="table(name, zone, status, labels.schedule)"
```

Set up a Cloud Monitoring alert to notify you if a scheduled VM is running outside business hours, which could indicate a scheduling failure.

## Best Practices

1. **Start with non-production** - Apply scheduling to development and staging environments first. Never schedule production VMs unless you have a very specific use case.

2. **Add buffer time** - Schedule VMs to start 15-30 minutes before people need them. Boot time and application startup take time.

3. **Use labels consistently** - Label all schedulable VMs so you can manage them as a group.

4. **Account for time zones** - If your team spans multiple time zones, set the schedule to cover the widest window needed.

5. **Monitor for drift** - Periodically check that schedules are still attached and working. A detached schedule means a VM running 24/7 without anyone noticing.

## Wrapping Up

Scheduling VM start and stop times is one of the simplest and most effective cost optimization techniques on GCP. For non-production environments, the savings typically range from 60-75% of compute costs with minimal effort. Use Instance Schedules for simple cases and Cloud Functions with Cloud Scheduler when you need custom logic. The key is to make scheduling the default for every non-production VM.
