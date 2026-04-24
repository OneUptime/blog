# How to Run Edge Jobs Across Remote Environments in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Edge Computing, Automation, DevOps

Description: Learn how to schedule and run one-off or recurring Edge Jobs across remote edge environments using Portainer's Edge Compute features.

## Introduction

Edge Jobs in Portainer allow you to schedule and run a script directly on one or many remote edge hosts. This is ideal for tasks like log rotation, health checks, certificate renewals, database backups, or any maintenance task that needs to run on edge hardware.

## Prerequisites

- Portainer Business Edition with Edge Compute enabled
- Edge agents connected to supported Docker Standalone environments that use `/etc/cron.d` for scheduling
- Admin or edge admin role in Portainer

## What Are Edge Jobs?

An Edge Job is essentially a scheduled host task managed by Portainer. Portainer:
1. Sends the job definition to the edge agents.
2. Each agent writes the schedule to the underlying host.
3. The script runs directly on the edge host when the schedule triggers.

Edge Jobs support one-time or recurring execution depending on how you configure the schedule.

## Step 1: Navigate to Edge Jobs

1. Log in to Portainer.
2. Go to **Edge Compute > Edge Jobs**.
3. Click **Add Edge Job**.

## Step 2: Configure the Edge Job

Fill in the form:

- **Name**: A descriptive label (e.g., `log-rotation-nightly`).
- **Configuration**:
  - **Basic Configuration** - select a date from the calendar.
  - **Advanced Configuration** - provide a cron expression.
- If you configure a recurring Edge Job, also enter the Edge job time. The time is based on the time on the host, not the Portainer Server.

```text
# Cron expression examples:

# Run every night at 2:00 AM
0 2 * * *

# Run every hour
0 * * * *

# Run every Monday at 8:00 AM
0 8 * * 1
```

## Step 3: Write the Job Script

The script runs on the edge host, not inside a container. Use commands and paths that exist on that host.

```bash
#!/bin/sh
# Example: clean up logs older than 7 days on the edge host

find /var/log/myapp -name "*.log" -mtime +7 -delete
echo "Log cleanup complete on $(hostname)"
```

Or a more advanced backup job:

```bash
#!/bin/sh
# Example: back up a SQLite database from the edge host to a remote S3 bucket
# Requires the AWS CLI to be installed on the host

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DEVICE_ID=$(hostname)

# Copy DB file and upload to S3
cp /data/app.db "/tmp/app_backup_${TIMESTAMP}.db"
aws s3 cp "/tmp/app_backup_${TIMESTAMP}.db" \
    "s3://mybucket/backups/${DEVICE_ID}/app_backup_${TIMESTAMP}.db"

echo "Backup complete: ${DEVICE_ID} at ${TIMESTAMP}"
```

## Step 4: Verify Host Dependencies

Because Edge Jobs do not run in a container, there is no image to select. Any tools referenced by your script must already be installed on the edge host.

```text
Examples of host-installed tools your script might rely on:
find
cp
aws   # only if you use the S3 example
```

In Portainer's UI, use the web editor to write or paste the script directly into the Edge Job form.

## Step 5: Reference Host Paths Directly

Because the job runs on the host, reference host paths directly in the script. There are no container bind mounts to configure for Edge Jobs.

```text
Example host paths:
Logs:            /var/log/myapp
SQLite database: /data/app.db
Temporary files: /tmp
```

This allows your job script to read or write files on the edge device's filesystem.

## Step 6: Target Edge Groups or Environments

Under **Edge Groups** or **Target environments**, select where the job should run:

- Select a full edge group (e.g., `Factory-Floor-Berlin`) to run on all devices.
- Select individual environments for targeted execution.

## Step 7: Review Job Results

After the job runs:
1. Navigate to **Edge Compute > Edge Jobs**.
2. Click on the job name.
3. Review the status for each targeted environment and any available execution output or logs.

```text
# Example output in Portainer Edge Job results:
Environment: device-berlin-001  | Status: Completed
Output: Log cleanup complete on device-berlin-001
Backup complete: device-berlin-001 at 20260320_020001
```

## Best Practices

- **Remember Edge Jobs run directly on the host** and can make host-level changes, so use them carefully.
- **Keep scripts portable** and only rely on tools that are installed on the edge host.
- **Log output to stdout/stderr** so Portainer captures it in the job results.
- **Test jobs on a single environment** before targeting an entire edge group.
- **Set sensible schedules** - avoid running heavy jobs during peak operational hours, and remember scheduling uses each host's local time.
- **Idempotent scripts**: Design scripts so that re-running them doesn't cause harm.

## Conclusion

Portainer Edge Jobs provide a simple, centralized way to run administrative and maintenance tasks across your entire edge fleet. With centralized scheduling and per-environment targeting, you get the control needed to keep distributed environments running smoothly without direct SSH access to each device.
