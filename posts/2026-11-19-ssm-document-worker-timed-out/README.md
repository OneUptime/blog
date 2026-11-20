# SSM `document worker timed out`: Disk, Memory, and Worker Log Checks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AWS, Systems Manager, Linux, Troubleshooting

Description: Diagnose SSM document worker timeouts on Linux using matching worker logs, filesystem and memory evidence, process descriptor limits, and inotify usage.

An SSM failure containing `document worker timed out` calls for investigating the worker and its host resources. AWS documents this symptom when a Linux session cannot create its worker communication channel. Increasing a shell document's `executionTimeout` does not repair that channel. `ExecutionTimedOut` separately describes a command that started but exceeded its execution allowance. [Session troubleshooting](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-troubleshooting.html), [command status definitions](https://docs.aws.amazon.com/systems-manager/latest/userguide/monitor-commands.html)

Use this procedure on a Linux systemd host through an existing recovery connection. Run Command may share the failing worker infrastructure. If the error instead concerns session authorization or logging preferences, use the [online-node session troubleshooting guide](https://oneuptime.com/blog/post/2026-11-19-fleet-manager-online-session-manager-fails/view).

## Match the worker to the failed attempt

Record the instance, Region, agent version, command/session ID, and failure time before restarting anything. For a package installation, set the service below; for Ubuntu Snap, use `snap.amazon-ssm-agent.amazon-ssm-agent.service`. [AWS service names](https://docs.aws.amazon.com/systems-manager/latest/userguide/ssm-agent-status-and-restart.html)

```bash
ssm_unit='amazon-ssm-agent.service'
ssm_failure_id='replace-with-command-or-session-id'
ssm_since='2026-11-19 10:00:00 UTC'
ssm_until='2026-11-19 10:05:00 UTC'

sudo systemctl status "$ssm_unit" --no-pager
sudo ls -lt /var/log/amazon/ssm/
sudo grep -RFn -- "$ssm_failure_id" /var/log/amazon/ssm/
sudo journalctl -u "$ssm_unit" --since "$ssm_since" \
  --until "$ssm_until" --no-pager
```

Read the matching `ssm-document-worker` or `ssm-session-worker` entries and preceding errors, including rotated files. Logging configuration can place worker entries in different files; do not assume each ID has its own filename. Agent logs live under `/var/log/amazon/ssm/`; command stdout/stderr files live under `/var/lib/amazon/ssm/`. Preserve relevant files before cleanup. [Log locations and debug configuration](https://docs.aws.amazon.com/systems-manager/latest/userguide/ssm-agent-logs.html)

An empty command output is consistent with a worker that never started the script, but does not prove the cause. Look for a failed write, allocation, channel creation, process exit, or OOM event at that time.

## Check the filesystem that actually failed

```bash
df -hT /var/lib/amazon/ssm /var/log/amazon/ssm /tmp
df -i /var/lib/amazon/ssm /var/log/amazon/ssm /tmp
findmnt -T /var/lib/amazon/ssm
```

Check both available bytes and inodes on the filesystem containing the failing path. A separate `/var` mount can fill while `/` has space; many tiny files can exhaust inodes. `df` accepts paths and reports their containing filesystems. [GNU df reference](https://man7.org/linux/man-pages/man1/df.1.html)

For a failed file write, investigate that mount's capacity, quotas, and read-only status. Repair the producing workload, apply its retention policy, or expand the filesystem. Avoid deleting the SSM state directory or active logs as a generic fix: they contain execution state and the evidence needed here.

Read the operation associated with `no space left on device`. If it comes from **adding an inotify watch**, Linux documents watch exhaustion or kernel resource allocation failure as possible causes. Freeing disk space would not address that condition. [inotify_add_watch errors](https://man7.org/linux/man-pages/man2/inotify_add_watch.2.html)

## Correlate memory pressure and OOM kills

```bash
free -h
ps -eo pid,ppid,rss,comm --sort=-rss | head -n 15
sudo journalctl -k --since "$ssm_since" --until "$ssm_until" \
  --no-pager | grep -Ei 'oom|out of memory|killed process'
sudo systemctl show "$ssm_unit" \
  -p ControlGroup -p MemoryCurrent -p MemoryMax -p TasksCurrent -p TasksMax
```

Match a killed process to the worker or agent and incident timestamp. `journalctl -k` defaults to the current boot; after a reboot, select the incident's retained boot with `-b`. Current free memory cannot reconstruct an earlier peak. Check service and parent-slice memory limits even when the host has spare RAM. systemd resource controls apply to the service's cgroup, and ancestor limits also matter. [journalctl filters](https://www.freedesktop.org/software/systemd/man/latest/journalctl.html), [systemd resource controls](https://www.freedesktop.org/software/systemd/man/latest/systemd.resource-control.html)

On a cgroup v2 host mounted at `/sys/fs/cgroup`, inspect the service counters:

```bash
if ssm_cgroup=$(systemctl show "$ssm_unit" -p ControlGroup --value) &&
   [[ $ssm_cgroup == /* && $ssm_cgroup != / ]]; then
  sudo cat "/sys/fs/cgroup${ssm_cgroup}/memory.events"
else
  printf 'Service cgroup unavailable; check the unit and its state.\n' >&2
fi
```

An increasing `oom_kill` counter indicates OOM victims in that cgroup, including descendant cgroups by default; it does not identify the process or timestamp. `memory.events.local` excludes descendants. Compare snapshots around a controlled reproduction and correlate logs. [Kernel memory-event definitions](https://www.kernel.org/doc/html/latest/admin-guide/cgroup-v2.html)

Resolve the identified consumer: reduce overlapping jobs, correct a leak, add capacity, or fix an inappropriate cgroup cap. A restart alone can hide a growing leak temporarily.

## Measure descriptors in the affected process

The limit in your login shell is not the service's effective limit. `MainPID` can identify a supervisor; select the actual `ssm-agent-worker`, `ssm-document-worker`, or `ssm-session-worker` from the service tree and match it to the failure:

```bash
sudo systemctl status "$ssm_unit" --no-pager
sudo systemctl show "$ssm_unit" \
  -p MainPID -p LimitNOFILE -p LimitNOFILESoft
sudo systemctl cat "$ssm_unit"

ssm_pid='1234' # Replace with the actual PID being investigated.
sudo cat "/proc/$ssm_pid/limits"
if ssm_fds=$(sudo find "/proc/$ssm_pid/fd" -mindepth 1 -maxdepth 1 -printf '.'); then
  printf 'Open descriptor entries: %s\n' "${#ssm_fds}"
else
  printf 'Descriptor count unavailable; check the PID and permissions.\n' >&2
fi
sudo ls -l "/proc/$ssm_pid/fd"
```

`/proc/PID/limits` exposes actual soft/hard limits; `/proc/PID/fd` has an entry per open descriptor. Inspect the failing worker as well as its parents, since counts differ. This live inventory can change during collection. Short-lived workers require capture during reproduction; a vanished PID is not zero usage. [Process limits](https://man7.org/linux/man-pages/man5/proc_pid_limits.5.html), [descriptor entries](https://man7.org/linux/man-pages/man5/proc_pid_fd.5.html)

If usage reaches the process limit, identify accumulating sockets/files and review service overrides. Correct the leak or restore an unintended override. Set `LimitNOFILE` only after sizing the workload and checking application compatibility; systemd distinguishes soft and hard limits. [LimitNOFILE semantics](https://www.freedesktop.org/software/systemd/man/latest/systemd.exec.html)

## Distinguish inotify exhaustion from descriptor exhaustion

AWS identifies `NewFileWatcherChannel` failures with `too many open files` while starting a watcher as a strong lead for the per-UID inotify instance limit. However, Linux `inotify_init` can return `EMFILE` for either that limit or the process descriptor limit. `ENFILE` instead indicates the system-wide open-file limit, while `ENOMEM` indicates insufficient kernel memory. Keep the preceding PID checks and match the actual error. [AWS watcher troubleshooting](https://docs.aws.amazon.com/systems-manager/latest/userguide/troubleshooting-ssm-agent.html), [Linux error semantics](https://man7.org/linux/man-pages/man2/inotify_init.2.html)

```bash
sysctl fs.inotify.max_user_instances fs.inotify.max_user_watches
if ssm_uid=$(ps -o ruid= -p "$ssm_pid") &&
   [[ $ssm_uid =~ ^[[:space:]]*[0-9]+[[:space:]]*$ ]]; then
  ssm_uid=${ssm_uid//[[:space:]]/}
  if ssm_pids=$(pgrep -U "$ssm_uid"); then
    for ssm_other in $ssm_pids; do
      if ssm_refs=$(sudo find "/proc/$ssm_other/fd" -maxdepth 1 \
        -lname 'anon_inode:*inotify*' -printf '.'); then
        printf 'PID %s inotify descriptor references: %s\n' "$ssm_other" "${#ssm_refs}"
      else
        printf 'PID %s: inventory unavailable.\n' "$ssm_other" >&2
      fi
    done
  else
    printf 'No matching PIDs, or process inventory failed.\n' >&2
  fi
else
  printf 'Real UID unavailable; check the selected PID.\n' >&2
fi
```

This inventory locates consumers sharing the real UID, including unrelated services. Shared or duplicated descriptors can inflate counts, and processes can exit during collection; treat it as an inventory, not an exact quota meter. [Inotify quotas](https://man7.org/linux/man-pages/man7/inotify.7.html), [descriptor duplication](https://man7.org/linux/man-pages/man2/dup.2.html)

If evidence supports instance exhaustion, close confirmed unneeded sessions and investigate excessive consumers. For this watcher-creation signature, AWS recommends `fs.inotify.max_user_instances=8192`, subject to workload and OS policy. If appropriate and the current value is lower:

```bash
sudo sysctl -w fs.inotify.max_user_instances=8192
```

Persist the verified value through your managed `/etc/sysctl.d/` configuration. `max_user_watches` is a separate limit for watched paths; change it only with watch-exhaustion evidence. Increasing `LimitNOFILE` does not increase either inotify quota. [AWS limit guidance](https://docs.aws.amazon.com/systems-manager/latest/userguide/troubleshooting-ssm-agent.html)

## Verify the repair with the original operation

If a service configuration change requires a restart, preserve evidence and account for interruption to active commands and sessions first:

```bash
sudo systemctl daemon-reload
sudo systemctl restart "$ssm_unit"
sudo systemctl status "$ssm_unit" --no-pager
```

Repeat the original command or session using the same document and target. Confirm expected output or a usable shell, inspect the new worker log entries, and repeat the resource measurements under representative load. Record the causal evidence and repair; an online heartbeat alone does not establish that workers can execute successfully.
