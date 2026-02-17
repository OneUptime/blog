# How to Configure Compute Engine Instance Scheduling to Automatically Stop VMs on Weekends

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Compute Engine, Cost Optimization, Cloud Scheduler, Automation

Description: A complete guide to setting up automatic start and stop schedules for Compute Engine VMs to save costs by shutting down development and staging environments during off-hours and weekends.

---

Development and staging VMs sitting idle over weekends and after hours are burning money for no reason. If your team works Monday through Friday during business hours, that is roughly 75% of the week where those VMs do nothing but rack up charges. Automating the start and stop schedule can cut your compute costs dramatically.

There are a couple of ways to do this on GCP. I will cover both the native instance schedule approach and the Cloud Scheduler plus Cloud Functions method, since each has its strengths.

## Method 1: Instance Schedules (Native Feature)

Compute Engine has a built-in instance schedule feature that lets you attach start and stop schedules directly to VMs. This is the simplest approach and does not require any additional services.

### Create an Instance Schedule

First, create a resource policy that defines the schedule:

```bash
# Create a schedule that stops VMs at 7 PM Friday and starts them at 8 AM Monday
gcloud compute resource-policies create instance-schedule weekday-schedule \
  --region=us-central1 \
  --vm-start-schedule="0 8 * * 1" \
  --vm-stop-schedule="0 19 * * 5" \
  --timezone="America/New_York" \
  --description="Start Monday 8 AM, stop Friday 7 PM ET"
```

The schedule uses cron syntax:
- `0 8 * * 1` means "at 8:00 AM on Monday"
- `0 19 * * 5` means "at 7:00 PM on Friday"

For a weekday-only schedule that also handles daily start/stop:

```bash
# Create a schedule that starts VMs at 8 AM and stops them at 7 PM weekdays only
gcloud compute resource-policies create instance-schedule business-hours \
  --region=us-central1 \
  --vm-start-schedule="0 8 * * 1-5" \
  --vm-stop-schedule="0 19 * * 1-5" \
  --timezone="America/Chicago" \
  --description="Business hours only - weekdays 8 AM to 7 PM CT"
```

### Attach the Schedule to VMs

Apply the schedule to existing instances:

```bash
# Attach the schedule to a specific VM
gcloud compute instances add-resource-policies dev-server \
  --zone=us-central1-a \
  --resource-policies=weekday-schedule
```

Apply the schedule to multiple VMs at once:

```bash
# Attach the schedule to all dev VMs using a loop
for vm in dev-server-1 dev-server-2 staging-server; do
  gcloud compute instances add-resource-policies "${vm}" \
    --zone=us-central1-a \
    --resource-policies=weekday-schedule
done
```

### Managing Instance Schedules

List all instance schedules:

```bash
# List all instance schedule policies in the region
gcloud compute resource-policies list \
  --filter="region:us-central1" \
  --format="table(name, description, instanceSchedulePolicy)"
```

Remove a schedule from a VM:

```bash
# Remove the schedule from a VM
gcloud compute instances remove-resource-policies dev-server \
  --zone=us-central1-a \
  --resource-policies=weekday-schedule
```

Delete a schedule:

```bash
# Delete an instance schedule policy
gcloud compute resource-policies delete weekday-schedule \
  --region=us-central1
```

## Method 2: Cloud Scheduler with Cloud Functions

For more complex scheduling logic - like checking if anyone is actively using a VM before stopping it, or handling VMs across multiple regions - Cloud Scheduler with Cloud Functions gives you full control.

### Create the Cloud Function

First, write a Cloud Function that starts or stops VMs based on labels:

```python
# main.py - Cloud Function to start or stop labeled VMs
import functions_framework
from google.cloud import compute_v1

@functions_framework.http
def manage_instances(request):
    """Start or stop Compute Engine instances based on request and labels."""
    request_json = request.get_json(silent=True)

    if not request_json:
        return "Missing request body", 400

    action = request_json.get("action")  # "start" or "stop"
    label_key = request_json.get("label_key", "auto-schedule")
    label_value = request_json.get("label_value", "true")
    project = request_json.get("project")

    if not action or not project:
        return "Missing required fields: action, project", 400

    # Initialize the Compute Engine client
    instances_client = compute_v1.InstancesClient()
    zones_client = compute_v1.ZonesClient()

    # Get all zones in the project
    zones = zones_client.list(project=project)
    results = []

    for zone in zones:
        zone_name = zone.name

        # List instances with the matching label
        instance_list = instances_client.list(
            project=project,
            zone=zone_name,
            filter_=f'labels.{label_key}={label_value}'
        )

        for instance in instance_list:
            try:
                if action == "stop" and instance.status == "RUNNING":
                    # Stop the running instance
                    instances_client.stop(
                        project=project,
                        zone=zone_name,
                        instance=instance.name
                    )
                    results.append(f"Stopping {instance.name} in {zone_name}")

                elif action == "start" and instance.status == "TERMINATED":
                    # Start the stopped instance
                    instances_client.start(
                        project=project,
                        zone=zone_name,
                        instance=instance.name
                    )
                    results.append(f"Starting {instance.name} in {zone_name}")

            except Exception as e:
                results.append(f"Error with {instance.name}: {str(e)}")

    return "\n".join(results) if results else "No instances matched", 200
```

The requirements file:

```
# requirements.txt
functions-framework==3.*
google-cloud-compute==1.*
```

Deploy the Cloud Function:

```bash
# Deploy the instance management Cloud Function
gcloud functions deploy manage-instances \
  --gen2 \
  --runtime=python312 \
  --region=us-central1 \
  --source=./function-source \
  --entry-point=manage_instances \
  --trigger-http \
  --no-allow-unauthenticated \
  --service-account=scheduler-sa@my-project.iam.gserviceaccount.com
```

### Set Up Cloud Scheduler Jobs

Create scheduler jobs that invoke the Cloud Function on a schedule:

```bash
# Create a job to stop VMs at 7 PM Friday
gcloud scheduler jobs create http stop-dev-vms-friday \
  --location=us-central1 \
  --schedule="0 19 * * 5" \
  --time-zone="America/New_York" \
  --uri="https://us-central1-my-project.cloudfunctions.net/manage-instances" \
  --http-method=POST \
  --headers="Content-Type=application/json" \
  --message-body='{"action":"stop","project":"my-project","label_key":"auto-schedule","label_value":"true"}' \
  --oidc-service-account-email=scheduler-sa@my-project.iam.gserviceaccount.com
```

```bash
# Create a job to start VMs at 8 AM Monday
gcloud scheduler jobs create http start-dev-vms-monday \
  --location=us-central1 \
  --schedule="0 8 * * 1" \
  --time-zone="America/New_York" \
  --uri="https://us-central1-my-project.cloudfunctions.net/manage-instances" \
  --http-method=POST \
  --headers="Content-Type=application/json" \
  --message-body='{"action":"start","project":"my-project","label_key":"auto-schedule","label_value":"true"}' \
  --oidc-service-account-email=scheduler-sa@my-project.iam.gserviceaccount.com
```

### Label Your VMs for Scheduling

Tag the VMs you want to auto-schedule:

```bash
# Add the auto-schedule label to VMs that should follow the schedule
gcloud compute instances add-labels dev-server-1 \
  --zone=us-central1-a \
  --labels=auto-schedule=true

gcloud compute instances add-labels staging-server \
  --zone=us-central1-a \
  --labels=auto-schedule=true
```

## Handling Edge Cases

### Override the Schedule

Sometimes someone needs to work over the weekend. You can manually start a VM even when the schedule says it should be stopped:

```bash
# Manually start a VM - it will stay running until the next scheduled stop
gcloud compute instances start dev-server-1 --zone=us-central1-a
```

With the Cloud Function approach, you can add an override label:

```bash
# Add an override label to keep a VM running through the weekend
gcloud compute instances add-labels dev-server-1 \
  --zone=us-central1-a \
  --labels=schedule-override=true
```

Then modify the Cloud Function to check for this label before stopping.

### Graceful Shutdown

Abruptly stopping a VM can cause issues for some applications. Use a shutdown script to handle cleanup:

```bash
# Add a shutdown script to handle graceful application shutdown
gcloud compute instances add-metadata dev-server-1 \
  --zone=us-central1-a \
  --metadata=shutdown-script='#!/bin/bash
# Graceful shutdown script
systemctl stop my-application
echo "Clean shutdown at $(date)" >> /var/log/shutdown.log'
```

## Estimating Savings

Here is a quick calculation. An e2-standard-4 in us-central1 costs about $0.134 per hour. Running 24/7 for a month is roughly $97.

With a weekday business hours schedule (8 AM - 7 PM, Monday - Friday), you run it 55 hours per week instead of 168. That is $32 per month - a 67% cost reduction per VM.

For a team with 20 development VMs, that is savings of roughly $1,300 per month.

## Monitoring the Schedule

Make sure your schedule is working by checking instance activity logs:

```bash
# Check recent start/stop operations for an instance
gcloud compute operations list \
  --filter="targetLink~dev-server AND (operationType=start OR operationType=stop)" \
  --format="table(insertTime, operationType, status, targetLink.basename())" \
  --limit=20
```

Whether you use the native instance schedule or the Cloud Scheduler approach, the key is to actually set it up. I have seen too many teams agree that automated scheduling is a good idea but never get around to implementing it. It takes 15 minutes and pays for itself immediately.
