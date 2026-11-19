# Patch Manager Stuck on “In Progress” or “Pending Reboot”: Trace the Agent, OS Updater, and Patch Logs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AWS, Systems Manager, Patch Manager, Troubleshooting

Description: Diagnose stalled Patch Manager operations by correlating command status, patch compliance, agent logs, native updater activity, and post-reboot scans.

An installation can finish while Patch Manager still reports `InstalledPendingReboot`. Conversely, an `InProgress` command does not establish that packages are being installed: delivery or agent availability can also explain it. Diagnose execution and compliance separately before retrying an installation. [Command statuses](https://docs.aws.amazon.com/systems-manager/latest/userguide/monitor-commands.html), [patch state definitions](https://docs.aws.amazon.com/systems-manager/latest/APIReference/API_InstancePatchState.html)

## Identify the operation behind the label

Record the account, Region, node, command ID, document version, and incident time. From an authorized workstation, these Bash commands only retrieve information; replace the example values:

```bash
patch_profile='production'
patch_region='us-east-1'
patch_node='i-0123456789abcdef0'
patch_command='00000000-0000-0000-0000-000000000000'
ssm_read() {
  aws --profile "$patch_profile" --region "$patch_region" ssm "$@"
}

ssm_read list-commands --command-id "$patch_command" --output json
ssm_read list-command-invocations --command-id "$patch_command" \
  --instance-id "$patch_node" --details --output json
```

The first response describes the parent request, including submitted `Parameters`. Resolve `Operation` and `RebootOption` from those values and the incident-time document definition. A recorded `$DEFAULT`, `$LATEST`, or missing version does not pin that definition; recover the numeric version or retained definition before inferring omitted defaults. The second response describes this node and its `CommandPlugins`. Compare `StatusDetails`, response codes, and timestamps. Parent success does not establish success on every target. For a particular step, copy its actual `Name`, rather than an action such as `aws:runShellScript`:

```bash
patch_step='replace-with-CommandPlugins-Name'
ssm_read get-command-invocation --command-id "$patch_command" \
  --instance-id "$patch_node" --plugin-name "$patch_step" --output json
```

This returns step output and execution times. Results are eventually consistent; an immediately missing invocation merits a later read. [List commands](https://docs.aws.amazon.com/cli/latest/reference/ssm/list-commands.html), [invocation details](https://docs.aws.amazon.com/cli/latest/reference/ssm/list-command-invocations.html), [step semantics](https://docs.aws.amazon.com/systems-manager/latest/APIReference/API_GetCommandInvocation.html)

Now retrieve compliance independently:

```bash
ssm_read describe-instance-patch-states \
  --instance-ids "$patch_node" --output json
ssm_read describe-instance-patches --instance-id "$patch_node" \
  --filters 'Key=State,Values=InstalledPendingReboot' --output json
```

Compare `OperationStartTime`, `OperationEndTime`, `Operation`, `BaselineId`, and `SnapshotId` with the attempted execution. `LastNoRebootInstallOperationTime` records the latest attempt using `NoReboot`. An older compliance report cannot establish today's progress; a missing state record is missing evidence, not proof of compliance. Preserve the snapshot ID to identify the baseline snapshot used for that report. [State query](https://docs.aws.amazon.com/cli/latest/reference/ssm/describe-instance-patch-states.html), [field definitions](https://docs.aws.amazon.com/systems-manager/latest/APIReference/API_InstancePatchState.html), [patch filters](https://docs.aws.amazon.com/cli/latest/reference/ssm/describe-instance-patches.html)

## Follow the agent into the updater

Use an existing administrative connection if Run Command itself is unhealthy. Match the command ID and timestamps in these locations, retaining rotated logs:

| Evidence | Linux | Windows Server |
| --- | --- | --- |
| Agent logs | `/var/log/amazon/ssm/` | `%PROGRAMDATA%\Amazon\SSM\Logs\` |
| Local command output | `/var/lib/amazon/ssm/` | `%PROGRAMDATA%\Amazon\SSM\InstanceData\` |
| Patch-specific evidence | Matching command's orchestration directory, including `PatchLinux` output | `%PROGRAMDATA%\Amazon\PatchBaselineOperations\Logs\` |

Directory nesting varies by document; locate the matching execution instead of assuming the newest file belongs to it. Look for payload download, baseline retrieval, package selection, installation, reboot, and reporting messages. [Agent log locations](https://docs.aws.amazon.com/systems-manager/latest/userguide/ssm-agent-logs.html), [patch evidence collection](https://docs.aws.amazon.com/systems-manager/latest/userguide/patch-manager-troubleshooting.html)

For **Ubuntu Server 22.04/24.04 using APT**, inspect processes and competing automatic updates:

```bash
ps -eo pid,ppid,etime,time,stat,args --forest
sudo fuser -v /var/lib/dpkg/lock /var/lib/dpkg/lock-frontend
systemctl list-timers --all apt-daily.timer apt-daily-upgrade.timer
sudo tail -n 80 /var/log/dpkg.log
sudo tail -n 80 /var/log/unattended-upgrades/unattended-upgrades.log
sudo tail -n 80 /var/log/unattended-upgrades/unattended-upgrades-dpkg.log
```

Follow the patch worker's process tree to its updater; compare successive observations with dpkg's package-state transitions. A quiet interval alone does not establish a hang. Ubuntu's APT timers can overlap another installer, and unattended-upgrade logs reveal their work. Those logs may be absent when that service has not run. [dpkg logging](https://manpages.debian.org/bookworm/dpkg/dpkg.1.en.html), [Ubuntu automatic updates](https://ubuntu.com/server/docs/how-to/software/automatic-updates/), [process fields](https://manpages.ubuntu.com/manpages/noble/man1/ps.1.html)

`fuser -v` identifies processes using the files, not definitive lock ownership; correlate the PID with updater errors and activity. Its empty output can also reflect access problems. A dpkg lock file's existence does not mean a lock is held. Never delete it to unblock patching. Wait for legitimate work, then resolve competing schedules; investigate a frozen updater before considering any termination or package-database repair. [fuser behavior](https://manpages.ubuntu.com/manpages/noble/man1/fuser.1.html), [Debian dpkg locking guidance](https://wiki.debian.org/Teams/Dpkg/FAQ)

Patch Manager also has its own concurrency lock. A `Cannot acquire lock` error calls for checking overlapping patch policies, maintenance windows, and manual runs. It is separate from APT's locks. [AWS concurrency troubleshooting](https://docs.aws.amazon.com/systems-manager/latest/userguide/patch-manager-troubleshooting.html)

For **Windows Server 2022**, use elevated Windows PowerShell to inspect the update event stream and servicing log:

```powershell
$patchSince = (Get-Date).AddHours(-2) # Replace with the incident window.
Get-WinEvent -FilterHashtable @{
    LogName = 'Microsoft-Windows-WindowsUpdateClient/Operational'
    StartTime = $patchSince
} | Select-Object TimeCreated, Id, LevelDisplayName, Message
Get-Content "$env:windir\Logs\CBS\CBS.log" -Tail 100
```

Correlate update identifiers and error codes with the patch log. Service uptime alone does not show installation progress. [Windows Server event guidance](https://learn.microsoft.com/en-us/troubleshoot/windows-server/installing-updates-features-roles/troubleshoot-windows-server-update-guidance), [Get-WinEvent](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.diagnostics/get-winevent?view=powershell-5.1), [CBS diagnostics](https://learn.microsoft.com/en-us/troubleshoot/windows-server/installing-updates-features-roles/fix-windows-update-errors)

If needed, `Get-WindowsUpdateLog -LogPath "$env:TEMP\Patch-WindowsUpdate.log"` exports readable traces. It creates a static diagnostic file; regenerate it for later observations. Omit `-ForceFlush` during observation because that option stops update services. [Export semantics](https://learn.microsoft.com/en-us/powershell/module/windowsupdate/get-windowsupdatelog?view=windowsserver2022-ps), [static log behavior](https://learn.microsoft.com/en-us/windows/deployment/update/windows-update-logs)

## Repair the dependency shown by the evidence

For download failures, check the exact failing endpoint: SSM connectivity does not provide access to OS repositories, Microsoft Update/WSUS, or required S3 buckets. Verify DNS, proxy/TLS configuration, routing, and permissions for that destination. Check the installed agent and OS-specific Python/package prerequisites too; an online node can still lack patching dependencies. [Patch Manager prerequisites](https://docs.aws.amazon.com/systems-manager/latest/userguide/patch-manager-prerequisites.html)

For worker startup failures, use the [worker-resource troubleshooting guide](https://oneuptime.com/blog/post/2026-11-19-ssm-document-worker-timed-out/view). For an expired command, inspect the [delivery and execution clocks](https://oneuptime.com/blog/post/2026-11-19-ssm-run-command-delivery-execution-timeouts/view). Neither timeout nor cancellation establishes that OS work has stopped or changes were rolled back. AWS explicitly provides no process-termination guarantee for cancellation. Reconcile native updater activity before retrying. [Cancellation contract](https://docs.aws.amazon.com/systems-manager/latest/APIReference/API_CancelCommand.html)

## Complete a pending reboot deliberately

With `AWS-RunPatchBaseline`, `NoReboot` tells Patch Manager not to initiate an OS restart, but service restarts can still occur. It does not prevent unrelated OS or administrative activity from rebooting the node. Installed patches can remain `InstalledPendingReboot` and noncompliant. This is Patch Manager's tracking state, not a live probe of the OS's own reboot-needed signal. `RebootIfNeeded` can reboot after any installed patch, rather than checking each package's actual reboot requirement; it also handles previously pending patches during `Install`. [Reboot options](https://docs.aws.amazon.com/systems-manager/latest/userguide/patch-manager-aws-runpatchbaseline.html), [external reboots during patching](https://docs.aws.amazon.com/systems-manager/latest/userguide/patch-manager-troubleshooting.html)

Once installation has finished and active updater work is reconciled, drain workloads and perform the planned reboot under your maintenance procedure. Verify that the boot changed, the agent returned, and application readiness recovered. Then run a fresh `Scan` through the intended patch policy or document and inspect its completed invocation and new compliance timestamps. Preserve both reports' baseline/snapshot context; the scan creates new evidence. Check pending, missing, and failed counts: clearing the reboot condition does not fix other noncompliance.

Preserve Patch Manager's tracking files. Deleting them corrupts compliance evidence. A completed scan after the controlled reboot supplies the reporting evidence needed to close the incident. [Tracking files and post-reboot scan](https://docs.aws.amazon.com/systems-manager/latest/userguide/patch-manager-aws-runpatchbaseline.html)
