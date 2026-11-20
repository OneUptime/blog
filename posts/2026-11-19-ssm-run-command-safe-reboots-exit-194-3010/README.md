# Safe SSM Run Command Reboots: Linux Exit 194 and Windows Exit 3010

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AWS, Systems Manager, Run Command, Linux, Automation

Description: Handle SSM Run Command reboots with explicit exit codes, persistent checkpoints, bounded retries, and post-boot verification on Linux and Windows.

A reboot interrupts both your script and the agent reporting its result. Run Command has a protocol for this: the script exits with `194` on Linux or `3010` on Windows. SSM Agent tells Systems Manager that communication will be interrupted, reboots the node, then restarts the script. Calling `reboot`, `shutdown`, or `Restart-Computer` directly can leave execution status incorrect, even when rebooting is the last action. [AWS reboot handling](https://docs.aws.amazon.com/systems-manager/latest/userguide/send-commands-reboot.html)

## Expect the script to start again

Execution does not continue at the line after `exit`. The rebooting script starts again, so variables disappear and earlier commands can run again. The agent re-executes the rebooting plugin while skipping already completed plugins; its script runner launches the script file afresh. [Plugin resumption](https://github.com/aws/amazon-ssm-agent/blob/mainline/agent/framework/runpluginutil/runpluginutil.go), [script execution](https://github.com/aws/amazon-ssm-agent/blob/mainline/agent/plugins/runscript/runscript.go)

Make each change conditional on observed system state. Persist enough information to distinguish a first attempt from resumption, and verify the result after reboot. AWS also explicitly excludes reboot scripts invoked through the `aws:runDocument` plugin. [Idempotence and nesting restriction](https://docs.aws.amazon.com/systems-manager/latest/userguide/send-commands-reboot.html)

Use the appropriate top-level script document: `AWS-RunShellScript` for Linux or `AWS-RunPowerShellScript` for Windows. Preserve the exit code through every wrapper. A successful `echo` after a failed child script can otherwise hide its result; PowerShell requires an explicit `exit` for Run Command to capture the intended code. [Exit-code handling](https://docs.aws.amazon.com/systems-manager/latest/userguide/run-command-handle-exit-status.html)

Bash statuses are eight-bit values: `exit 3010` becomes `194` (`3010 % 256`). Write the documented Linux value explicitly. `return 194` inside a function is insufficient if its caller continues and eventually exits successfully. [Bash exit statuses](https://www.gnu.org/software/bash/manual/html_node/Exit-Status.html)

## A Linux pattern with one reboot available

Consider a kernel already installed and selected as the next boot target. This example does not install packages or configure the bootloader. Verify those prerequisites first, replace the kernel release and maintenance identifier, and deploy this root-owned script as `/opt/maintenance/reboot-once.sh`.

Run it as root with Bash, util-linux `flock`, GNU coreutils, and `curl`. Use a local filesystem that supports `flock` and survives reboot; the state directory and its parent must be trusted, root-owned, and not writable by other users. Keep the directory path and expected kernel unchanged for this operation, including across command IDs. Do not remove or replace the lock file while an invocation can still be running. The lock coordinates cooperating invocations of this operation, not unrelated maintenance. [Lock semantics](https://man7.org/linux/man-pages/man1/flock.1.html)

Here the readiness contract is HTTP `200` from the local application only when it can serve traffic. Replace the URL and, if your endpoint uses a response body or a different status contract, adapt the check accordingly. A generic liveness endpoint is insufficient.

```bash
#!/bin/bash
set -euo pipefail
umask 077

expected_kernel='REPLACE_WITH_EXACT_UNAME_RELEASE'
state_dir='/var/lib/company-maintenance/kernel-change-2026-11-19'
install -d -m 0700 "$state_dir"
exec 9>"$state_dir/lock"
flock -n 9 || { echo 'Maintenance already running' >&2; exit 1; }

fail() { echo "$*" >&2; exit 1; }
boot_now=$(cat /proc/sys/kernel/random/boot_id)
boot_id_pattern='^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
[[ "$boot_now" =~ $boot_id_pattern ]] || fail 'Invalid boot identity'
running_kernel=$(uname -r)
[[ -n "$running_kernel" ]] || fail 'Cannot read running kernel'

if [[ -e "$state_dir/reboot-requested" || -L "$state_dir/reboot-requested" ]]; then
    [[ -f "$state_dir/reboot-requested" && ! -L "$state_dir/reboot-requested" ]] \
        || fail 'Invalid checkpoint file; investigate'
    boot_before=$(cat "$state_dir/reboot-requested")
    [[ "$boot_before" =~ $boot_id_pattern ]] || fail 'Invalid checkpoint; investigate'
    [[ "$boot_now" != "$boot_before" ]] || fail 'Reboot not observed'
elif [[ "$running_kernel" != "$expected_kernel" ]]; then
    [[ -f "/boot/vmlinuz-$expected_kernel" ]] || fail 'Kernel image missing'
    printf '%s\n' "$boot_now" > "$state_dir/request.tmp"
    mv "$state_dir/request.tmp" "$state_dir/reboot-requested"
    sync -f "$state_dir"
    echo "Requesting one reboot from boot $boot_now"
    exit 194
fi

[[ "$running_kernel" == "$expected_kernel" ]] || fail 'Wrong running kernel'
for attempt in {1..12}; do
    if http_status=$(curl -q --noproxy '*' --silent --show-error --max-time 5 \
        --output /dev/null --write-out '%{http_code}' \
        http://127.0.0.1:8080/health) && [[ "$http_status" == 200 ]]; then
        printf 'Verified kernel=%s boot=%s\n' "$expected_kernel" "$boot_now"
        exit 0
    fi
    sleep 5
done
fail 'Application did not become healthy'
```

The checkpoint records an intent to request one reboot, not confirmation of a successful installation or reboot. The boot identity, running kernel, and health response provide separate evidence. A wrong kernel after reboot fails without requesting another reboot. A rerun before the recorded boot changes also fails, even if the kernel is already correct. Once written, the checkpoint remains after success or failed health checks; later reruns verify the system again without another reboot request. Reuse the same identifier for retries, and reconcile state before deliberately creating a new operation. [Linux boot identity](https://www.kernel.org/doc/html/latest/admin-guide/sysctl/kernel.html#random)

If the first run already has the expected kernel, it checks readiness without writing a checkpoint. Its reboot allowance remains unused: a later rerun with kernel drift can request one reboot. This example bounds reboot requests; it does not record completion of an operation that needed no reboot.

The health loop makes at most twelve transfers, each limited to five seconds, with five-second sleeps after failures. It requires both a successful transfer and exactly HTTP `200`; `curl --fail` alone would accept redirects. The leading `-q` ignores curl configuration files, and `--noproxy '*'` bypasses environment-configured proxies. [curl options](https://curl.se/docs/manpage.html)

Writing a temporary file in the same directory and renaming it makes the checkpoint replacement atomic; the subsequent GNU `sync -f` flushes the containing filesystem before signaling the agent. A write, rename, or sync failure prevents `exit 194`. A sync failure can leave a checkpoint even though no reboot was requested, so investigate before retrying. This is a local implementation choice, not an AWS requirement. It cannot make checkpoint persistence and the agent's reboot request one transaction. Disk loss or rollback can invalidate local evidence; restore or reconcile it before retrying. A missing marker alone never proves that earlier changes did not happen. [Rename semantics](https://man7.org/linux/man-pages/man2/rename.2.html), [GNU sync semantics](https://www.gnu.org/s/coreutils/manual/html_node/sync-invocation.html)

Send the deployed script as the only command, explicitly selecting Bash:

```bash
aws ssm send-command \
  --instance-ids 'i-0123456789abcdef0' \
  --document-name 'AWS-RunShellScript' \
  --timeout-seconds 600 \
  --parameters '{"commands":["exec /bin/bash /opt/maintenance/reboot-once.sh"],"executionTimeout":["1800"]}'
```

`exec` replaces the shell wrapper, preserving Bash's exit status. `--timeout-seconds` is the delivery setting; `executionTimeout` supplies the script plugin's execution limit. These values are examples to size for your environment. [SendCommand options](https://docs.aws.amazon.com/cli/latest/reference/ssm/send-command.html), [Script plugin timeouts](https://docs.aws.amazon.com/systems-manager/latest/userguide/documents-command-ssm-plugin-reference.html)

## Handle Windows installer results explicitly

For Windows Installer, `0` means success, `3010` means success requiring a reboot, and `1641` means a reboot was initiated. Requesting reboot and already starting one are different outcomes. Suppress installer-controlled restarts with `/norestart`, and inspect the process result. [MSI return codes](https://learn.microsoft.com/en-us/windows/win32/msi/error-codes), [msiexec options](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/msiexec)

This Windows PowerShell 5.1-compatible fragment belongs inside the first-attempt branch of a persistent state machine equivalent to the Linux example. It is not a complete resumable installer:

```powershell
$ErrorActionPreference = 'Stop'
try {
    $process = Start-Process -FilePath 'msiexec.exe' -Wait -PassThru `
        -ArgumentList '/i "C:\Staging\Example.msi" /qn /norestart /L*v "C:\Staging\install.log"'
    $installerCode = $process.ExitCode
    if ($installerCode -notin @(0, 3010)) {
        throw "Unexpected installer result: $installerCode"
    }
    # Persist installerCode and pre-boot identity before leaving this branch.
    # A 3010 result must consume the operation's single reboot allowance.
} catch {
    Write-Error $_ -ErrorAction Continue
    exit 1
}
```

After durably saving that state, use `exit 3010` only when the saved installer result requires it. For a saved `3010`, a same-boot retry must fail instead of returning `3010` again; after a changed boot, skip installation and verify the desired product version and application health before `exit 0`. A saved `0` goes directly to verification without requiring a changed boot. Before a first installation attempt, inspect the installed product too: an interrupted run may have installed it without saving its checkpoint. Reconcile uncertain state before rerunning the installer. Retain installer logs and failed checkpoints. An unexpected `1641` warrants investigation because the installer has already taken control of restarting.

`Start-Process -Wait -PassThru` returns a completed process object; read its `ExitCode`. For direct native invocation with `&`, capture `$LASTEXITCODE` immediately. `$?` is a Boolean and does not distinguish a reboot-required result. Do not assume `$ErrorActionPreference` converts native installer exit codes into exceptions. [Start-Process](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.management/start-process?view=powershell-5.1), [automatic variables](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_automatic_variables?view=powershell-5.1)

## Bound execution and retain evidence

Do not rely on an assumed maximum number of SSM reboots. The agent's current source defaults `Mds.CommandRetryLimit` to 15, but this bounds resumption of in-progress documents, including agent restarts; it is not a dedicated fifteen-reboot allowance. Check the installed agent version and configuration. The one-reboot budget above belongs to the script. [Agent configuration](https://github.com/aws/amazon-ssm-agent/blob/mainline/amazon-ssm-agent.json.template), [resumption counter](https://github.com/aws/amazon-ssm-agent/blob/mainline/agent/framework/processor/processor.go)

Set delivery and execution timeouts deliberately. AWS documents a maximum execution timeout of 172800 seconds for SSM Agent 2.0.913.0 and later; that ceiling is not a recommendation or a guarantee of successful resumption. `Start-Process -Wait` waits for the process tree and provides no separate time limit. SSM's execution timeout stops command execution; it does not roll back installed changes or prove that work handed to another service has stopped. Reconcile installer and node state after a timeout before retrying. [Timeout guidance](https://repost.aws/knowledge-center/systems-manager-run-command), [Script plugin timeouts](https://docs.aws.amazon.com/systems-manager/latest/userguide/documents-command-ssm-plugin-reference.html)

Configure S3 or CloudWatch output before dispatch, and confirm node permissions and connectivity. Streaming output is buffered, so retain local checkpoints and installer logs too. [Output configuration](https://docs.aws.amazon.com/systems-manager/latest/userguide/sysman-rc-setting-up-cwlogs.html)

Afterward, inspect every targeted node and document step using `list-command-invocations --details`, then `get-command-invocation` with the actual step name. Require final success, exit code zero, and evidence of the desired kernel or product version and application readiness. An aggregate `Success` or an online agent alone does not establish application readiness. If the command times out or the node never returns, preserve evidence and inspect actual machine state before sending another mutating command. [Invocation details](https://docs.aws.amazon.com/systems-manager/latest/APIReference/API_GetCommandInvocation.html), [status interpretation](https://docs.aws.amazon.com/systems-manager/latest/userguide/monitor-commands.html)
