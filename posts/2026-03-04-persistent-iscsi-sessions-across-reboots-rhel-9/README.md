# How to Configure Persistent iSCSI Sessions Across Reboots on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, iSCSI, Persistent Sessions, Storage, Linux

Description: Configure iSCSI sessions on RHEL to automatically reconnect after reboots, ensuring your remote storage is always available.

---

By default, iSCSI sessions established with `iscsiadm --login` are not persistent. After a reboot, the sessions need to be manually re-established. For production systems, you want iSCSI sessions to reconnect automatically so that file systems on iSCSI LUNs mount properly at boot time.

## Automatic Login Configuration

When you discover and log in to a target, you can set the `node.startup` parameter to `automatic`:

```bash
# Set automatic login for a specific target
sudo iscsiadm -m node -T iqn.2024.com.example:target1 -p 192.168.1.10:3260 \
    -o update -n node.startup -v automatic
```

Alternatively, set the default in `/etc/iscsi/iscsid.conf`:

```bash
sudo vi /etc/iscsi/iscsid.conf
```

Change the startup value:

```
node.startup = automatic
```

With this setting, all newly discovered targets will default to automatic login at boot.

## Required Services

Make sure the iSCSI services are enabled:

```bash
sudo systemctl enable iscsid
sudo systemctl enable iscsi
```

The boot sequence is:
1. `iscsid` daemon starts
2. `iscsi` service logs in to all targets with `node.startup = automatic`
3. iSCSI disks become available
4. File systems are mounted (if configured with `_netdev` in fstab)

## Mounting iSCSI File Systems at Boot

When adding iSCSI file systems to `/etc/fstab`, use the `_netdev` mount option. This tells the system to wait for network connectivity before mounting:

```bash
echo '/dev/sdb /mnt/iscsi xfs defaults,_netdev 0 0' | sudo tee -a /etc/fstab
```

For more reliability, use the UUID or WWID instead of the device name:

```bash
# Find the UUID
sudo blkid /dev/sdb

# Use UUID in fstab
echo 'UUID=abc12345-def6-7890-abcd-ef1234567890 /mnt/iscsi xfs defaults,_netdev 0 0' | sudo tee -a /etc/fstab
```

## Checking Session Persistence Settings

View the current startup setting for all targets:

```bash
sudo iscsiadm -m node -o show | grep "node.startup"
```

Or for a specific target:

```bash
sudo iscsiadm -m node -T iqn.2024.com.example:target1 -p 192.168.1.10:3260 -o show | grep startup
```

## Session Timeouts and Reconnection

Configure how the initiator handles connection drops:

```bash
sudo vi /etc/iscsi/iscsid.conf
```

Key timeout settings:

```
# Time to wait for a response before declaring the connection dead (seconds)
node.session.timeo.replacement_timeout = 120

# Number of times to retry login
node.session.initial_login_retry_max = 8

# Delay between login retries (seconds)
node.conn[0].timeo.login_timeout = 15

# NOP-out interval and timeout for connection health checks
node.conn[0].timeo.noop_out_interval = 5
node.conn[0].timeo.noop_out_timeout = 5
```

## Testing Persistence

1. Verify the session is configured for automatic login:
   ```bash
   sudo iscsiadm -m node -o show | grep "node.startup"
   ```

2. Reboot the system:
   ```bash
   sudo reboot
   ```

3. After reboot, verify the session is active:
   ```bash
   sudo iscsiadm -m session
   ```

4. Verify the file system is mounted:
   ```bash
   df -h /mnt/iscsi
   ```

## Disabling Automatic Login

To stop a target from auto-connecting:

```bash
sudo iscsiadm -m node -T iqn.2024.com.example:target1 -p 192.168.1.10:3260 \
    -o update -n node.startup -v manual
```

## Using systemd Mount Units

For more control over mount dependencies, use a systemd mount unit instead of fstab:

```bash
sudo tee /etc/systemd/system/mnt-iscsi.mount << 'UNIT'
[Unit]
Description=iSCSI Storage Mount
After=iscsi.service
Requires=iscsi.service

[Mount]
What=/dev/disk/by-uuid/abc12345-def6-7890-abcd-ef1234567890
Where=/mnt/iscsi
Type=xfs
Options=_netdev

[Install]
WantedBy=multi-user.target
UNIT

sudo systemctl daemon-reload
sudo systemctl enable mnt-iscsi.mount
```

## Conclusion

Persistent iSCSI sessions are essential for production systems that depend on iSCSI storage. Set `node.startup = automatic`, enable the iSCSI services, and use the `_netdev` option in fstab to ensure reliable automatic reconnection and mounting after reboots. Always use UUIDs instead of device names in fstab to avoid device ordering issues.
