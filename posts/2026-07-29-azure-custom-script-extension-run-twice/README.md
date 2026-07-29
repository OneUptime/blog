# Why Won't Azure Custom Script Extension Run the Same Script Twice?

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Azure Virtual Machines, VM Extension, Automation, PowerShell

Description: Rerun Azure Custom Script Extension safely by changing its configuration or force-update tag, while making scripts idempotent and observable.

---

Azure Custom Script Extension is designed to process a configuration once. On Windows, the handler explicitly prevents a rerun when it receives the exact same settings and sequence. On Linux, the extension documentation also describes it as a one-time script mechanism and provides a `timestamp` setting to trigger a new run.

This behavior prevents a non-idempotent installer or migration from running accidentally. To rerun intentionally, update the existing extension's configuration or force-update tag. First make the script safe to repeat.

## Confirm that Azure skipped it

Check the extension resource and instance view:

```bash
az vm extension show \
  --resource-group myResourceGroup \
  --vm-name myVM \
  --name customScript \
  --instance-view \
  --output json
```

On Windows, inspect:

```text
C:\WindowsAzure\Logs\Plugins\Microsoft.Compute.CustomScriptExtension\<version>\
```

The handler log can contain a message stating that the current sequence number is not greater than the most recently executed configuration.

On Linux, inspect:

```text
/var/log/waagent.log
/var/log/azure/custom-script/
/var/lib/waagent/custom-script/download/
```

Directory names can include the full publisher and type. The downloaded script directory also contains captured stdout and stderr.

Distinguish a skipped configuration from:

- a script that ran successfully but made no visible change;
- an early script exit due to its own marker file;
- an extension failure before execution;
- a command still running toward its timeout;
- checking the wrong extension instance name.

## Update the existing extension, not a competing one

A VM can have only one applied instance of a particular extension handler configuration. Keep a stable extension resource name. Creating a second name for the same handler can produce a conflict instead of a rerun.

For Linux Custom Script version 2, use:

- publisher `Microsoft.Azure.Extensions`;
- type/name `CustomScript`;
- an existing extension instance name such as `customScript`.

For Windows, use:

- publisher `Microsoft.Compute`;
- type/name `CustomScriptExtension`.

The extension instance resource name and handler type are separate concepts in Azure CLI. Inspect the current resource before constructing the update.

## Change `timestamp` on Linux

The Linux Custom Script schema includes an optional integer `timestamp`. A different value signals an intentional rerun:

```json
{
  "fileUris": [
    "https://example.blob.core.windows.net/scripts/configure.sh"
  ],
  "commandToExecute": "/bin/bash configure.sh",
  "timestamp": 2026072901
}
```

Apply the settings to the existing instance:

```bash
az vm extension set \
  --resource-group myResourceGroup \
  --vm-name myVM \
  --extension-instance-name customScript \
  --name CustomScript \
  --publisher Microsoft.Azure.Extensions \
  --protected-settings @custom-script-settings.json
```

Any integer is acceptable as long as it differs from the previous value. Store it in infrastructure as code so the value changes only when an operator intends another execution.

Put `fileUris`, `commandToExecute`, and inline script content in either public or protected settings, not both. Use protected settings when a command or URI contains secrets. A protected setting reduces control-plane exposure, but the script must still avoid echoing secrets into its logs.

## Force a rerun on Windows

Microsoft documents two ways to make the Windows handler run again:

1. update the configuration, such as adding a dynamic timestamp property;
2. change the extension's force-update tag.

Azure CLI exposes the latter as `--force-update`:

```bash
az vm extension set \
  --resource-group myResourceGroup \
  --vm-name myVM \
  --extension-instance-name customScript \
  --name CustomScriptExtension \
  --publisher Microsoft.Compute \
  --settings @public-settings.json \
  --protected-settings @protected-settings.json \
  --force-update
```

Use the publisher, handler type, instance name, and settings already appropriate for the VM. Do not copy the Linux values into a Windows deployment.

Azure PowerShell's `Set-AzVMCustomScriptExtension` also supports `-ForceRerun` with a value different from the current force-update tag.

## Make the script idempotent before rerunning

A force mechanism says the handler should execute; it does not make the underlying code safe.

An idempotent script:

- checks current state before changing it;
- uses create-or-update operations;
- pins or validates package versions;
- treats an already-present account, directory, or rule as success;
- makes database migrations transactional and versioned;
- writes a completion marker only after validation succeeds;
- can resume after partial failure;
- returns nonzero when the desired state was not achieved.

For example:

```bash
#!/usr/bin/env bash
set -euo pipefail

install -d -m 0755 /opt/myapp

if ! systemctl list-unit-files myapp.service >/dev/null 2>&1; then
  install -m 0644 ./myapp.service /etc/systemd/system/myapp.service
  systemctl daemon-reload
fi

systemctl enable --now myapp.service
systemctl is-active --quiet myapp.service
```

The exact unit-file check may need adjustment for the distribution, but the pattern is important: observe, converge, then verify.

## Respect extension runtime limits

Microsoft gives Custom Script a 90-minute execution window. Avoid:

- interactive prompts;
- an unbounded package-manager wait;
- long-running application processes in the foreground;
- a reboot inside the script;
- stopping or updating the Azure Linux Agent;
- background processes whose success the handler cannot observe.

If the configuration requires a reboot, schedule it through a separate, managed mechanism after the extension has completed. The extension does not resume automatically across the reboot.

Use explicit network timeouts and retries for external downloads. A script URI must be reachable from the VM. Managed identity can be used for supported Linux Custom Script downloads from Azure Storage, and should be supplied through protected settings.

## Use another mechanism for recurring work

Custom Script is not a scheduler. If code must run:

- **at every Linux boot**, install a `systemd` unit or use a supported cloud-init per-boot module;
- **on a schedule**, install a timer, cron job, scheduled task, or use an orchestration service;
- **continuously**, install a service with health supervision;
- **to enforce configuration**, use a configuration-management or policy mechanism;
- **as a one-off operator action**, consider Run Command with proper auditing.

The extension can bootstrap that durable mechanism once.

## Validate the rerun

Do not stop at `Provisioning succeeded`. Verify:

1. the instance view has a new execution result;
2. logs show the expected timestamp or force update;
3. the script exit code is zero;
4. the intended service, file, package, or configuration exists;
5. the workload's own health check passes.

Keep an application-level execution ID in the script log. It makes Azure handler retries distinguishable from internal script retries.

## Official Documentation

- [Custom Script Extension for Linux](https://learn.microsoft.com/en-us/azure/virtual-machines/extensions/custom-script-linux)
- [Custom Script Extension for Windows](https://learn.microsoft.com/en-us/azure/virtual-machines/extensions/custom-script-windows)
- [Azure CLI VM extension reference](https://learn.microsoft.com/en-us/cli/azure/vm/extension)
- [Set-AzVMCustomScriptExtension reference](https://learn.microsoft.com/en-us/powershell/module/az.compute/set-azvmcustomscriptextension)
