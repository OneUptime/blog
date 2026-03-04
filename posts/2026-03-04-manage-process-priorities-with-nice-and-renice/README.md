# How to Manage Process Priorities with nice and renice on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Process Management, Priority, Linux

Description: Learn how to manage Process Priorities with nice and renice on RHEL with step-by-step instructions, configuration examples, and best practices.

---

nice and renice let you adjust process scheduling priorities on RHEL. A process with a higher niceness value gets less CPU time, while a lower niceness value gives it more. This is useful for prioritizing important workloads over background tasks.

## Prerequisites

- RHEL
- Root or sudo access (for setting negative nice values)

## Understanding Nice Values

Nice values range from -20 (highest priority) to 19 (lowest priority). The default is 0.

```
-20 ---- 0 ---- 19
High    Default   Low
Priority         Priority
```

Only root can set negative nice values (higher priority).

## Step 1: Start a Process with a Specific Priority

```bash
nice -n 10 /usr/local/bin/backup.sh
```

This starts the backup script with niceness 10 (lower priority than default).

For highest priority:

```bash
sudo nice -n -20 /usr/local/bin/critical-task
```

## Step 2: Change Priority of a Running Process

```bash
renice -n 15 -p 12345
```

Change all processes for a user:

```bash
sudo renice -n 10 -u backupuser
```

## Step 3: View Current Nice Values

```bash
ps -eo pid,ni,comm | head -20
```

Or with top:

```bash
top
```

The `NI` column shows the nice value.

## Step 4: Use with systemd Services

Set nice values in service units:

```ini
[Service]
Nice=10
```

For higher priority:

```ini
[Service]
Nice=-5
```

## Step 5: Combine with I/O Priority

Use ionice alongside nice for I/O scheduling:

```bash
nice -n 10 ionice -c 3 /usr/local/bin/backup.sh
```

ionice classes:
- `1` - Real-time
- `2` - Best-effort (default)
- `3` - Idle (only gets I/O when no one else needs it)

## Step 6: Set Limits in /etc/security/limits.conf

Allow specific users to set lower nice values:

```bash
sudo vi /etc/security/limits.conf
```

```
appuser  hard  nice  -10
appuser  soft  nice  0
```

## Conclusion

nice and renice provide simple but effective CPU scheduling control on RHEL. Use higher nice values for background tasks like backups and lower values for latency-sensitive services to ensure fair resource allocation.
