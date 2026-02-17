# How to Use the Serial Console to Debug a Compute Engine VM That Will Not Boot

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Compute Engine, Serial Console, Debugging, Troubleshooting

Description: Learn how to use the serial console to diagnose and fix Compute Engine VMs that will not boot, including common boot failures and their solutions.

---

Few things are more frustrating than a VM that will not boot. You cannot SSH in because the network stack never comes up. The Cloud Console just shows the instance as "running" but you cannot connect. What do you do?

The serial console is your lifeline. It gives you direct access to the VM's serial port output, letting you see boot messages, kernel logs, and error messages that explain exactly what went wrong. In some cases, you can even get an interactive terminal session to fix the problem in place.

## Enabling the Serial Console

The interactive serial console is disabled by default for security reasons. You need to enable it before you can use it.

**Enable at the project level:**

```bash
# Enable interactive serial console access for all VMs in the project
gcloud compute project-info add-metadata \
    --metadata serial-port-enable=TRUE
```

**Enable for a specific instance:**

```bash
# Enable interactive serial console for a single VM
gcloud compute instances add-metadata my-broken-vm \
    --zone=us-central1-a \
    --metadata serial-port-enable=TRUE
```

Note that enabling the interactive serial console on a running VM does not require a restart. The metadata change takes effect immediately.

## Viewing Serial Port Output (Read-Only)

Even without enabling the interactive console, you can always read the serial port output. This is often enough to diagnose the problem.

```bash
# Get the serial port output from a VM
gcloud compute instances get-serial-port-output my-broken-vm \
    --zone=us-central1-a
```

This dumps all the boot messages and system output. Scroll through it to find error messages. Common things to look for:

- Kernel panic messages
- Filesystem check failures
- Service startup errors
- Out of memory (OOM) kills
- Network configuration failures

You can also specify which serial port to read (there are four, numbered 1-4):

```bash
# Read output from serial port 1 (default console output)
gcloud compute instances get-serial-port-output my-broken-vm \
    --zone=us-central1-a \
    --port=1
```

## Connecting to the Interactive Serial Console

When you need to actually interact with the VM (run commands, edit files, restart services), connect to the interactive serial console:

```bash
# Connect to the interactive serial console
gcloud compute connect-to-serial-port my-broken-vm \
    --zone=us-central1-a
```

You will see the VM's console output, and if a login prompt is available, you can log in with your credentials. On Linux VMs with OS Login enabled, your OS Login credentials work here too.

To disconnect from the serial console, press `~.` (tilde followed by period).

## Common Boot Failures and How to Fix Them

### Failure 1: Disk Full

One of the most common reasons a VM will not boot is a full disk. The system cannot write temporary files, logs, or PID files, so services fail to start.

**Diagnosis**: Look for "No space left on device" in the serial output.

```bash
# Check serial output for disk space errors
gcloud compute instances get-serial-port-output my-broken-vm \
    --zone=us-central1-a 2>&1 | grep -i "no space"
```

**Fix**: Connect via the serial console and free up space:

```bash
# Through the serial console, clean up large files
sudo rm -rf /var/log/*.gz
sudo rm -rf /tmp/*
sudo apt-get clean
sudo journalctl --vacuum-size=100M
```

If you cannot even log in because there is no space for the login process, you can attach the disk to another VM as a secondary disk, clean it up, and reattach it.

### Failure 2: Bad fstab Entry

If you added an entry to `/etc/fstab` that references a disk that is not available, the system can hang or drop to an emergency shell during boot.

**Diagnosis**: Look for "mount failed" or "dependency failed" messages in the serial output.

**Fix**: Connect via the serial console. If you get dropped to an emergency shell:

```bash
# Remount the root filesystem as read-write
mount -o remount,rw /

# Edit fstab to fix or comment out the bad entry
nano /etc/fstab

# Reboot
reboot
```

This is why the `nofail` option in fstab is so important for non-critical disks.

### Failure 3: Broken Startup Script

A startup script that hangs or consumes all resources can prevent the VM from becoming usable.

**Diagnosis**: The serial output shows the startup script running but never completing.

**Fix**: Remove or fix the startup script from outside the VM:

```bash
# Remove the startup script metadata
gcloud compute instances remove-metadata my-broken-vm \
    --zone=us-central1-a \
    --keys=startup-script

# Restart the VM
gcloud compute instances reset my-broken-vm --zone=us-central1-a
```

### Failure 4: Kernel Panic

A kernel panic usually means a corrupted filesystem, bad kernel module, or hardware issue (rare on cloud VMs).

**Diagnosis**: The serial output shows "Kernel panic - not syncing" followed by a stack trace.

**Fix**: Try booting from a rescue disk:

```bash
# Stop the broken VM
gcloud compute instances stop my-broken-vm --zone=us-central1-a

# Detach the boot disk
gcloud compute instances detach-disk my-broken-vm \
    --disk=my-broken-vm \
    --zone=us-central1-a

# Create a rescue VM
gcloud compute instances create rescue-vm \
    --zone=us-central1-a \
    --machine-type=e2-small \
    --image-family=debian-12 \
    --image-project=debian-cloud

# Attach the broken disk as a secondary disk
gcloud compute instances attach-disk rescue-vm \
    --disk=my-broken-vm \
    --zone=us-central1-a

# SSH into the rescue VM and fix the filesystem
gcloud compute ssh rescue-vm --zone=us-central1-a
```

Inside the rescue VM:

```bash
# Run a filesystem check on the broken disk
sudo fsck /dev/sdb1

# Mount the disk and inspect/fix files
sudo mkdir /mnt/broken
sudo mount /dev/sdb1 /mnt/broken
# ... fix whatever is wrong ...
sudo umount /mnt/broken
```

### Failure 5: Network Configuration Issues

If the VM boots but you cannot reach it over the network, the serial console is your only way in.

**Diagnosis**: Check the serial output for DHCP failures or network interface errors.

```bash
# Look for network-related errors in serial output
gcloud compute instances get-serial-port-output my-broken-vm \
    --zone=us-central1-a 2>&1 | grep -i "network\|dhcp\|eth0\|ens4"
```

**Fix**: Through the serial console, check and fix network configuration:

```bash
# Check the network interface status
ip addr show
ip route show

# Restart networking
sudo systemctl restart networking
# Or on newer systems
sudo systemctl restart systemd-networkd
```

## Using Serial Port Logging for Monitoring

You can set up Cloud Logging to capture serial port output continuously, which is useful for monitoring boot issues across a fleet of VMs:

```bash
# Enable serial port logging to Cloud Logging
gcloud compute instances add-metadata my-vm \
    --zone=us-central1-a \
    --metadata serial-port-logging-enable=TRUE
```

Once enabled, serial port output goes to Cloud Logging where you can search, alert on, and archive it.

## Security Considerations

The interactive serial console provides root-level access to your VM, so treat it with appropriate caution:

1. **Do not enable it project-wide in production** unless you have a good reason. Enable it on specific instances when needed.
2. **Use IAM to control access**: The `roles/compute.instanceAdmin` role is needed to connect to the serial console.
3. **Disable it after debugging**: Once you have fixed the issue, disable the interactive serial console.

```bash
# Disable interactive serial console after debugging
gcloud compute instances add-metadata my-fixed-vm \
    --zone=us-central1-a \
    --metadata serial-port-enable=FALSE
```

4. **Use organization policies** to prevent serial console access if your security requirements demand it:

```bash
# Create an org policy to disable serial console access
gcloud resource-manager org-policies enable-enforce \
    compute.disableSerialPortAccess \
    --organization=ORGANIZATION_ID
```

## Tips for Effective Debugging

- **Read the full serial output** before trying fixes. The root cause is often further up in the log than where the visible error is.
- **Take a snapshot before making changes** through the serial console. You might need to roll back.
- **Check the timestamp of messages** to understand the sequence of events during boot.
- **Use the rescue VM approach** for serious issues. It is safer to fix a broken filesystem from another VM than from within the broken system.
- **Keep a runbook** of common boot issues and their fixes. When a VM will not boot at 3 AM, you want step-by-step instructions ready.

## Wrapping Up

The serial console is an essential debugging tool that every Compute Engine user should know how to use. While you hopefully will not need it often, when a VM will not boot and SSH is not an option, it is the only way to see what is going on and fix it. Get comfortable with reading serial port output and connecting to the interactive console before you actually need it in an emergency.
