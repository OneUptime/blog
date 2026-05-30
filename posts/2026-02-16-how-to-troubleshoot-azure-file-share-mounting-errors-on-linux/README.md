# How to Troubleshoot Azure File Share Mounting Errors on Linux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Azure Files, Linux, SMB, Mount Errors, Troubleshooting, CIFS

Description: A practical troubleshooting guide for the most common Azure file share mounting errors on Linux including permission issues, connectivity failures, and protocol mismatches.

---

Mounting Azure file shares on Linux should be straightforward, but in practice, it trips people up constantly. Between SMB protocol versions, firewall rules, credential formatting, and kernel module quirks, there are plenty of places where things can go wrong. This guide covers the most common mounting errors, what causes them, and how to fix them.

## The Basic Mount Command

For reference, here is what a correct mount command looks like:

```bash
# Standard mount command for Azure file share on Linux

sudo mount -t cifs \
  //stmyfiles.file.core.windows.net/myshare \
  /mnt/azure-files \
  -o username=stmyfiles,password='<storage-account-key>',dir_mode=0755,file_mode=0644,serverino,nosharesock,actimeo=30,vers=3.1.1
```

Now let us go through what goes wrong and how to fix each issue.

## Error: mount error(13) - Permission denied

This is the most common error. It looks like this:

```text
mount error(13): Permission denied
Refer to the mount.cifs(8) manual page (e.g. man mount.cifs)
```

**Cause 1: Wrong credentials**

The username must be the storage account name (not a full UPN or domain account), and the password must be one of the two storage account keys.

```bash
# Verify you have the right key
az storage account keys list \
  --account-name stmyfiles \
  --resource-group rg-files \
  --query "[].{keyName:keyName, value:value}" \
  --output table

# Test with the correct credentials
sudo mount -t cifs \
  //stmyfiles.file.core.windows.net/myshare \
  /mnt/azure-files \
  -o username=stmyfiles,password="<key-from-above>",dir_mode=0755,file_mode=0644,serverino
```

Special characters in the storage key can cause parsing issues. Wrap the password in single quotes if it contains characters like `+`, `/`, or `=`:

```bash
# Use single quotes around the password to handle special characters
sudo mount -t cifs \
  //stmyfiles.file.core.windows.net/myshare \
  /mnt/azure-files \
  -o username=stmyfiles,password='AbCdEfG+hIjKlM/nOpQrStUvWxYz1234567890=='
```

**Cause 2: SMB encryption is required but the client is using SMB 2.x or unencrypted SMB**

If your storage account requires encryption in transit for SMB, you must use SMB 3.0 or higher with encryption. For new storage accounts created in the Azure portal, "Require Encryption in Transit for SMB" is enabled by default. For existing accounts, or accounts created through CLI, PowerShell, or FileREST, check both the per-protocol SMB setting and the storage account "Secure transfer required" setting. SMB 2.1 does not support SMB encryption and will be rejected when SMB encryption is required.

```bash
# Force SMB 3.1.1 protocol version
sudo mount -t cifs \
  //stmyfiles.file.core.windows.net/myshare \
  /mnt/azure-files \
  -o username=stmyfiles,password='<key>',vers=3.1.1,seal,dir_mode=0755,file_mode=0644,serverino
```

**Cause 3: Storage account firewall blocking the connection**

If the storage account has network rules configured, your Linux machine's IP might not be allowed:

```bash
# Check the storage account network rules
az storage account show \
  --name stmyfiles \
  --resource-group rg-files \
  --query "networkRuleSet" \
  --output json

# Add your IP to the allowed list
MY_IP=$(curl -s ifconfig.me)
az storage account network-rule add \
  --account-name stmyfiles \
  --resource-group rg-files \
  --ip-address "$MY_IP"
```

## Error: mount error(115) - Operation now in progress

```text
mount error(115): Operation now in progress
```

**Cause: Port 445 is blocked or the Linux client does not support SMB 3.x encryption**

Azure file shares use SMB over TCP port 445. Many ISPs and corporate firewalls block this port. Microsoft also documents `mount error(115)` for Linux clients that try to mount Azure Files over SMB 3.x without the required SMB encryption support. Test connectivity first:

```bash
# Test if port 445 is reachable
nc -zvw3 stmyfiles.file.core.windows.net 445

# Alternative test using nmap
nmap -Pn -p 445 stmyfiles.file.core.windows.net

# Another method using bash built-in
timeout 5 bash -c 'echo > /dev/tcp/stmyfiles.file.core.windows.net/445' && echo "Port 445 open" || echo "Port 445 blocked"
```

If port 445 is blocked, your options are:

1. **Use a VPN or ExpressRoute** to connect to Azure's private network
2. **Use a Private Endpoint** to access the storage account over a private IP from a connected virtual network
3. **Use Azure File Sync** with a local server that syncs to the cloud
4. **Switch to NFS** if your workload can use Azure Files NFS; NFS uses port 2049, requires a premium FileStorage account, and must be accessed through service endpoints or private endpoints

Setting up a private endpoint to keep SMB traffic on a private path:

```bash
# Create a private endpoint for the file share
az network private-endpoint create \
  --resource-group rg-files \
  --name pe-files \
  --vnet-name vnet-app \
  --subnet snet-private \
  --private-connection-resource-id "/subscriptions/<sub-id>/resourceGroups/rg-files/providers/Microsoft.Storage/storageAccounts/stmyfiles" \
  --group-ids file \
  --connection-name files-pe-connection
```

## Error: mount error(112) - Host is down

```text
mount error(112): Host is down
```

**Cause: Reconnection timeout or an older Linux kernel**

Microsoft documents `mount error(112)` for Linux clients that have been idle for a long time, then fail to reconnect. It can also happen on older kernels that do not include recent CIFS reconnection fixes.

```bash
# Check the kernel version
uname -r

# Use a hard mount so the client waits for reconnection instead of failing quickly
sudo mount -t cifs \
  //stmyfiles.file.core.windows.net/myshare \
  /mnt/azure-files \
  -o username=stmyfiles,password='<key>',vers=3.1.1,hard,dir_mode=0755,file_mode=0644
```

If this happens repeatedly, upgrade your Linux distribution or kernel so the CIFS client includes the current reconnection fixes.

## Error: mount(2) system call failed - No such file or directory

```text
mount(2) system call failed: No such file or directory
```

**Cause 1: cifs-utils not installed**

```bash
# Install cifs-utils on Ubuntu/Debian
sudo apt-get update && sudo apt-get install -y cifs-utils

# Install on RHEL/CentOS/Fedora
sudo yum install -y cifs-utils

# Install on SUSE
sudo zypper install -y cifs-utils
```

**Cause 2: Mount point directory does not exist**

```bash
# Create the mount point
sudo mkdir -p /mnt/azure-files
```

**Cause 3: The share name is wrong**

Double-check the share name in your mount command matches exactly what exists in the storage account:

```bash
# List all shares in the storage account
az storage share list \
  --account-name stmyfiles \
  --output table
```

## Error: mount error(5) - I/O error

```text
mount error(5): I/O error
```

**Cause: DNS resolution failure or network timeout**

```bash
# Test DNS resolution
nslookup stmyfiles.file.core.windows.net
dig stmyfiles.file.core.windows.net

# If DNS fails, check /etc/resolv.conf
cat /etc/resolv.conf

# Try querying a public resolver directly
dig @8.8.8.8 stmyfiles.file.core.windows.net

# Retry the mount
sudo mount -t cifs \
  //stmyfiles.file.core.windows.net/myshare \
  /mnt/azure-files \
  -o username=stmyfiles,password='<key>',vers=3.1.1
```

## Persistent Mount with fstab

Once you have the mount working interactively, make it persistent across reboots. Using a credentials file is more secure than putting the key in fstab:

```bash
# Create a credentials file
sudo mkdir -p /etc/smbcredentials
sudo bash -c 'cat > /etc/smbcredentials/stmyfiles.cred << EOF
username=stmyfiles
password=<your-storage-account-key>
EOF'
sudo chmod 600 /etc/smbcredentials/stmyfiles.cred

# Add the mount to fstab
# nofail ensures the system still boots if the mount fails
echo "//stmyfiles.file.core.windows.net/myshare /mnt/azure-files cifs credentials=/etc/smbcredentials/stmyfiles.cred,dir_mode=0755,file_mode=0644,serverino,nosharesock,actimeo=30,vers=3.1.1,nofail 0 0" | sudo tee -a /etc/fstab

# Test the fstab entry without rebooting
sudo mount -a
```

The `nofail` option is critical. Without it, if the storage account is unreachable during boot, your VM will hang at the mount step and become inaccessible.

## Using autofs for On-Demand Mounting

For systems where the file share is not always needed, autofs mounts the share on first access and unmounts after a period of inactivity:

```bash
# Install autofs
sudo apt-get install -y autofs

# Configure the auto.master file
echo "/mnt/azure /etc/auto.azure --timeout=300" | sudo tee -a /etc/auto.master

# Create the auto.azure file
echo "files -fstype=cifs,credentials=/etc/smbcredentials/stmyfiles.cred,vers=3.1.1,dir_mode=0755,file_mode=0644 ://stmyfiles.file.core.windows.net/myshare" | sudo tee /etc/auto.azure

# Restart autofs
sudo systemctl restart autofs

# Access the share - it mounts automatically
ls /mnt/azure/files/
```

## Debugging with Verbose Output

When none of the above fixes work, get detailed debug information:

```bash
# Enable CIFS kernel debugging
echo 7 | sudo tee /proc/fs/cifs/cifsFYI

# Try the mount
sudo mount -t cifs \
  //stmyfiles.file.core.windows.net/myshare \
  /mnt/azure-files \
  -o username=stmyfiles,password='<key>',vers=3.1.1

# Check kernel messages for detailed CIFS errors
sudo dmesg | grep -i cifs | tail -30

# Disable debugging when done
echo 0 | sudo tee /proc/fs/cifs/cifsFYI
```

The kernel debug output often reveals the exact reason for mount failures that the generic mount error messages do not show.

## Wrapping Up

Most Azure file share mounting errors on Linux come down to a few root causes: wrong credentials, blocked port 445, SMB version mismatches, or missing packages. Work through the issues systematically starting with connectivity (can you reach port 445?), then authentication (are credentials correct?), then protocol version (does your kernel support the required SMB version?). Use the verbose debugging technique as a last resort to get detailed error information. Once you have a working mount, configure it properly in fstab with the `nofail` option, or use autofs for on-demand mounting.
