# How to Configure kdump via Cockpit Web Console on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Cockpit, Linux

Description: Step-by-step guide on configure kdump via cockpit web console using Red Hat Enterprise Linux 9.

---

Configuring kdump via Cockpit Web Console on RHEL involves several steps to ensure proper operation and security. This guide covers the essential configuration options and best practices.

## Prerequisites

- Red Hat Enterprise Linux 9 with a valid subscription
- Root or sudo access
- A terminal session
- The RHEL web console installed and accessible

## Step 2: Configure the Service

If the web console is not already installed, install Cockpit and enable the web console socket:

```bash
# Install Cockpit
sudo dnf install cockpit

# Enable and start the web console
sudo systemctl enable --now cockpit.socket
```

Open the web console at `https://<server-hostname>:9090` or `https://<server-ip>:9090`, log in with an administrative account, and open the **Kernel dump** tab. Turn on the **Kernel crash dump** switch to start the `kdump` service.

Configure the kdump memory reservation in the terminal, for example:

```bash
# Reserve memory for the crash kernel
sudo grubby --update-kernel ALL --args "crashkernel=512M"

# Reboot to apply the crashkernel setting
sudo reboot
```

After the system reboots, return to the **Kernel dump** tab, click **Edit** next to **Crash dump location**, and choose a supported target:

- **Local Filesystem** for a local directory such as `/var/crash`
- **Remote over SSH** with the server, SSH key, and directory
- **Remote over NFS** with the server, export, and directory

Select **Compression** if you want to reduce the size of the `vmcore` file.

## Step 3: Enable and Start the Service

```bash
# Enable the service to start on boot
sudo systemctl enable kdump.service

# Start the service
sudo systemctl start kdump.service

# Check the status
sudo systemctl status kdump.service
```


## Verification

Confirm everything is working by checking the status and logs:

```bash
# Check the service status
sudo kdumpctl status

# Review recent logs
journalctl -u kdump.service --no-pager -n 20
```

You can also use **Test configuration** in the **Kernel dump** tab. Only test on a non-production system or during a maintenance window because the test intentionally crashes the kernel and can cause data loss.

## Troubleshooting

- If the service fails to start, check the logs with `journalctl -u kdump.service -e --no-pager`.
- Ensure all required packages are installed: `rpm -q cockpit kexec-tools`.
- If you changed the dump path, make sure the directory exists before `kdump.service` starts.

## Conclusion

You have successfully completed the setup described in this guide. Remember to monitor the service and review logs regularly to catch issues early. For production environments, always test changes in a staging environment first and keep your RHEL system updated with the latest security patches.
