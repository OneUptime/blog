# How to Configure IPv6 for Storage Networks in Data Centers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Storage Networks, iSCSI, NFS, SMB, NVMe-oF, Data Center

Description: Configure IPv6 for data center storage networks including iSCSI over IPv6, NFS with IPv6 exports, NVMe over Fabrics with IPv6 transport, and storage network security.

---

Storage networks carry high-bandwidth, latency-sensitive I/O traffic. IPv6 on storage networks enables large-scale storage deployments without IPv4 address exhaustion concerns, supports iSCSI, NFS, SMB, and NVMe-oF protocols over IPv6, and can participate in ECMP/LAG hashing when the network is configured to use the IPv6 flow label.

## IPv6 Storage Network Design

```text
IPv6 Storage Network Architecture:

Storage Network: 2001:db8:1000::/48
  iSCSI VLAN 300:   2001:db8:1000:300::/64
  NFS VLAN 310:     2001:db8:1000:310::/64
  NVMe-oF VLAN 320: 2001:db8:1000:320::/64
  Replication:      2001:db8:1000:400::/64

Storage Array Addressing:
  NetApp-A controller-1: 2001:db8:1000:300::10/64
  NetApp-A controller-2: 2001:db8:1000:300::11/64
  Pure Storage array:    2001:db8:1000:300::20/64

Host Addressing:
  Server-01 iSCSI HBA1: 2001:db8:1000:300::101/64
  Server-01 iSCSI HBA2: 2001:db8:1000:300::111/64
  (Dual-path for multipath I/O)
```

## iSCSI over IPv6 Configuration

```bash
# Configure iSCSI initiator over IPv6 (Linux)

# Install open-iscsi

sudo apt install open-iscsi -y

# /etc/iscsi/iscsid.conf
node.startup = automatic
node.session.auth.authmethod = CHAP
node.session.auth.username = initiator-user
node.session.auth.password = chappassword

# Discover iSCSI targets over IPv6
sudo iscsiadm -m discovery -t st -p \
    [2001:db8:1000:300::10]:3260

# Expected output:
# [2001:db8:1000:300::10]:3260,1 iqn.2023-01.com.netapp:storage-pool1

# Login to iSCSI target
sudo iscsiadm -m node \
    -T iqn.2023-01.com.netapp:storage-pool1 \
    -p [2001:db8:1000:300::10]:3260 \
    --login

# Verify iSCSI session via IPv6
sudo iscsiadm -m session -P1 | grep -E "Current Portal|IPv6"

# Check the resulting block device
lsblk
```

## NFS over IPv6

```bash
# NFS Server - /etc/exports (Linux)
# Export NFS with IPv6 client restrictions

/data/share1 2001:db8:1000:310::/64(rw,sync,no_root_squash,no_subtree_check)
/data/share2 2001:db8:2100::/64(ro,sync,all_squash,no_subtree_check)
/data/backup 2001:db8:2200::100(rw,sync)  # Single IPv6 host

# Restart NFS
sudo exportfs -ra
sudo systemctl restart nfs-server

# NFS Client - mount over IPv6
sudo mount -t nfs -o vers=4.2 \
    [2001:db8:1000:310::10]:/data/share1 \
    /mnt/nfs-share1

# /etc/fstab entry for IPv6 NFS
[2001:db8:1000:310::10]:/data/share1 /mnt/nfs-share1 nfs \
    vers=4.2,rw,sync,hard,_netdev 0 0

# NFSv4 identity mapping
# /etc/idmapd.conf
[General]
Domain = example.com
```

## NVMe over Fabrics (NVMe-oF) with IPv6

```bash
# NVMe-oF TCP over IPv6

# NVMe-oF Target (storage server)
# Load NVMe-oF target module
modprobe nvmet
modprobe nvmet-tcp

# Create NVMe-oF subsystem
mkdir /sys/kernel/config/nvmet/subsystems/nqn.2023-01.com.example:nvme-target

# Configure allowed hosts
echo 1 > /sys/kernel/config/nvmet/subsystems/nqn.2023-01.com.example:nvme-target/attr_allow_any_host

# Add NVMe namespace (volume)
mkdir /sys/kernel/config/nvmet/subsystems/nqn.2023-01.com.example:nvme-target/namespaces/1
echo -n "/dev/nvme0n1" > /sys/kernel/config/nvmet/subsystems/nqn.2023-01.com.example:nvme-target/namespaces/1/device_path
echo 1 > /sys/kernel/config/nvmet/subsystems/nqn.2023-01.com.example:nvme-target/namespaces/1/enable

# Create TCP port (IPv6)
mkdir /sys/kernel/config/nvmet/ports/1
echo "tcp" > /sys/kernel/config/nvmet/ports/1/addr_trtype
echo "2001:db8:1000:320::10" > /sys/kernel/config/nvmet/ports/1/addr_traddr
echo "4420" > /sys/kernel/config/nvmet/ports/1/addr_trsvcid
echo "ipv6" > /sys/kernel/config/nvmet/ports/1/addr_adrfam

# Link subsystem to port
ln -s /sys/kernel/config/nvmet/subsystems/nqn.2023-01.com.example:nvme-target \
    /sys/kernel/config/nvmet/ports/1/subsystems/

# NVMe-oF Initiator (host)
nvme discover -t tcp -a 2001:db8:1000:320::10 -s 4420
nvme connect -t tcp -a 2001:db8:1000:320::10 -s 4420 \
    -n nqn.2023-01.com.example:nvme-target

# Verify
nvme list
nvme show-topology
```

## Storage Network Firewall (IPv6)

```bash
# ip6tables rules for storage network security
# Allow selected storage protocols; apply under a default-drop policy

# Allow iSCSI (TCP 3260) from compute servers
ip6tables -A INPUT -p tcp --dport 3260 \
    -s 2001:db8:2000::/64 -j ACCEPT

# Allow NFSv4 (TCP 2049) from application servers
ip6tables -A INPUT -p tcp --dport 2049 \
    -s 2001:db8:2100::/64 -j ACCEPT

# Allow NVMe-oF TCP
ip6tables -A INPUT -p tcp --dport 4420 \
    -s 2001:db8:2000::/64 -j ACCEPT

# Allow SMB/CIFS over IPv6
ip6tables -A INPUT -p tcp --dport 445 \
    -s 2001:db8:2300::/48 -j ACCEPT

# Block storage network from internet
ip6tables -A FORWARD -i eth-stor -o eth-wan -j DROP
ip6tables -A FORWARD -i eth-wan -o eth-stor -j DROP

ip6tables-save > /etc/ip6tables/storage-rules.v6
```

IPv6 storage networks support all major storage protocols-iSCSI (using bracket notation for IPv6 targets), NFS v4.x (export entries use IPv6 prefixes), NVMe-oF TCP (specifying `addr_adrfam=ipv6`)-and benefit from IPv6's larger address space for managing thousands of storage endpoints without NAT, while strict VLAN isolation and ip6tables policies protect storage traffic from unauthorized access.
