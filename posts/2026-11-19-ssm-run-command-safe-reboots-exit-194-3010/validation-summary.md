# Validation Summary: Safe SSM Run Command Reboots: Linux Exit 194 and Windows Exit 3010

## Status
validated

## Post Type
Technical guide with a Linux implementation and a Windows installer-handling fragment.

## Technologies Covered
- AWS Systems Manager Run Command, SSM Agent, AWS CLI, and command documents.
- Linux, Bash, util-linux flock, GNU coreutils, kernel boot identity, and curl.
- Windows Installer (MSI), msiexec, and Windows PowerShell 5.1.
- Amazon S3 and Amazon CloudWatch Logs for command output.

## Sources Consulted
- [AWS reboot handling](https://docs.aws.amazon.com/systems-manager/latest/userguide/send-commands-reboot.html)
- [Plugin resumption](https://github.com/aws/amazon-ssm-agent/blob/mainline/agent/framework/runpluginutil/runpluginutil.go)
- [script execution](https://github.com/aws/amazon-ssm-agent/blob/mainline/agent/plugins/runscript/runscript.go)
- [Exit-code handling](https://docs.aws.amazon.com/systems-manager/latest/userguide/run-command-handle-exit-status.html)
- [Bash exit statuses](https://www.gnu.org/software/bash/manual/html_node/Exit-Status.html)
- [Lock semantics](https://man7.org/linux/man-pages/man1/flock.1.html)
- [Linux boot identity](https://www.kernel.org/doc/html/latest/admin-guide/sysctl/kernel.html#random)
- [curl options](https://curl.se/docs/manpage.html)
- [Rename semantics](https://man7.org/linux/man-pages/man2/rename.2.html)
- [GNU sync semantics](https://www.gnu.org/s/coreutils/manual/html_node/sync-invocation.html)
- [SendCommand options](https://docs.aws.amazon.com/cli/latest/reference/ssm/send-command.html)
- [Script plugin timeouts](https://docs.aws.amazon.com/systems-manager/latest/userguide/documents-command-ssm-plugin-reference.html)
- [MSI return codes](https://learn.microsoft.com/en-us/windows/win32/msi/error-codes)
- [msiexec options](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/msiexec)
- [Start-Process](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.management/start-process?view=powershell-5.1)
- [automatic variables](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_automatic_variables?view=powershell-5.1)
- [Agent configuration](https://github.com/aws/amazon-ssm-agent/blob/mainline/amazon-ssm-agent.json.template)
- [resumption counter](https://github.com/aws/amazon-ssm-agent/blob/mainline/agent/framework/processor/processor.go)
- [Timeout guidance](https://repost.aws/knowledge-center/systems-manager-run-command)
- [Output configuration](https://docs.aws.amazon.com/systems-manager/latest/userguide/sysman-rc-setting-up-cwlogs.html)
- [Invocation details](https://docs.aws.amazon.com/systems-manager/latest/APIReference/API_GetCommandInvocation.html)
- [status interpretation](https://docs.aws.amazon.com/systems-manager/latest/userguide/monitor-commands.html)

## Issues Found
No technical issues found.

## Review Notes
- Reviewed on 2026-11-20. README.md was left unchanged.
- AWS documents Linux exit code 194 and Windows exit code 3010, agent-managed reboot and script restart, and the restriction on reboot scripts nested through aws:runDocument. The agent source confirms that the rebooting plugin is executed again while completed plugins are skipped and the script file is launched afresh.
- Reviewed the Linux branches for an already-correct kernel, missing image, first reboot request, same-boot retry, changed boot with the wrong kernel, invalid checkpoint, and readiness success or failure. The checkpoint and persistent lock design match the stated assumptions. A failed persistence step prevents the explicit reboot exit; a checkpoint can remain without the reboot having been requested. The text correctly explains this uncertainty and the unused allowance when the first run requires no reboot.
- Confirmed flock's file-descriptor and nonblocking syntax, same-filesystem rename semantics, GNU sync -f filesystem flushing, and the Linux boot_id interface. The example requires the stated Linux utilities and filesystem prerequisites; it is not a portable macOS shell script.
- Confirmed curl's initial -q option, proxy bypass, transfer timeout, and HTTP status output. The code requires both transfer success and HTTP 200. The loop permits twelve transfers and sleeps after every failed attempt, including the last one.
- Both Bash code blocks passed /bin/bash -n. Parsed the send-command arguments and successfully decoded the --parameters JSON, confirming the commands and executionTimeout string lists. A harmless local Bash subprocess returned 194 for exit 3010. The deployment command preserves the script's status through exec.
- Microsoft documentation supports MSI result codes 0, 3010, and 1641, and the /i, /qn, /norestart, and /L*v options. The PowerShell fragment uses syntax available in Windows PowerShell 5.1, explicitly inspects ExitCode, and catches unexpected results. It is correctly labeled as an incomplete installer state machine; durable state and post-boot verification must be supplied by the surrounding implementation.
- Confirmed the distinction between delivery and script execution timeouts. AWS's indexed troubleshooting article confirms the stated 172800-second ceiling for SSM Agent 2.0.913.0 and later. Start-Process -Wait waits for descendants and does not itself provide a timeout or rollback.
- Checked the current SSM Agent configuration template and processor source: CommandRetryLimit is 15 and is applied to resumption of in-progress documents through RunCount. The article correctly avoids presenting it as a dedicated reboot allowance. The mainline links are moving references, and installed versions or configuration can differ.
- Confirmed buffered CloudWatch output, required output permissions, per-step invocation inspection, and the limitations of aggregate Success. Application readiness requires the additional evidence described in the post.
- Referenced technical links identify the appropriate resources. Direct browser retrieval of GNU manual pages timed out and AWS re:Post returned HTTP 403; their relevant claims were checked through indexed official-source excerpts. GitHub source was also read through raw.githubusercontent.com.
- Validation consisted of documentation/source review and local syntax, JSON, and exit-status checks. No AWS command was dispatched, no node was rebooted, and no MSI installer or Windows PowerShell 5.1 runtime was executed. Live agent resumption, storage durability under faults, and application-specific readiness remain deployment-level checks.
