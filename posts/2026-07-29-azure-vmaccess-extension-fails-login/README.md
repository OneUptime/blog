# When the Azure VMAccess Extension Fails

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Azure Virtual Machines, VM Extension, SSH, RDP

Description: Recover access when Azure VMAccess fails by checking the guest agent and extension logs, then using Serial Console or offline OS disk repair.

---

VMAccess can reset a local password or SSH key and repair SSH or RDP configuration, but it is not an out-of-band hypervisor console. The extension runs inside the guest through the Azure VM Agent. If the guest agent is `Not Ready`, the operating system is not booted, or platform communication is blocked, VMAccess cannot repair login.

Use the failure to choose the next recovery path rather than repeatedly submitting password resets.

## First identify Windows or Linux VMAccess

The implementations and capabilities differ:

- Windows uses publisher `Microsoft.Compute` and type `VMAccessAgent`.
- Linux uses publisher `Microsoft.OSTCExtensions` and type `VMAccessForLinux`.

List extensions and their provisioning state:

```bash
az vm extension list \
  --resource-group myResourceGroup \
  --vm-name myVM \
  --query "[].{name:name,publisher:publisher,type:virtualMachineExtensionType,state:provisioningState}" \
  --output table
```

Retrieve the specific instance view and message:

```bash
az vm extension show \
  --resource-group myResourceGroup \
  --vm-name myVM \
  --name VMAccessForLinux \
  --instance-view \
  --output json
```

Use the actual installed extension name. The resource name can differ from its handler type.

## Check whether the guest agent can run any extension

In the VM Overview or Properties page, inspect **Agent status**. If it is not Ready, fix the Azure VM Agent before treating VMAccess as an isolated failure.

The guest agent needs:

- a running, supported operating system;
- the agent service installed and running;
- guest DHCP and correct primary NIC configuration;
- access to Azure WireServer at `168.63.129.16` on TCP 80 and 32526;
- any additional endpoints required by the extension;
- sufficient disk space and healthy package/runtime dependencies.

If every extension is failing or stale, the shared agent path is the stronger hypothesis.

## Read the in-guest logs when another path works

Windows VMAccess logs:

```text
C:\WindowsAzure\Logs\Plugins\Microsoft.Compute.VMAccessAgent\
C:\WindowsAzure\Logs\WaAppAgent\
C:\Packages\Plugins\Microsoft.Compute.VMAccessAgent\
```

Linux VMAccess logs:

```text
/var/log/waagent.log
/var/log/azure/Microsoft.OSTCExtensions.VMAccessForLinux/
/var/lib/waagent/Microsoft.OSTCExtensions.VMAccessForLinux-*/
```

Use Azure Bastion, Serial Console, or an existing management channel to inspect them. Look for the first handler error, not only the final provisioning timeout.

Typical causes include:

- Windows password does not meet local or domain password policy;
- no password or SSH key was supplied;
- the VM is not running;
- the Windows Firewall service is disabled, preventing VMAccess from updating RDP rules;
- agent communication or extension status reporting is broken;
- full OS disk or corrupted agent state;
- handler command timed out.

VMAccess for Windows does not support domain controllers. Use documented domain-controller recovery procedures instead.

## Retry with the supported high-level command

For a Linux SSH key reset:

```bash
az vm user update \
  --resource-group myResourceGroup \
  --name myVM \
  --username azureuser \
  --ssh-key-value ~/.ssh/id_ed25519.pub
```

Microsoft documents that this appends the supplied public key to the admin user's `authorized_keys`; it does not remove existing keys.

To reset Linux SSH configuration:

```bash
az vm user reset-ssh \
  --resource-group myResourceGroup \
  --name myVM
```

Understand the change before using it on a host with intentionally customized SSH configuration.

For Windows, the portal's **Reset password** page can reset credentials or reset RDP configuration. Use a new strong value that satisfies the guest policy. Avoid putting passwords directly in shell history; use protected settings or an approved secret-handling workflow.

Only one version of VMAccess can be applied to a VM. Update the existing extension resource for another action rather than creating competing names.

If VMAccess reset is used after the Microsoft Entra login extension, Microsoft instructs you to rerun the Entra login extension to re-enable that login integration.

## Use a path that does not depend on VMAccess

### Azure Serial Console

Serial Console is designed for network and SSH/RDP failure scenarios. It does not require the VM to have working network connectivity, but the VM and subscription must meet Serial Console prerequisites. Use it to:

- check boot progress;
- start `sshd` or Remote Desktop Services;
- repair a guest firewall;
- fix an invalid route or interface configuration;
- enter Linux single-user mode where supported.

It still requires the operating system to reach a usable console and appropriate credentials or recovery access.

### Azure Bastion

Bastion bypasses the VM's public internet path, but it still needs the guest listener, private network reachability, NSG rules, and valid credentials. It helps when the problem is public exposure, not when `sshd` or RDP is broken.

### Run Command

Run Command can execute guest commands without SSH or RDP, but its implementation depends on the VM agent. If the agent is Not Ready, do not assume Run Command is an independent escape hatch.

### Offline OS-disk repair

When the guest will not boot or the agent and login path are both unavailable, make a backup snapshot and use Azure VM repair commands or attach a copy of the OS disk to a recovery VM.

For Windows, repair registry, firewall, RDP, filesystem, or update state on the copied disk. For Linux, mount the filesystems and use a chroot where appropriate to repair accounts, SSH configuration, `fstab`, bootloader, or packages.

Operate on a copy when possible. Preserve encryption requirements, disk generation, LUN mapping, and the repair command's tags so restore can complete.

## Choose the next step from the evidence

| Evidence | Likely next step |
|---|---|
| Only VMAccess failed; agent Ready | Read handler message and logs, correct settings, update existing extension |
| All extensions fail; agent Not Ready | Repair agent, DHCP, WireServer, firewall, proxy, disk space |
| Guest boots; public RDP/SSH fails | Use Serial Console or Bastion and repair listener/network |
| Guest does not boot | Review Boot diagnostics, then offline repair |
| Windows domain controller | Use DC-specific recovery, not VMAccess |
| Entra login stopped after password reset | Rerun the Entra login extension |

Do not delete and recreate the production VM before preserving its disks and configuration. VMAccess is one recovery tool, not the boundary of Azure VM recoverability.

## Official Documentation

- [VMAccess Extension for Windows](https://learn.microsoft.com/en-us/azure/virtual-machines/extensions/vmaccess-windows)
- [VMAccess Extension for Linux](https://learn.microsoft.com/en-us/azure/virtual-machines/extensions/vmaccess-linux)
- [Reset Remote Desktop Services or an admin password](https://learn.microsoft.com/en-us/troubleshoot/azure/virtual-machines/windows/reset-rdp)
- [Troubleshoot Azure Windows VM extension failures](https://learn.microsoft.com/en-us/azure/virtual-machines/extensions/troubleshoot)
- [Troubleshoot SSH connections to an Azure Linux VM](https://learn.microsoft.com/en-us/troubleshoot/azure/virtual-machines/linux/troubleshoot-ssh-connection)
