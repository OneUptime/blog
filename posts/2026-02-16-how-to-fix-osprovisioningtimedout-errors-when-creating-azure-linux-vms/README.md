# How to Fix OSProvisioningTimedOut Errors When Creating Azure Linux VMs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Linux, Virtual Machines, OSProvisioning, Cloud-Init, Troubleshooting, VM Deployment

Description: Diagnose and fix OSProvisioningTimedOut errors when deploying Azure Linux VMs caused by cloud-init failures, network issues, and image configuration problems.

---

You create a new Azure Linux VM, wait for it to provision, and after 20-40 minutes, you get the dreaded error:

```
OSProvisioningTimedOut: OS Provisioning for VM 'myVM' did not finish in the
allotted time. The VM may still finish provisioning successfully. Please check
provisioning state later.
```

This error means the Azure platform created the VM and started it, but the guest agent inside the VM did not report back that provisioning completed within the expected timeframe. The VM might actually be running fine, or it might be stuck in a broken state. Either way, you need to figure out what went wrong.

I have seen this error hundreds of times across different Linux distributions, custom images, and deployment scenarios. Let me walk you through the common causes and fixes.

## How Linux VM Provisioning Works

When Azure creates a Linux VM, here is the sequence of events:

1. Azure creates the VM infrastructure (disk, NIC, compute)
2. The VM boots from the OS image
3. The Azure Linux Agent (waagent) or cloud-init runs during first boot
4. The provisioning agent configures the hostname, SSH keys, user account, and other settings
5. The provisioning agent reports to the Azure platform that provisioning is complete
6. Azure marks the VM as "Succeeded"

If step 5 does not happen within the timeout period (approximately 20 minutes for the agent to start reporting, 40 minutes total), Azure reports OSProvisioningTimedOut.

## Cause 1: Cloud-Init Taking Too Long

Modern Azure Linux images use cloud-init for provisioning. If cloud-init is performing complex operations (package installations, large file downloads, custom scripts), it can exceed the provisioning timeout.

Check the cloud-init logs to see what is happening.

```bash
# If you can SSH into the VM despite the error, check cloud-init status
cloud-init status --long

# View the detailed cloud-init log
sudo cat /var/log/cloud-init.log | tail -200

# Check for specific stages that took too long
sudo cat /var/log/cloud-init-output.log
```

Common cloud-init slowdowns:
- Package repository updates timing out (slow DNS or unreachable repos)
- Large package installations
- Custom scripts that download files from slow sources
- Waiting for network configuration that is not completing

Fix: Move heavy operations out of cloud-init and into a separate script that runs after provisioning. Use the Azure Custom Script Extension instead of cloud-init for operations that may take a long time.

```yaml
# Minimal cloud-init that provisions quickly
# Heavy operations happen later via Custom Script Extension
#cloud-config
package_update: false
package_upgrade: false

# Only set up the basics during provisioning
ssh_authorized_keys:
  - ssh-rsa AAAA...

# Run a lightweight script that signals completion quickly
runcmd:
  - echo "Provisioning complete"
```

## Cause 2: Network Connectivity Issues

The provisioning agent needs outbound connectivity to communicate with the Azure platform. Specifically, it needs to reach the Azure wireserver at 168.63.129.16 on port 80 and the Azure Instance Metadata Service (IMDS) at 169.254.169.254.

If NSG rules, route tables, or firewall configurations block this traffic, provisioning fails.

```bash
# Check NSG rules on the VM's network interface or subnet
# Make sure outbound to 168.63.129.16 is allowed
az network nsg rule list \
  --resource-group myResourceGroup \
  --nsg-name myNSG \
  -o table

# Verify UDR does not redirect wireserver traffic
az network route-table route list \
  --resource-group myResourceGroup \
  --route-table-name myRouteTable \
  -o table
```

If you are using Azure Firewall or an NVA, make sure there is a route or exception for 168.63.129.16 that goes directly to the VM's default gateway, not through the firewall.

## Cause 3: Waagent or Cloud-Init Not Installed

If you are using a custom image that was not properly prepared for Azure, the provisioning agent might be missing or misconfigured.

For images using the Azure Linux Agent (waagent):

```bash
# Check if waagent is installed and running
systemctl status walinuxagent
# or
systemctl status waagent

# Check waagent configuration
sudo cat /etc/waagent.conf | grep -E "Provisioning\.(Enabled|Agent|UseCloudInit)"
```

For cloud-init based images:

```bash
# Check if cloud-init is installed
cloud-init --version

# Check the datasource configuration - should be set to Azure
sudo cat /etc/cloud/cloud.cfg.d/90_dpkg.cfg
# or
sudo cat /etc/cloud/cloud.cfg | grep -A 5 datasource
```

If the provisioning agent is missing, install it and recapture the image.

```bash
# Install the Azure Linux Agent on Ubuntu/Debian
sudo apt-get update && sudo apt-get install -y walinuxagent

# Install on RHEL/CentOS
sudo yum install -y WALinuxAgent

# Make sure it is enabled at boot
sudo systemctl enable walinuxagent
```

## Cause 4: Disk Performance Issues

On VMs with Standard HDD disks or VMs that are severely IO-constrained, the boot process can be so slow that provisioning times out. The OS needs to mount filesystems, start services, and run the provisioning agent, and all of this depends on disk IO.

If you are using Standard HDD, try switching to Standard SSD or Premium SSD. The performance difference during boot is significant.

```bash
# Check current disk type
az disk show \
  --resource-group myResourceGroup \
  --name myVM_OsDisk \
  --query "sku.name" -o tsv

# If Standard_LRS, consider upgrading to StandardSSD_LRS or Premium_LRS
# You need to deallocate the VM first
az vm deallocate --resource-group myResourceGroup --name myVM
az disk update \
  --resource-group myResourceGroup \
  --name myVM_OsDisk \
  --sku StandardSSD_LRS
az vm start --resource-group myResourceGroup --name myVM
```

## Cause 5: Custom Script Extensions Conflicting

If you deploy a VM with both cloud-init custom data and a Custom Script Extension simultaneously, they can conflict. The Custom Script Extension might run before cloud-init finishes, or cloud-init might wait for a resource that the Custom Script Extension has not created yet.

Best practice: let cloud-init handle provisioning, and add the Custom Script Extension as a separate deployment step after the VM is successfully provisioned.

## Cause 6: DHCP Client Issues

The VM needs to get its IP address via DHCP before the provisioning agent can communicate with Azure. If the DHCP client is not configured correctly or is not starting during boot, networking never comes up.

Check the serial log output through boot diagnostics.

```bash
# Get the serial log to see network startup messages
az vm boot-diagnostics get-boot-log \
  --resource-group myResourceGroup \
  --name myVM 2>&1 | grep -i "dhcp\|network\|eth0\|ens"
```

Look for messages indicating DHCP failure or network interface not being detected.

## Recovering a Timed-Out VM

The OSProvisioningTimedOut error does not necessarily mean the VM is broken. The VM might still finish provisioning after the timeout. Check its status.

```bash
# Check if the VM agent is now reporting healthy
az vm get-instance-view \
  --resource-group myResourceGroup \
  --name myVM \
  --query "instanceView.vmAgent.statuses[0]" -o json

# Check provisioning state
az vm show \
  --resource-group myResourceGroup \
  --name myVM \
  --query "provisioningState" -o tsv
```

If the agent eventually reports healthy, the VM is fine despite the initial timeout. If the agent never reports, you need to investigate further using boot diagnostics and serial console.

## Prevention Strategies

To avoid OSProvisioningTimedOut in the future:

1. **Use marketplace images** when possible. They are tested for Azure provisioning.
2. **Keep cloud-init lightweight.** Do not install packages or download large files during provisioning.
3. **Test custom images thoroughly.** Deploy to a test environment and verify provisioning completes within 10 minutes.
4. **Use SSD disks** for OS disks to ensure fast boot times.
5. **Verify network security rules** allow outbound connectivity to 168.63.129.16 before deploying VMs.
6. **Run `waagent -deprovision`** before capturing custom images to ensure a clean provisioning state.

```bash
# Properly deprovision a VM before capturing as an image
sudo waagent -deprovision+user -force
# Then capture the image from Azure
```

The OSProvisioningTimedOut error is frustrating because it gives you very little information about what went wrong. Boot diagnostics and serial console are your best tools for diagnosing the root cause. Start there, check the provisioning agent logs, and work through the common causes systematically.
