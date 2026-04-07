# How to Set Up SMB Multi-Channel for Ceph Performance

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, SMB, Multi-Channel, Performance

Description: Learn how to configure SMB Multi-Channel on Ceph Samba gateways to aggregate multiple network paths for improved throughput and redundancy.

---

## What is SMB Multi-Channel?

SMB Multi-Channel (introduced in SMB 3.0) allows a single SMB session to use multiple network connections simultaneously. This provides:
- Aggregated bandwidth across multiple NICs
- Automatic failover if one network path fails
- Better CPU distribution across network interfaces

## Requirements

For SMB Multi-Channel to work:
- Samba 4.4 or later
- SMB 3.0 or later protocol version
- Windows 8/Server 2012 or later clients (or Linux with kernel 5.x)
- Multiple network interfaces on both server and client

## Enabling Multi-Channel in Samba

Enable Multi-Channel in `/etc/samba/smb.conf`:

```ini
[global]
    server multi channel support = yes
    aio read size = 1
    aio write size = 1
    max protocol = SMB3_11
    min protocol = SMB2
```

Restart Samba to apply:

```bash
systemctl restart smb
```

## Configuring Multiple NICs on the Samba Server

Ensure Samba listens on all network interfaces:

```ini
[global]
    interfaces = eth0 eth1 eth2
    bind interfaces only = yes
```

Or bind to specific IP addresses:

```ini
[global]
    interfaces = 10.0.1.10 10.0.1.11 10.0.2.10
    bind interfaces only = yes
```

## Verifying Multi-Channel on Linux Clients

On Linux clients using `cifs-utils`, enable Multi-Channel:

```bash
mount -t cifs //samba01/cephshare /mnt/smb \
  -o username=alice,password=pass,vers=3.1.1,multichannel
```

Check that multiple channels are established:

```bash
cat /proc/fs/cifs/DebugData | grep "Number of channels"
```

## Verifying Multi-Channel on Windows Clients

Check Multi-Channel status in PowerShell:

```powershell
Get-SmbMultichannelConnection -ServerName samba01
```

Expected output:

```text
Server Name   Client IP   Server IP   Client RSS Capable  Server RSS Capable  Selected
-----------   ---------   ---------   ------------------  ------------------  --------
samba01       10.0.1.100  10.0.1.10   True                True                True
samba01       10.0.1.100  10.0.1.11   True                True                False
```

View configured interface constraints for Multi-Channel:

```powershell
Get-SmbMultichannelConstraint
```

## Performance Testing

Benchmark Multi-Channel throughput with multiple streams:

```powershell
# PowerShell parallel copy test
1..4 | ForEach-Object -Parallel {
    $source = "C:\testfile.dat"
    $dest = "Z:\testfile_$_.dat"
    Copy-Item $source $dest
} -ThrottleLimit 4
```

Or from Linux:

```bash
# Parallel write test
for i in {1..4}; do
  dd if=/dev/zero of=/mnt/smb/test$i bs=1M count=1024 oflag=direct &
done
wait
```

Compare throughput with and without Multi-Channel by toggling the option.

## RSS (Receive Side Scaling) Requirements

For Multi-Channel to fully utilize multiple cores, NICs must support RSS. Check RSS support:

```bash
# On Linux server
ethtool -l eth0 | grep Combined
ethtool -L eth0 combined 4  # Set 4 combined queues
```

## Summary

SMB Multi-Channel improves CephFS SMB performance by aggregating multiple network paths between the Samba gateway and clients. Enabling it requires Samba 4.4+, multiple NICs on the server, and SMB 3.0 clients. The resulting bandwidth aggregation and failover capability make Multi-Channel essential for high-throughput workloads like video editing or large dataset analysis over SMB.
