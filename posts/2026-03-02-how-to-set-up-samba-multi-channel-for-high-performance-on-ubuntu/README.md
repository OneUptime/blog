# How to Set Up Samba Multi-Channel for High Performance on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Samba, Networking, Performance, Storage

Description: Configure Samba SMB3 Multi-Channel on Ubuntu to aggregate multiple network interfaces for higher throughput and failover on file server workloads.

---

SMB3 Multi-Channel allows a Samba server and a Windows client (or another SMB3 client) to use multiple network connections simultaneously for a single SMB session. The result is aggregated bandwidth - if you have two 10GbE interfaces, you can effectively use 20Gbps of throughput for file transfers. It also provides automatic failover: if one network path drops, the session continues on the remaining connections.

This guide covers enabling and validating SMB3 Multi-Channel on Ubuntu. You need at least two physical network interfaces on both the server and client, and a switch that connects them. NIC teaming or bonding is different from Multi-Channel - this feature works at the SMB protocol level.

## Requirements

- Ubuntu 20.04 or later
- Samba 4.4 or higher (Ubuntu 20.04 ships 4.11)
- Two or more physical network interfaces on the server
- A Windows 10/11 or Windows Server client with multiple NICs, or another SMB3 Multi-Channel capable client
- Both interfaces on the same IP subnet, or separate subnets that the client can reach

## Checking Current Network Interfaces

Before configuring anything, map out your interfaces:

```bash
# List all network interfaces with addresses
ip addr show

# Check interface speeds
for iface in $(ls /sys/class/net/ | grep -v lo); do
    echo -n "$iface: "
    cat /sys/class/net/$iface/speed 2>/dev/null || echo "N/A"
done
```

For Multi-Channel to work effectively, the interfaces should be on the same broadcast domain or at least both reachable from the client. A typical setup uses two separate IP addresses on the server:

```text
enp3s0: 192.168.1.10/24
enp4s0: 192.168.1.11/24
```

## Configuring Network Interfaces

Configure both interfaces with static IPs using Netplan:

```bash
sudo nano /etc/netplan/01-netcfg.yaml
```

```yaml
network:
  version: 2
  renderer: networkd
  ethernets:
    enp3s0:
      addresses:
        - 192.168.1.10/24
      gateway4: 192.168.1.1
      nameservers:
        addresses: [8.8.8.8, 8.8.4.4]
    enp4s0:
      addresses:
        - 192.168.1.11/24
      # No gateway on secondary - avoids routing conflicts
```

Apply the configuration:

```bash
sudo netplan apply
ip addr show
```

## Enabling SMB3 Multi-Channel in Samba

Open the Samba configuration:

```bash
sudo nano /etc/samba/smb.conf
```

Add or modify the `[global]` section:

```ini
[global]
   workgroup = WORKGROUP
   server string = Ubuntu File Server
   server role = standalone server

   # Enable SMB3 Multi-Channel
   server multi channel support = yes

   # Require SMB2 or higher (Multi-Channel only works with SMB2/3)
   server min protocol = SMB2
   server max protocol = SMB3

   # Signing - required for Multi-Channel per the spec
   # Can be "auto", "mandatory", or "disabled"
   # "auto" allows negotiation - clients will use it
   server signing = auto

   # Bind Samba to specific interfaces
   # List the interfaces you want Samba to advertise and listen on
   interfaces = lo enp3s0 enp4s0
   bind interfaces only = yes

   # Performance tuning
   socket options = TCP_NODELAY IPTOS_LOWDELAY SO_RCVBUF=131072 SO_SNDBUF=131072
   read raw = yes
   write raw = yes
   max xmit = 65535
   dead time = 15

   # Logging
   log file = /var/log/samba/log.%m
   max log size = 1000

[Data]
   path = /srv/samba/data
   valid users = @smbusers
   read only = no
   browseable = yes
   create mask = 0664
   directory mask = 0775
```

Test and restart:

```bash
testparm
sudo systemctl restart smbd nmbd
```

## Verifying Multi-Channel is Active

From a Windows client, open PowerShell and connect to the share, then check the Multi-Channel status:

```powershell
# Connect to the share
net use Z: \\192.168.1.10\Data /user:smbuser

# Check SMB session details - look for NumChannels > 1
Get-SmbMultichannelConnection -ServerName 192.168.1.10
```

The output should show multiple entries with different client and server IP pairs. If `NumChannels` is 1, Multi-Channel did not activate.

On the Ubuntu server, check active connections:

```bash
# Show Samba connections with SMB version info
sudo smbstatus -b

# Check Samba logs for Multi-Channel negotiation
sudo grep -i "multichannel\|multi.channel" /var/log/samba/log.smbd | tail -20
```

## Enabling RSS on Network Cards

Receive-Side Scaling (RSS) helps distribute network interrupt processing across CPU cores, which significantly improves throughput on high-speed links. Not all NICs support it.

```bash
# Check RSS queue count
ethtool -l enp3s0

# Set RSS queue count (use number of CPU cores or as many as supported)
sudo ethtool -L enp3s0 combined 4
sudo ethtool -L enp4s0 combined 4

# Verify the change
ethtool -l enp3s0
```

Make RSS settings persistent by adding them to a NetworkManager dispatcher script or a systemd service:

```bash
# Create a systemd service to apply ethtool settings on boot
sudo nano /etc/systemd/system/nic-rss.service
```

```ini
[Unit]
Description=Set NIC RSS queues
After=network.target

[Service]
Type=oneshot
ExecStart=/sbin/ethtool -L enp3s0 combined 4
ExecStart=/sbin/ethtool -L enp4s0 combined 4
RemainAfterExit=yes

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable nic-rss.service
sudo systemctl start nic-rss.service
```

## Performance Testing

Test actual throughput to confirm Multi-Channel is helping. Use `robocopy` on Windows or `smbclient` with a large file:

```powershell
# Windows - copy a 10GB test file and measure throughput
$start = Get-Date
Copy-Item -Path C:\testfile_10gb.dat -Destination Z:\testfile_10gb.dat
$elapsed = (Get-Date) - $start
Write-Host "Transfer time: $elapsed"
```

From Linux with smbclient:

```bash
# Generate a test file
dd if=/dev/urandom of=/tmp/testfile bs=1M count=1024

# Upload and time it
time smbclient //192.168.1.10/Data -U smbuser -c "put /tmp/testfile testfile"
```

Compare results before and after enabling Multi-Channel. On dual 1GbE links, expect 150-180 MB/s versus 110-115 MB/s single-channel.

## Troubleshooting

**Multi-Channel not activating:** The client must also support Multi-Channel. Windows 10 Home edition does NOT support SMB Multi-Channel - you need Pro, Enterprise, or a Windows Server edition. Check with `Get-SmbClientConfiguration | Select EnableMultiChannel`.

**Only one IP is used:** Samba must be bound to both interfaces with `bind interfaces only = yes`. Verify with `ss -tlnp | grep smbd`.

**Performance is worse with Multi-Channel:** Check that RSS is enabled on the NICs and that the kernel is not bottlenecked on a single core processing interrupts. Run `mpstat -P ALL 1` during a transfer to check CPU distribution.

**SMB signing overhead:** Multi-Channel requires signing when encryption is not used. If performance is lower than expected, check signing cipher negotiation in the logs. Setting `smb encrypt = desired` on the share may help by using encryption instead of signing, which can be offloaded to AES-NI hardware.

## Monitoring Throughput Over Time

A simple monitoring approach using `sar` from the sysstat package:

```bash
sudo apt install sysstat -y

# Collect network stats every 5 seconds
sar -n DEV 5 12

# Or watch live with nload
sudo apt install nload
nload enp3s0
```

With proper Multi-Channel configuration, you can push significantly higher throughput out of existing hardware without investing in higher-speed NICs or switches. The feature is transparent to applications - they just see a fast SMB share.
