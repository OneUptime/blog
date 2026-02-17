# How to Reset the Password or SSH Key on an Azure Virtual Machine

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Virtual Machine, Password Reset, SSH Key, Azure CLI, Troubleshooting, Security

Description: How to reset the password or SSH key on an Azure VM when you are locked out, using the Azure CLI, portal, and VM Access Extension.

---

Getting locked out of an Azure VM is one of those panic-inducing moments that every cloud admin experiences eventually. Maybe you lost your SSH private key, forgot a password, or someone changed the credentials and did not tell you. Whatever the reason, Azure provides several ways to reset passwords and SSH keys without needing to delete and recreate the VM.

In this guide, I will cover all the methods for recovering access to both Linux and Windows VMs.

## How Credential Reset Works on Azure

Azure uses the VM Access Extension (VMAccessForLinux for Linux, VMAccessAgent for Windows) to modify credentials inside the VM from outside. When you trigger a password or SSH key reset, Azure installs or invokes the extension on the VM, which then makes the changes inside the guest OS.

This means:
- The VM must be running (or at least startable) for the extension to work.
- The Azure Guest Agent must be installed and functioning inside the VM.
- The change happens inside the OS, not at the Azure platform level.

## Resetting an SSH Key on a Linux VM

This is the most common scenario. You lost your private key or need to update it.

Using the Azure CLI:

```bash
# Reset the SSH public key for an existing user
az vm user update \
  --resource-group myResourceGroup \
  --name myLinuxVM \
  --username azureuser \
  --ssh-key-value ~/.ssh/id_rsa.pub
```

This replaces the authorized SSH key for the specified user. The command reads the public key file and pushes it to the VM through the VM Access Extension.

You can also specify the key directly as a string:

```bash
# Reset SSH key using the key string directly
az vm user update \
  --resource-group myResourceGroup \
  --name myLinuxVM \
  --username azureuser \
  --ssh-key-value "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABgQ... user@hostname"
```

## Resetting a Password on a Linux VM

If you need password-based access instead of or in addition to SSH keys:

```bash
# Reset the password for a Linux VM user
az vm user update \
  --resource-group myResourceGroup \
  --name myLinuxVM \
  --username azureuser \
  --password 'YourNewSecurePassword123!'
```

Note: Many Azure Linux images disable password authentication by default in the SSH configuration. After resetting the password, you may also need to enable password authentication:

```bash
# Reset SSH configuration to defaults (enables password auth if it was disabled)
az vm user reset-ssh \
  --resource-group myResourceGroup \
  --name myLinuxVM
```

The `reset-ssh` command resets the SSH daemon configuration to its defaults. This can fix issues where SSH was misconfigured, including cases where password authentication was disabled.

## Creating a New User on a Linux VM

If the original user account is corrupted or you want to add a new admin account:

```bash
# Create a new user with an SSH key
az vm user update \
  --resource-group myResourceGroup \
  --name myLinuxVM \
  --username newadmin \
  --ssh-key-value ~/.ssh/id_rsa.pub
```

The new user is created with sudo privileges. You can then SSH in as the new user and fix whatever was wrong with the original account.

## Resetting a Password on a Windows VM

For Windows VMs, the process uses the password reset directly:

```bash
# Reset the password for a Windows VM administrator
az vm user update \
  --resource-group myResourceGroup \
  --name myWindowsVM \
  --username adminuser \
  --password 'NewPassword123!@#'
```

Windows password requirements:
- At least 12 characters
- Contains uppercase, lowercase, digits, and special characters
- Cannot contain the username or parts of the full name

After resetting, connect via RDP with the new credentials.

## Using the Azure Portal

If you prefer the portal:

1. Navigate to your virtual machine in the Azure portal.
2. In the left menu, under "Help," click "Reset password."
3. Choose the mode:
   - **Reset password**: Changes the password for an existing user.
   - **Reset SSH public key** (Linux only): Replaces the SSH key.
   - **Reset configuration only** (Linux only): Resets SSH configuration.
4. Enter the username and new credentials.
5. Click "Update."

The portal is intuitive for one-off resets. For automation or scripting, use the CLI.

## Using the VM Access Extension Directly

For more control, you can invoke the VM Access Extension directly:

```bash
# Reset SSH key using the VM Access Extension for Linux
az vm extension set \
  --resource-group myResourceGroup \
  --vm-name myLinuxVM \
  --name VMAccessForLinux \
  --publisher Microsoft.OSTCExtensions \
  --version 1.5 \
  --settings '{}' \
  --protected-settings '{"username":"azureuser","ssh_key":"ssh-rsa AAAAB3..."}'
```

For Windows:

```bash
# Reset password using the VM Access Extension for Windows
az vm extension set \
  --resource-group myResourceGroup \
  --vm-name myWindowsVM \
  --name VMAccessAgent \
  --publisher Microsoft.Compute \
  --version 2.4 \
  --settings '{"UserName":"adminuser"}' \
  --protected-settings '{"Password":"NewPassword123!@#"}'
```

## When the VM Access Extension Does Not Work

Sometimes the extension fails. Here are the fallback options:

**Check the extension status:**

```bash
# Check the status of VM extensions
az vm extension list \
  --resource-group myResourceGroup \
  --vm-name myLinuxVM \
  --output table
```

If the extension shows a failed state, try removing and re-adding it:

```bash
# Remove the failed extension
az vm extension delete \
  --resource-group myResourceGroup \
  --vm-name myLinuxVM \
  --name VMAccessForLinux

# Re-run the password reset command
az vm user update \
  --resource-group myResourceGroup \
  --name myLinuxVM \
  --username azureuser \
  --ssh-key-value ~/.ssh/id_rsa.pub
```

**Use the Serial Console:**

If the VM Access Extension is not working, the serial console provides direct console access:

1. In the Azure portal, go to your VM.
2. Under "Help," click "Serial console."
3. Log in using any existing credentials that still work.
4. Reset the password manually:

```bash
# From the serial console, reset a user's password
sudo passwd azureuser
```

The serial console requires boot diagnostics to be enabled and a password-based account to exist (even if SSH key authentication is the primary method).

**Use a Recovery VM:**

If nothing else works, you can attach the OS disk to a recovery VM:

```bash
# Step 1: Delete the locked VM (keeps the OS disk)
az vm delete --resource-group myResourceGroup --name myLinuxVM --yes

# Step 2: Create a recovery VM
az vm create \
  --resource-group myResourceGroup \
  --name recoveryVM \
  --image Ubuntu2204 \
  --admin-username recoveryadmin \
  --generate-ssh-keys

# Step 3: Attach the original OS disk as a data disk
az vm disk attach \
  --resource-group myResourceGroup \
  --vm-name recoveryVM \
  --name myLinuxVM_OsDisk \
  --new false
```

Then SSH into the recovery VM, mount the attached disk, and manually edit the files:

```bash
# Mount the attached OS disk
sudo mkdir /recovery
sudo mount /dev/sdc1 /recovery

# Edit the authorized_keys file to add your new SSH key
sudo mkdir -p /recovery/home/azureuser/.ssh
sudo cp ~/.ssh/id_rsa.pub /recovery/home/azureuser/.ssh/authorized_keys
sudo chown -R 1000:1000 /recovery/home/azureuser/.ssh

# Or reset the password by editing the shadow file
# (More advanced - use chroot for proper passwd command)
sudo chroot /recovery
passwd azureuser
exit

# Unmount
sudo umount /recovery
```

After fixing the credentials, detach the disk and recreate the VM with the original OS disk:

```bash
# Detach the disk from the recovery VM
az vm disk detach --resource-group myResourceGroup --vm-name recoveryVM --name myLinuxVM_OsDisk

# Recreate the original VM with the fixed disk
az vm create \
  --resource-group myResourceGroup \
  --name myLinuxVM \
  --attach-os-disk myLinuxVM_OsDisk \
  --os-type Linux \
  --size Standard_D2s_v5
```

## Preventing Lockouts

A few preventive measures go a long way:

1. **Always keep a backup of your SSH private key.** Store it in a secure location like Azure Key Vault or a password manager.
2. **Set up multiple admin accounts.** Having a second admin account means one lockout does not leave you stranded.
3. **Enable boot diagnostics and serial console.** These give you a fallback path that does not depend on SSH or RDP.
4. **Use Azure Bastion.** It provides browser-based SSH/RDP access and does not depend on your local SSH key configuration.
5. **Document your credentials.** Use a team password manager for shared credentials.

## Wrapping Up

Getting locked out of an Azure VM is stressful but solvable. The VM Access Extension handles most cases with a single CLI command. For tougher situations, the serial console and the recovery VM approach provide additional fallback options. The best strategy is prevention - keep backups of your keys, maintain multiple admin accounts, and always have boot diagnostics enabled. That way, when a lockout happens, you have multiple paths back in.
