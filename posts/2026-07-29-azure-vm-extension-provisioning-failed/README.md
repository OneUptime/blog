# Why Is an Azure VM Extension Stuck in Provisioning Failed?

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Azure Virtual Machines, VM Extension, Guest Agent, Troubleshooting

Description: Diagnose Azure VM extension provisioning failures using instance status and guest logs, then choose between configuration repair, reapply, rerun, or removal.

---

`Provisioning failed` is the status reported by an extension handler after Azure asked the guest agent to install, enable, or update it. The useful error is usually one level deeper: agent connectivity, handler logs, invalid settings, a missing dependency, a nonzero script exit, a package-manager lock, or a timeout.

Do not start by clicking rerun repeatedly. Capture the failing version, settings change, status message, and logs so the retry does not erase the best evidence.

## Determine whether the agent or one handler failed

List every extension:

```bash
az vm extension list \
  --resource-group myResourceGroup \
  --vm-name myVM \
  --query "[].{name:name,publisher:publisher,type:virtualMachineExtensionType,version:typeHandlerVersion,state:provisioningState}" \
  --output table
```

Get the failed extension's instance view:

```bash
az vm extension show \
  --resource-group myResourceGroup \
  --vm-name myVM \
  --name myExtension \
  --instance-view \
  --output json
```

If all extension statuses are stale or failing and the portal reports VM Agent `Not Ready`, repair the shared agent path first. If the agent is Ready and one extension fails, focus on that publisher's handler and settings.

The Azure Activity log records the control-plane operation, but detailed command output normally lives inside the guest.

## Find the handler logs and state

Windows:

```text
C:\WindowsAzure\Logs\WaAppAgent.log
C:\WindowsAzure\Logs\Plugins\<Publisher>.<Type>\
C:\Packages\Plugins\<Publisher>.<Type>\<Version>\
```

Linux:

```text
/var/log/waagent.log
/var/log/azure/<Publisher>.<Type>/
/var/lib/waagent/<Publisher>.<Type>-<Version>/
```

The agent log shows goal-state delivery and handler lifecycle. The extension directory normally contains publisher-specific logs, downloaded files, configuration, and status documents.

Protected settings are encrypted in transit to the VM, but secrets can still be exposed by careless scripts or verbose logs. Do not paste full protected settings into incident tickets or commit them to a repository.

## Interpret common failure patterns

### Handler command returns nonzero

The platform successfully started the handler, but its install or enable action failed. Read stdout, stderr, and the publisher's error code. Reproduce the underlying command only in a safe test environment and under comparable privileges.

Extensions commonly run as `LocalSystem` on Windows or `root` on Linux. A command that succeeds in an interactive user shell can fail because of a different working directory, `PATH`, proxy environment, profile, architecture, or permission context.

### Provisioning timeout

Generic extensions have a bounded execution window; Microsoft documents 20 minutes for many Linux extensions, with longer exceptions such as Custom Script and Chef at 90 minutes. Long package downloads, locked package databases, interactive prompts, reboots, and scripts waiting on unavailable endpoints can exhaust that window.

Make scripts noninteractive, bounded, logged, and idempotent. Do not stop or update the Azure agent from inside an extension handler.

### Download or TLS failure

The guest agent needs its Azure platform communication, while the extension may need additional internet, Azure Storage, Microsoft Entra ID, or publisher endpoints. A successful agent heartbeat does not prove the handler can reach a script URI.

Check DNS, system time, root certificates, proxy bypass, firewall, and any TLS inspection. Microsoft documents cases where SSL inspection changes the certificate chain seen by the Windows agent.

### Guest dependency failure

Check:

- free space and inodes;
- package-manager locks;
- pending reboot;
- antivirus or endpoint-protection quarantine;
- supported OS and architecture;
- handler runtime such as PowerShell, Python, or .NET;
- filesystem mounted with restrictive options;
- another extension holding an exclusive installer lock.

## Reapply is not the same as rerun

**VM reapply** asks Azure to reapply the VM resource model and triggers a new goal state:

```bash
az vm reapply \
  --resource-group myResourceGroup \
  --name myVM
```

It is useful when the VM is in a failed state or the agent missed model state. Reapply usually does not reboot the VM, but Microsoft warns that it can trigger a pending update that requires a restart. Use an approved maintenance window.

Reapply does not repair an invalid script or magically change an extension's sequence/configuration.

**Extension rerun** means asking a particular handler to process a new configuration or force-update tag. The method is extension-specific. Azure CLI exposes `--force-update` on `az vm extension set`, but use it only after consulting the extension's documentation and making the handler action safe to repeat.

For example:

```bash
az vm extension set \
  --resource-group myResourceGroup \
  --vm-name myVM \
  --name myExtensionType \
  --extension-instance-name myExtension \
  --publisher myPublisher \
  --settings @settings.json \
  --force-update
```

Confirm the correct publisher, type, instance name, version policy, and protected settings before running this against production.

## When removal and reinstallation are appropriate

Microsoft's general Windows extension troubleshooting guidance describes removing and redeploying Custom Script after a failed script. That is not a universal rule for every extension.

Before deleting an extension:

1. read its publisher documentation;
2. understand uninstall side effects;
3. preserve logs and configuration;
4. determine whether the extension protects encryption, backup, access, security, or monitoring;
5. make the desired state reproducible in infrastructure as code.

Some extensions must be installed in a particular order, permit only one instance, or require cleanup inside the guest. Blind deletion can make recovery harder.

## A reliable recovery flow

1. Record the Activity log correlation ID and extension instance view.
2. Confirm VM Agent is Ready.
3. Collect agent, handler, system, and package-manager logs.
4. Classify the first failure as communication, configuration, dependency, handler, or timeout.
5. Correct the underlying cause.
6. Make the operation idempotent.
7. Update the existing extension with corrected settings or the documented force mechanism.
8. Use VM reapply for missed model state, not as a substitute for fixing handler input.
9. Remove and reinstall only when the publisher's recovery guidance supports it.
10. Verify both `Provisioning succeeded` and the extension's actual workload outcome.

An Azure success status only means the handler reported success. Check that monitoring data arrives, backup registers, security policy applies, or the script's intended artifact exists.

## Official Documentation

- [Troubleshoot Azure Windows VM extension failures](https://learn.microsoft.com/en-us/azure/virtual-machines/extensions/troubleshoot)
- [Azure VM extensions and features for Linux](https://learn.microsoft.com/en-us/azure/virtual-machines/extensions/features-linux)
- [Azure VM extensions and features for Windows](https://learn.microsoft.com/en-us/azure/virtual-machines/extensions/features-windows)
- [Troubleshoot Azure Windows VM Agent issues](https://learn.microsoft.com/en-us/troubleshoot/azure/virtual-machines/windows/windows-azure-guest-agent)
- [Azure CLI VM extension reference](https://learn.microsoft.com/en-us/cli/azure/vm/extension)
