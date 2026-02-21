# How to Use Ansible Ad Hoc Commands with Background Execution

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Ad Hoc Commands, Background Execution, Async Tasks

Description: Learn how to run long-running Ansible ad hoc commands in the background using async and poll parameters for operations that take minutes or hours.

---

Some operations take a long time. A full system update, a large database backup, a heavy data migration, or a complex build process can run for minutes or even hours. If you run these synchronously, Ansible ties up your terminal and the SSH connection must stay alive the entire time. If the SSH connection drops, the task fails. Background execution solves both problems.

## How Background Execution Works

Ansible's background execution uses two parameters:

- `-B` (or `--background`): The maximum time in seconds the task is allowed to run before Ansible kills it
- `-P` (or `--poll`): How often (in seconds) Ansible checks if the task has finished

When you set `-P 0`, Ansible starts the task and immediately returns without waiting for it to complete. This is the "fire and forget" mode.

```bash
# Run a command in the background with a 1-hour timeout, check every 30 seconds
ansible all -m shell -a "apt-get dist-upgrade -y" --become -B 3600 -P 30

# Fire and forget: start the task and return immediately
ansible all -m shell -a "apt-get dist-upgrade -y" --become -B 3600 -P 0
```

## Fire and Forget Mode (-P 0)

When you set poll to 0, Ansible returns a job ID that you can use to check the status later:

```bash
# Start a long-running backup in the background
ansible databases -m shell -a "pg_dump production | gzip > /backups/production_$(date +%Y%m%d).sql.gz" --become --become-user=postgres -B 7200 -P 0
```

Output:

```
db1 | CHANGED => {
    "ansible_job_id": "124587236789.5432",
    "changed": true,
    "finished": 0,
    "results_file": "/root/.ansible_async/124587236789.5432",
    "started": 1
}
db2 | CHANGED => {
    "ansible_job_id": "987654321012.6543",
    "changed": true,
    "finished": 0,
    "results_file": "/root/.ansible_async/987654321012.6543",
    "started": 1
}
```

The `ansible_job_id` is what you use to check the status later.

## Checking Job Status

After starting a background job, check its progress with the `async_status` module:

```bash
# Check the status of a specific job on a specific host
ansible db1.example.com -m async_status -a "jid=124587236789.5432"
```

If the job is still running:

```json
{
    "ansible_job_id": "124587236789.5432",
    "changed": false,
    "finished": 0,
    "started": 1
}
```

When the job completes:

```json
{
    "ansible_job_id": "124587236789.5432",
    "changed": true,
    "cmd": "pg_dump production | gzip > /backups/production_20260221.sql.gz",
    "delta": "0:05:23.456789",
    "end": "2026-02-21 14:35:23.456789",
    "finished": 1,
    "rc": 0,
    "start": "2026-02-21 14:30:00.000000",
    "stderr": "",
    "stdout": ""
}
```

## Practical Scenarios

### Long-Running System Updates

System updates on a fleet of servers can take 10-30 minutes per host:

```bash
# Start the update in the background on all servers
# Timeout after 2 hours, fire and forget
ansible all -m apt -a "upgrade=dist update_cache=yes" --become -B 7200 -P 0

# Note the job IDs from the output, then check periodically
ansible all -m async_status -a "jid=<job_id>" --one-line

# Or poll every 60 seconds until completion
ansible all -m apt -a "upgrade=dist update_cache=yes" --become -B 7200 -P 60
```

With `-P 60`, Ansible checks every 60 seconds and only returns when all hosts have finished (or timed out). This keeps the SSH connections alive but does not require a persistent terminal session.

### Database Backups

```bash
# Start backups on all database servers
ansible databases -m shell -a "
BACKUP_FILE=/backups/full_backup_\$(date +%Y%m%d_%H%M%S).sql.gz
pg_dump --format=custom production | gzip > \$BACKUP_FILE
echo \"Backup complete: \$BACKUP_FILE (\$(du -sh \$BACKUP_FILE | awk '{print \$1}'))\"
" --become --become-user=postgres -B 14400 -P 0

# Check status later
ansible databases -m async_status -a "jid=<job_id>"
```

### Large File Transfers

```bash
# Download a large file on all servers in the background
ansible all -m shell -a "wget -q https://releases.example.com/app-v5.0.tar.gz -O /tmp/app-v5.0.tar.gz" -B 3600 -P 0

# Check download progress later
ansible all -m shell -a "ls -lh /tmp/app-v5.0.tar.gz 2>/dev/null || echo 'Still downloading'"
```

### Application Build Process

```bash
# Start a build on all build servers
ansible build_servers -m shell -a "cd /opt/app && make clean && make all" -B 3600 -P 0

# Check if the build is still running
ansible build_servers -m shell -a "pgrep -f 'make all' && echo 'Build running' || echo 'Build finished'"
```

## Setting Appropriate Timeouts

The `-B` parameter is a safety net. If your task takes longer than the specified seconds, Ansible kills it. Set it generously but not infinitely:

```bash
# Short task (5 minutes max): package install
ansible all -m apt -a "name=nginx state=present" --become -B 300 -P 10

# Medium task (30 minutes max): system update
ansible all -m apt -a "upgrade=yes" --become -B 1800 -P 30

# Long task (2 hours max): database backup
ansible databases -m shell -a "pg_dump production > /backups/full.sql" --become -B 7200 -P 0

# Very long task (4 hours max): data migration
ansible appservers -m shell -a "/opt/scripts/migrate_data.sh" --become -B 14400 -P 0
```

## Monitoring Background Jobs

Here is a script that monitors background jobs across your fleet:

```bash
#!/bin/bash
# monitor_async_jobs.sh - Monitor Ansible background jobs
# Usage: ./monitor_async_jobs.sh <inventory> <host_pattern> <job_id>

INVENTORY=$1
HOSTS=$2
JOB_ID=$3

echo "Monitoring job $JOB_ID on $HOSTS"
echo "================================"

while true; do
    RESULT=$(ansible "$HOSTS" -i "$INVENTORY" -m async_status -a "jid=$JOB_ID" --one-line 2>/dev/null)

    FINISHED=$(echo "$RESULT" | grep -c '"finished": 1')
    RUNNING=$(echo "$RESULT" | grep -c '"finished": 0')
    FAILED=$(echo "$RESULT" | grep -c "FAILED")

    echo "$(date '+%H:%M:%S') - Finished: $FINISHED, Running: $RUNNING, Failed: $FAILED"

    if [ "$RUNNING" -eq 0 ]; then
        echo ""
        echo "All jobs completed!"
        echo "$RESULT"
        break
    fi

    sleep 30
done
```

## Combining Background Execution with Forks

Background execution and forks complement each other. Forks control how many hosts run simultaneously, while background execution controls whether Ansible waits for completion:

```bash
# Start background tasks on 50 hosts at a time
ansible all -m apt -a "upgrade=yes" --become -B 3600 -P 0 -f 50

# This launches the update on 50 hosts simultaneously,
# then immediately launches on the next 50, and so on.
# Each host runs independently in the background.
```

## Handling Job Failures

When a background job fails:

```bash
# Check the status of a failed job
ansible db1.example.com -m async_status -a "jid=124587236789.5432"

# If the job timed out, the status shows:
# "msg": "Job lookup timed out"

# If the command itself failed, you get the return code and stderr:
# "rc": 1, "stderr": "pg_dump: error: ..."

# Clean up stale async results files
ansible all -m shell -a "ls -la ~/.ansible_async/ 2>/dev/null" --one-line
ansible all -m shell -a "find ~/.ansible_async/ -mtime +1 -delete 2>/dev/null"
```

## Async Results Storage

Background job results are stored on the remote hosts in `~/.ansible_async/`:

```bash
# See all async results on a host
ansible web1.example.com -m shell -a "ls -la ~/.ansible_async/"

# Read a specific result file
ansible web1.example.com -m shell -a "cat ~/.ansible_async/124587236789.5432"

# Clean up old results
ansible all -m shell -a "rm -rf ~/.ansible_async/*" --become
```

## Important Limitations

Background execution has some limitations to be aware of:

```bash
# The copy and template modules do NOT support async
# This will NOT work as expected:
# ansible all -m copy -a "src=./file dest=/tmp/file" -B 300 -P 0

# Use synchronize or shell with scp/rsync instead
ansible all -m shell -a "rsync user@controller:/path/file /tmp/file" -B 300 -P 0

# Modules that require persistent connections may not work well with async
# Test your specific module before relying on it in production
```

## Comparison: Poll vs Fire-and-Forget

```bash
# Poll mode: Ansible stays connected and reports progress
# Good when you want to wait and see the result
ansible all -m shell -a "apt-get upgrade -y" --become -B 1800 -P 30
# Your terminal is occupied until all hosts finish

# Fire-and-forget: Ansible returns immediately
# Good when you want to start the task and check later
ansible all -m shell -a "apt-get upgrade -y" --become -B 1800 -P 0
# Your terminal is free immediately

# You can combine both approaches:
# 1. Fire off the task
ansible all -m shell -a "apt-get upgrade -y" --become -B 1800 -P 0
# 2. Go do other things
# 3. Come back and check
ansible all -m async_status -a "jid=<job_id>"
```

## Summary

Background execution with `-B` and `-P` parameters is essential for running long operations across your fleet without tying up your terminal or risking SSH timeout failures. Use `-P 0` for fire-and-forget tasks where you check results later, and `-P N` for tasks where you want Ansible to poll until completion. Set the `-B` timeout generously to avoid killing legitimate long-running tasks, and use `async_status` to monitor jobs you launched in fire-and-forget mode. This pattern is particularly valuable for system updates, database backups, large file transfers, and any operation that runs for more than a few minutes.
