# Validation Summary: Fix Patch Manager Stuck In Progress or Pending Reboot

## Status

validated

## Post Type

Technical troubleshooting guide with Bash, AWS CLI, Linux diagnostic commands, and Windows PowerShell examples.

## Technologies Covered

- AWS Systems Manager, Run Command, SSM Agent, and Patch Manager
- AWS CLI, patch baselines, compliance reports, and reboot tracking
- Ubuntu Server 22.04/24.04, APT, dpkg, unattended-upgrades, and systemd timers
- Linux process inspection with ps and fuser
- Windows Server 2022, Windows PowerShell, Windows Update/WSUS, and CBS logs
- S3 access and patch-source connectivity

## Sources Consulted

- [Command statuses](https://docs.aws.amazon.com/systems-manager/latest/userguide/monitor-commands.html)
- [patch state definitions](https://docs.aws.amazon.com/systems-manager/latest/APIReference/API_InstancePatchState.html)
- [List commands](https://docs.aws.amazon.com/cli/latest/reference/ssm/list-commands.html)
- [invocation details](https://docs.aws.amazon.com/cli/latest/reference/ssm/list-command-invocations.html)
- [step semantics](https://docs.aws.amazon.com/systems-manager/latest/APIReference/API_GetCommandInvocation.html)
- [State query](https://docs.aws.amazon.com/cli/latest/reference/ssm/describe-instance-patch-states.html)
- [patch filters](https://docs.aws.amazon.com/cli/latest/reference/ssm/describe-instance-patches.html)
- [Agent log locations](https://docs.aws.amazon.com/systems-manager/latest/userguide/ssm-agent-logs.html)
- [patch evidence collection](https://docs.aws.amazon.com/systems-manager/latest/userguide/patch-manager-troubleshooting.html)
- [dpkg logging](https://manpages.debian.org/bookworm/dpkg/dpkg.1.en.html)
- [Ubuntu automatic updates](https://ubuntu.com/server/docs/how-to/software/automatic-updates/)
- [process fields](https://manpages.ubuntu.com/manpages/noble/man1/ps.1.html)
- [fuser behavior](https://manpages.ubuntu.com/manpages/noble/man1/fuser.1.html)
- [Debian dpkg locking guidance](https://wiki.debian.org/Teams/Dpkg/FAQ)
- [Windows Server event guidance](https://learn.microsoft.com/en-us/troubleshoot/windows-server/installing-updates-features-roles/troubleshoot-windows-server-update-guidance)
- [Get-WinEvent](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.diagnostics/get-winevent?view=powershell-5.1)
- [CBS diagnostics](https://learn.microsoft.com/en-us/troubleshoot/windows-server/installing-updates-features-roles/fix-windows-update-errors)
- [Export semantics](https://learn.microsoft.com/en-us/powershell/module/windowsupdate/get-windowsupdatelog?view=windowsserver2022-ps)
- [static log behavior](https://learn.microsoft.com/en-us/windows/deployment/update/windows-update-logs)
- [Patch Manager prerequisites](https://docs.aws.amazon.com/systems-manager/latest/userguide/patch-manager-prerequisites.html)
- [Cancellation contract](https://docs.aws.amazon.com/systems-manager/latest/APIReference/API_CancelCommand.html)
- [Reboot options](https://docs.aws.amazon.com/systems-manager/latest/userguide/patch-manager-aws-runpatchbaseline.html)
- [AWS CLI get-command-invocation](https://docs.aws.amazon.com/cli/latest/reference/ssm/get-command-invocation.html)
- [Ubuntu 22.04 systemctl manual](https://manpages.ubuntu.com/manpages/jammy/man1/systemctl.1.html)
- [GNU tail manual hosted by Debian](https://manpages.debian.org/bookworm/coreutils/tail.1.en.html)
- [Windows PowerShell 5.1 Get-Content](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.management/get-content?view=powershell-5.1)

## Issues Found

No technical issues found.

The README.md was left unchanged. The AWS CLI operations, arguments, filter spelling, response fields, and plugin-name guidance match the official references. The Linux diagnostic commands and PowerShell examples use documented syntax. The agent and patch log paths, separate concurrency locks, cancellation limitations, reboot behavior, tracking-file guidance, and post-reboot scan workflow are consistent with the cited documentation.

## Review Notes

- Reviewed on 2026-11-20. This is technical content and qualifies for full validation.
- Extracted all four Bash code blocks and checked each with `bash -n`; all passed. Reviewed the PowerShell block and inline log-export command against Microsoft documentation. No commands were executed against AWS resources or managed Ubuntu/Windows nodes, so validation does not claim an end-to-end runtime test.
- Confirmed the distinction between parent command status, individual invocation/plugin results, and separately timestamped patch compliance. The warning about resolving historical document versions before inferring parameter defaults is appropriate.
- Confirmed that `NoReboot` does not suppress service restarts or unrelated reboots, and that `RebootIfNeeded` can restart after installing a patch without assessing that patch's individual reboot requirement. A scan after reboot supplies fresh compliance evidence; remaining missing or failed patches still require investigation.
- The OS commands are scoped to the platforms named in the post. Empty event results, missing unattended-upgrade logs, and insufficient permissions can limit collected evidence. The post already accounts for missing logs and the limitations of fuser output.
- Official reference links resolved to relevant documentation except the Debian dpkg FAQ, whose direct fetch returned HTTP 403. Its official search-indexed content was available and confirmed the lock-file guidance. A GNU tail documentation fetch timed out; the Debian-hosted coreutils manual provided the command reference instead.
- The two related OneUptime article URLs could not be retrieved by the browsing tool. Both corresponding README.md files exist in this repository, and their paths match the linked slugs. Their live publication status remains unverified; this did not establish a broken link or warrant changing the post.
- No deprecated API or command usage was identified in the examples. The review preserves the stated Ubuntu and Windows versions rather than implying that commands were tested on every supported OS.
