# How to Use nohup and disown to Run Background Processes on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Process Management, Shell, Linux Administration

Description: Learn how to use nohup and disown on Ubuntu to run processes that survive terminal disconnection, with practical examples for long-running tasks and background jobs.

---

When you start a process in a terminal and close that terminal (or your SSH session drops), the shell sends SIGHUP to its child processes, causing them to terminate. For short commands this is fine, but for long-running tasks - large backups, database migrations, training jobs - you need the process to keep running after you disconnect. `nohup` and `disown` solve this problem in different ways.

## The Problem: SIGHUP and Terminal Disconnection

When you log out or close a terminal:
1. The terminal process closes
2. The shell sends SIGHUP (hangup signal) to all processes in the session
3. Most processes terminate when they receive SIGHUP

Processes in the background (`command &`) are still in the shell's job list and will receive SIGHUP when the shell exits.

## nohup - Run Immune to Hangups

`nohup` (no hangup) runs a command ignoring SIGHUP:

```bash
# Basic usage
nohup command &

# Run a long script that survives disconnect
nohup /usr/local/bin/database-migration.sh &

# The process ID is printed
# [1] 12345
# nohup: ignoring input and appending output to 'nohup.out'
```

By default, `nohup` redirects stdout and stderr to `nohup.out` in the current directory if they are not already redirected.

### Specifying Output Files

```bash
# Redirect output to a specific log file
nohup /usr/local/bin/long-job.sh > /var/log/long-job.log 2>&1 &

# Separate stdout and stderr
nohup /usr/local/bin/long-job.sh \
    > /var/log/long-job.log \
    2> /var/log/long-job-errors.log &

# Discard all output (not recommended for important jobs)
nohup /usr/local/bin/job.sh > /dev/null 2>&1 &
```

### Noting the PID

Always note the PID so you can monitor or kill the process later:

```bash
# Start the job and save the PID
nohup /usr/local/bin/backup.sh > /var/log/backup.log 2>&1 &
echo "Backup started with PID: $!"

# Or save the PID to a file
nohup /usr/local/bin/backup.sh > /var/log/backup.log 2>&1 &
echo $! > /var/run/backup.pid
```

Later, check on it:

```bash
# Check if it is still running
kill -0 $(cat /var/run/backup.pid) && echo "Running" || echo "Not running"

# See its status
ps -p $(cat /var/run/backup.pid)

# Follow its output
tail -f /var/log/backup.log
```

## disown - Detach Running Jobs from the Shell

`disown` is a bash built-in that removes a job from the shell's job list. Once disowned, the process will not receive SIGHUP when the shell exits.

The workflow is:
1. Start the job (with or without `&`)
2. Suspend it if needed (Ctrl+Z)
3. Resume it in the background (`bg`)
4. Disown it

```bash
# Start a long job (foreground)
/usr/local/bin/long-process.sh

# Press Ctrl+Z to suspend it
# [1]+  Stopped   /usr/local/bin/long-process.sh

# Resume it in the background
bg

# Disown it so it survives shell exit
disown
```

You can also disown it by job number or PID:

```bash
# List shell jobs
jobs
# [1]-  Running    nohup /script.sh > log.txt &
# [2]+  Running    /another-script.sh &

# Disown job 1
disown %1

# Disown job 2
disown %2

# Disown all jobs
disown -a

# Disown a process by PID
disown 12345

# Disown and remove from job list (prevents "Done" messages)
disown -h %1
```

## Difference Between nohup and disown

- `nohup`: Starts the command with SIGHUP immunity built in. The process ignores SIGHUP.
- `disown`: Removes a running process from the shell's job table. The shell will not send SIGHUP to it on exit.

For practical purposes, both achieve the same end result: the process keeps running when you disconnect. Use `nohup` when starting a new command, use `disown` when you forgot to use nohup and have a running process you want to keep.

## Practical Examples

### Starting a Database Migration

```bash
# Migration that might take hours
nohup /usr/local/bin/run-migrations.sh \
    > /var/log/migrations-$(date +%Y%m%d).log 2>&1 &

echo "Migration running as PID $!, log at /var/log/migrations-$(date +%Y%m%d).log"
```

### Starting a Build Process

```bash
# Large software build
cd /opt/myproject
nohup make -j4 all > /tmp/build.log 2>&1 &
BUILD_PID=$!
echo "Build PID: $BUILD_PID"
echo "Monitor with: tail -f /tmp/build.log"
```

### Recovering a Foreground Process You Forgot to nohup

You started something in the foreground and your connection is about to drop:

```bash
# The job is running in the foreground...
# Press Ctrl+Z to suspend it
^Z
# [1]+  Stopped   /usr/local/bin/long-task.sh

# Move it to background
bg

# Disown it
disown -h %1

# You can now safely close the terminal
```

The `-h` flag with disown marks the job to not receive SIGHUP without removing it from the job list (you can still see it with `jobs`).

### Running Multiple Independent Jobs

```bash
# Start several background jobs, each with its own log
nohup /usr/local/bin/job-a.sh > /var/log/job-a.log 2>&1 &
JOB_A_PID=$!

nohup /usr/local/bin/job-b.sh > /var/log/job-b.log 2>&1 &
JOB_B_PID=$!

nohup /usr/local/bin/job-c.sh > /var/log/job-c.log 2>&1 &
JOB_C_PID=$!

echo "Jobs started: A=$JOB_A_PID, B=$JOB_B_PID, C=$JOB_C_PID"
```

## Monitoring Nohup Jobs

After you disconnect and reconnect, find your jobs again:

```bash
# Find by process name
pgrep -a -u yourusername

# Find by the script name
ps aux | grep long-process.sh

# If you saved the PID to a file
cat /var/run/myjob.pid
ps -p $(cat /var/run/myjob.pid)

# Follow the output log
tail -f /var/log/myjob.log
```

## Limitations and When to Use Other Tools

While `nohup` and `disown` solve the disconnection problem, they have limitations:

- You cannot easily reattach to a running process's terminal output
- If the system reboots, the process is gone
- Managing multiple long-running jobs gets complicated

For more complex needs, consider:

- **screen or tmux**: Let you reattach to a running terminal session
- **systemd**: Proper process management with restart policies, logging, and boot persistence
- **tmux/screen sessions**: Best for interactive long-running commands where you might want to return

For one-off jobs where you just need to survive disconnect, `nohup` is perfect. For persistent services that need to survive reboots, use systemd.

## Using nohup with Python, Node.js, and Other Interpreters

```bash
# Python script
nohup python3 /home/user/process.py > /var/log/process.log 2>&1 &

# Node.js application
nohup node /home/user/app.js > /var/log/node-app.log 2>&1 &

# Ruby script
nohup ruby /home/user/worker.rb > /var/log/worker.log 2>&1 &

# Shell script with specific interpreter
nohup bash /home/user/task.sh > /var/log/task.log 2>&1 &
```

## A Wrapper Script for nohup Jobs

If you frequently run background jobs, this wrapper makes management easier:

```bash
#!/bin/bash
# /usr/local/bin/run-bg
# Usage: run-bg job-name command [args...]

JOB_NAME="$1"
shift

LOGFILE="/var/log/bg-jobs/${JOB_NAME}-$(date +%Y%m%d-%H%M%S).log"
PIDFILE="/var/run/bg-jobs/${JOB_NAME}.pid"

mkdir -p "$(dirname "$LOGFILE")" "$(dirname "$PIDFILE")"

# Start the job
nohup "$@" > "$LOGFILE" 2>&1 &
JOB_PID=$!

echo $JOB_PID > "$PIDFILE"
echo "Started: $JOB_NAME (PID: $JOB_PID)"
echo "Log: $LOGFILE"
echo "PID file: $PIDFILE"
```

Use it:

```bash
chmod +x /usr/local/bin/run-bg
run-bg database-backup /usr/local/bin/backup.sh
run-bg data-import /usr/local/bin/import.py --source /data/raw
```

Check on jobs later:

```bash
# Check if a named job is still running
JOB="database-backup"
PID=$(cat /var/run/bg-jobs/$JOB.pid 2>/dev/null)
if [ -n "$PID" ] && kill -0 $PID 2>/dev/null; then
    echo "$JOB is running (PID: $PID)"
else
    echo "$JOB is not running"
fi
```

## Summary

`nohup` starts a command immune to SIGHUP, which means it keeps running when you close your terminal or SSH session. Always redirect its output to a log file rather than relying on `nohup.out`. `disown` is the rescue tool for processes already running in the foreground - suspend with Ctrl+Z, background with `bg`, then `disown` to detach from the shell. Both tools are useful for one-off long-running tasks. For processes that need to persist across reboots or have restart capabilities, systemd services are the more appropriate solution.
