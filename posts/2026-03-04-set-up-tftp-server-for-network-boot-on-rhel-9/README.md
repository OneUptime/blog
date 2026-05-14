# How to Set Up TFTP Server for Network Boot on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Provisioning, Linux

Description: Step-by-step guide on set up tftp server for network boot using Red Hat Enterprise Linux 9.

---

Setting up a TFTP server for network boot on RHEL requires proper planning and configuration. This guide walks through each step from initial installation to verification.

## Prerequisites

- RHEL with a valid subscription or CentOS Stream 9
- Root or sudo access
- A terminal session
- Boot files prepared for your client firmware, and a DHCP server configured to point clients to those files

## Step 2: Install and Prepare the TFTP Service

Install the TFTP server package:

```bash
# Install the TFTP server package
sudo dnf install tftp-server
```

Create the TFTP root directory and copy your network boot files into it. On RHEL 9, the default TFTP root is `/var/lib/tftpboot`.

```bash
# Create the TFTP root directory
sudo mkdir -p /var/lib/tftpboot

# Example for BIOS PXE boot files
sudo mkdir -p /var/lib/tftpboot/pxelinux/pxelinux.cfg
```

Adjust the files according to your requirements. Common items to configure include boot loader files, kernel and initramfs paths, and PXE or GRUB menu entries.

```bash
# Restore the default SELinux context after copying files
sudo restorecon -Rv /var/lib/tftpboot
```

## Step 3: Enable and Start the Service

```bash
# Enable the service to start on boot
sudo systemctl enable tftp.socket

# Start the service
sudo systemctl start tftp.socket

# Check the status
sudo systemctl status tftp.socket
```

## Step 4: Configure the Firewall

```bash
# Open the TFTP service in the firewall
sudo firewall-cmd --add-service=tftp
sudo firewall-cmd --permanent --add-service=tftp
sudo firewall-cmd --reload

# Verify the rule
sudo firewall-cmd --list-all
```


## Verification

Confirm everything is working by checking the status and logs:

```bash
# Check the service status
sudo systemctl status tftp.socket

# Review recent logs
sudo journalctl -u tftp.socket --no-pager -n 20

# From another host with a TFTP client installed, try downloading a known file
tftp <server-ip> -c get pxelinux/pxelinux.0
```

## Troubleshooting

- If the service fails to start, check the logs with `journalctl -u tftp.socket -e --no-pager`.
- SELinux may block access if files have the wrong context. Check for denials with `ausearch -m avc -ts recent` and restore contexts with `restorecon -Rv /var/lib/tftpboot`.
- Verify firewall rules allow TFTP traffic: `firewall-cmd --list-services`.
- Ensure the TFTP server package is installed: `rpm -q tftp-server`.
- Test network connectivity with `ss -lunp` to verify UDP listeners and `tftp <server-ip> -c get <file>` to test file downloads.

## Conclusion

You have successfully completed the setup described in this guide. Remember to monitor the service and review logs regularly to catch issues early. For production environments, always test changes in a staging environment first and keep your RHEL system updated with the latest security patches.
