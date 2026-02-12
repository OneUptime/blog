# How to Fix EC2 Instance Stuck in Stopping State

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, EC2, Troubleshooting, Instance State, Stopping, Debugging

Description: Resolve EC2 instances stuck in the stopping state with practical debugging steps, force-stop methods, and prevention strategies.

---

You issue a stop command and your EC2 instance transitions to "stopping" - and stays there. Minutes pass. An hour passes. The instance won't actually stop. This is one of the more annoying EC2 issues because there's no force-stop button in the console, and your options are limited. But there are things you can do, and understanding why it happens helps you prevent it in the future.

## Why Instances Get Stuck Stopping

When you stop an EC2 instance, several things happen in sequence:

1. AWS sends a shutdown signal (ACPI shutdown) to the operating system
2. The OS begins its shutdown procedure (stopping services, flushing buffers, unmounting filesystems)
3. The OS signals back that it's ready to power off
4. AWS stops the instance and detaches it from the underlying hardware

The "stuck" happens when step 2 or 3 takes too long or never completes. Common causes:

- **Hung processes**: A process refuses to terminate during shutdown
- **File system issues**: Disk I/O is hanging, preventing filesystem unmount
- **NFS mounts**: Remote filesystems that aren't responsive block the shutdown
- **Shutdown scripts**: Custom shutdown hooks that hang or take too long
- **Kernel issues**: The kernel itself is unresponsive

## How Long Should You Wait?

AWS documentation says an instance can take several minutes to stop. In practice, most instances stop within 2-5 minutes. If it's been more than 15-20 minutes, it's likely stuck.

Check the current state:

```bash
# Check instance state and state transition reason
aws ec2 describe-instances \
  --instance-ids i-0abc123 \
  --query 'Reservations[0].Instances[0].{
    State: State.Name,
    StateReason: StateReason.Message,
    StateTransitionReason: StateTransitionReason
  }'
```

## Step 1: Force Stop via API

The AWS CLI has a `--force` flag for stop that sends a hard power-off signal instead of a graceful ACPI shutdown:

```bash
# Force stop the instance - equivalent to pulling the power plug
aws ec2 stop-instances \
  --instance-ids i-0abc123 \
  --force

# Wait and check status
sleep 30
aws ec2 describe-instances \
  --instance-ids i-0abc123 \
  --query 'Reservations[0].Instances[0].State.Name'
```

The `--force` flag tells the hypervisor to immediately terminate the instance without waiting for the OS to shut down cleanly. This is the virtual equivalent of pulling the power cord.

Important: Force stop can cause data loss. Any data that hasn't been flushed to disk will be lost. EBS volumes should remain intact, but unflushed writes may not be persisted.

## Step 2: Force Stop Doesn't Work Either

Sometimes even force stop doesn't help because the issue is at the infrastructure level, not the OS level. In this case:

```bash
# Try to terminate the instance instead of stopping it
# WARNING: This permanently destroys the instance
aws ec2 terminate-instances --instance-ids i-0abc123
```

If you need the data on the instance, don't terminate yet. Instead, create a snapshot of the EBS volumes while the instance is in the stopping state:

```bash
# Snapshot the volumes before giving up on the instance
VOLUMES=$(aws ec2 describe-instances \
  --instance-ids i-0abc123 \
  --query 'Reservations[0].Instances[0].BlockDeviceMappings[*].Ebs.VolumeId' \
  --output text)

for VOL in $VOLUMES; do
  echo "Creating snapshot of $VOL..."
  aws ec2 create-snapshot \
    --volume-id $VOL \
    --description "Emergency snapshot - instance stuck stopping" \
    --tag-specifications "ResourceType=snapshot,Tags=[{Key=SourceInstance,Value=i-0abc123},{Key=Reason,Value=stuck-stopping}]"
done
```

Then you can terminate the instance and recover the data from snapshots.

## Step 3: Contact AWS Support

If the instance has been stuck for hours and neither stop --force nor terminate work, open a support case. This indicates a problem at the AWS infrastructure level that only AWS can resolve.

```bash
# Check if there are any ongoing AWS events affecting your instance
aws ec2 describe-instance-status \
  --instance-ids i-0abc123 \
  --query 'InstanceStatuses[0].Events'

# Also check the AWS Health Dashboard for your account
aws health describe-events \
  --filter '{"eventTypeCategories":["issue"],"services":["EC2"]}'
```

When opening a support case, include:
- Instance ID
- Region and AZ
- Time the stop was initiated
- Whether force stop was attempted
- Console output (if available)

## Preventing Stuck-Stopping Issues

### Fix Hanging Shutdown Scripts

If your instance has custom shutdown scripts, make sure they have timeouts:

```bash
#!/bin/bash
# /etc/rc0.d/K99cleanup.sh
# Shutdown script with timeout protection

# Run cleanup with a 60-second timeout
timeout 60 /opt/app/shutdown-hook.sh

# If it didn't finish, kill it and move on
if [ $? -eq 124 ]; then
  echo "Shutdown hook timed out, forcing continuation"
fi
```

### Handle NFS Mounts

NFS mounts are a common cause of stuck stops. If the NFS server is unreachable, unmounting hangs indefinitely.

Use the `soft` and `timeo` options when mounting:

```bash
# Mount NFS with soft timeout to prevent hanging during shutdown
mount -t nfs -o soft,timeo=10,retrans=3 nfs-server:/share /mnt/share

# Or in /etc/fstab
# nfs-server:/share /mnt/share nfs soft,timeo=10,retrans=3 0 0
```

Also add lazy unmount to your shutdown hooks:

```bash
# Force-unmount NFS shares during shutdown
umount -l /mnt/share  # Lazy unmount - detaches immediately
```

### Configure Systemd Timeouts

On systemd-based systems, set global shutdown timeouts:

```ini
# /etc/systemd/system.conf
# Set maximum time for services to stop
DefaultTimeoutStopSec=90s
```

For individual services that tend to hang:

```ini
# /etc/systemd/system/my-app.service
[Service]
TimeoutStopSec=30
ExecStop=/opt/app/stop.sh
KillMode=mixed
KillSignal=SIGTERM
FinalKillSignal=SIGKILL
```

The `KillMode=mixed` means systemd sends SIGTERM to the main process and SIGKILL to any remaining processes after the timeout.

### Handle Database Flushes

Databases can take a long time to flush during shutdown. Configure them for faster shutdowns:

For MySQL:

```ini
# /etc/mysql/my.cnf
[mysqld]
# Reduce InnoDB shutdown flush - faster stop at the cost of longer recovery
innodb_fast_shutdown = 1
```

For PostgreSQL:

```ini
# /etc/postgresql/15/main/postgresql.conf
# Reduce checkpoint timeout for faster shutdown
checkpoint_timeout = 30s
```

## Automating Stuck Instance Detection

Set up a Lambda function that checks for instances in the stopping state for too long:

```python
# lambda_check_stuck_stopping.py
import boto3
import time
from datetime import datetime, timezone, timedelta

def lambda_handler(event, context):
    ec2 = boto3.client('ec2')
    sns = boto3.client('sns')

    # Find instances in stopping state
    response = ec2.describe_instances(
        Filters=[{'Name': 'instance-state-name', 'Values': ['stopping']}]
    )

    stuck_instances = []

    for reservation in response['Reservations']:
        for instance in reservation['Instances']:
            instance_id = instance['InstanceId']
            state_change = instance.get('StateTransitionReason', '')

            # If it's been stopping for more than 15 minutes, flag it
            # Note: you may need to track stop time externally
            stuck_instances.append({
                'instance_id': instance_id,
                'instance_type': instance['InstanceType'],
                'az': instance['Placement']['AvailabilityZone']
            })

    if stuck_instances:
        message = f"Found {len(stuck_instances)} instance(s) stuck in stopping state:\n"
        for inst in stuck_instances:
            message += f"  - {inst['instance_id']} ({inst['instance_type']}) in {inst['az']}\n"
        message += "\nConsider using force stop: aws ec2 stop-instances --force --instance-ids <id>"

        sns.publish(
            TopicArn='arn:aws:sns:us-east-1:123456789:ops-alerts',
            Subject='EC2 Instances Stuck in Stopping State',
            Message=message
        )

    return {'stuck_count': len(stuck_instances)}
```

## What About Instances Stuck in Other States?

While this post focuses on the stopping state, instances can get stuck in other transitional states too:

| State | Typical Duration | If Stuck |
|-------|-----------------|----------|
| pending | 1-3 minutes | Check launch logs, may be user-data issue |
| stopping | 1-5 minutes | Force stop or terminate |
| shutting-down | 1-3 minutes | Contact AWS support |
| terminated | Visible for ~1 hour | Normal, will disappear |

For launch-related issues, see [troubleshooting EC2 instance launch failures](https://oneuptime.com/blog/post/troubleshoot-ec2-instance-launch-failures/view).

## Recovery After Force Stop

After a force stop, your instance should boot normally. But because the OS didn't shut down cleanly, you should check for:

```bash
# After restarting, check for filesystem issues
sudo dmesg | grep -i "error\|fail\|corrupt"

# Check if any services failed to start properly
systemctl list-units --state=failed

# Verify data integrity for your applications
# (database consistency checks, log file integrity, etc.)
```

A stuck stopping state is annoying but usually fixable. Force stop resolves most cases, and if that fails, snapshots plus terminate gets you out of the situation while preserving your data. The real fix is prevention - proper shutdown timeouts, soft NFS mounts, and systemd kill configurations keep your instances from getting stuck in the first place.
