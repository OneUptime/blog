# How to Configure iSCSI with IPv6 Targets

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, iSCSI, Storage, SAN, Linux, Target

Description: Configure iSCSI targets and initiators over IPv6, including target portal configuration with IPv6 addresses, initiator discovery, and CHAP authentication for IPv6 iSCSI connections.

## Introduction

iSCSI (Internet Small Computer Systems Interface) transports SCSI commands over IP networks and fully supports IPv6. iSCSI target portals are configured with IPv6 addresses, and initiators connect using IPv6-formatted portal addresses. This enables storage area network (SAN) connectivity over IPv6 infrastructure without NAT.

## iSCSI Target Configuration (targetcli / LIO)

```bash
# Install targetcli (Linux LIO target)

apt-get install -y targetcli-fb    # Debian/Ubuntu
dnf install -y targetcli           # RHEL/CentOS

# Enter targetcli shell
targetcli

# Create a block storage backstore
/backstores/block create name=disk0 dev=/dev/sdb
# or a file-backed store:
/backstores/fileio create name=lun0 file_or_dev=/srv/iscsi/lun0.img size=10G

# Create an iSCSI target
/iscsi create iqn.2024-01.com.example:storage.server1

# Change to the default Target Portal Group (TPG)
# targetcli creates tpg1 and a default [::0]:3260 portal automatically
/iscsi/iqn.2024-01.com.example:storage.server1/tpg1

# Replace the default wildcard portal with a specific IPv6 portal address
/iscsi/iqn.2024-01.com.example:storage.server1/tpg1/portals delete \
    ip_address=::0 ip_port=3260
/iscsi/iqn.2024-01.com.example:storage.server1/tpg1/portals create \
    ip_address=2001:db8::10 ip_port=3260

# Add LUN (link backstore to TPG)
/iscsi/iqn.2024-01.com.example:storage.server1/tpg1/luns create \
    /backstores/block/disk0
# or, if you created the file-backed store:
/iscsi/iqn.2024-01.com.example:storage.server1/tpg1/luns create \
    /backstores/fileio/lun0

# Set ACL for initiator IQN
/iscsi/iqn.2024-01.com.example:storage.server1/tpg1/acls create \
    iqn.2024-01.com.example:client1.initiator

# Save configuration
saveconfig

# Exit
exit
```

## Enable iSCSI Target Restore Service

```bash
# Enable the service that restores the saved LIO configuration on boot
systemctl enable --now rtslib-fb-targetctl.service   # Debian/Ubuntu
systemctl enable --now target.service                # RHEL/CentOS

# Verify target is listening on IPv6
ss -tlnp | grep 3260
# Should show [::]:3260 or [2001:db8::10]:3260
```

## Firewall Rules for iSCSI over IPv6

```bash
# Allow iSCSI (port 3260) from initiator IPv6 addresses
ip6tables -A INPUT -p tcp --dport 3260 -s 2001:db8:100::/48 -j ACCEPT
ip6tables -A INPUT -p tcp --dport 3260 -m state --state ESTABLISHED,RELATED -j ACCEPT

# On Debian/Ubuntu with iptables-persistent:
ip6tables-save > /etc/ip6tables/rules.v6
```

## iSCSI Initiator Configuration (open-iscsi)

```bash
# Install open-iscsi
apt-get install -y open-iscsi     # Debian/Ubuntu
dnf install -y iscsi-initiator-utils  # RHEL/CentOS

# /etc/iscsi/initiatorname.iscsi
InitiatorName=iqn.2024-01.com.example:client1.initiator

# Discover targets on IPv6 portal
iscsiadm -m discovery -t sendtargets -p "[2001:db8::10]:3260"
# Expected output:
# [2001:db8::10]:3260,1 iqn.2024-01.com.example:storage.server1

# Login to the discovered target
iscsiadm -m node \
    -T iqn.2024-01.com.example:storage.server1 \
    -p "[2001:db8::10]:3260" \
    --login

# Verify iSCSI session is established
iscsiadm -m session
# Expected:
# tcp: [1] [2001:db8::10]:3260,1 iqn.2024-01.com.example:storage.server1

# The iSCSI disk appears as /dev/sdX
lsblk
dmesg | grep -i iscsi
```

## Configure CHAP Authentication over IPv6

```bash
# /etc/iscsi/iscsid.conf (initiator side)

node.startup = automatic
node.session.auth.authmethod = CHAP
node.session.auth.username = iscsi_user
node.session.auth.password = securepassword123

# Mutual CHAP (target authenticates to initiator)
node.session.auth.username_in = target_user
node.session.auth.password_in = targetsecret456
```

```bash
# targetcli: enable CHAP on target
targetcli

/iscsi/iqn.2024-01.com.example:storage.server1/tpg1/ set attribute authentication=1
/iscsi/iqn.2024-01.com.example:storage.server1/tpg1/acls/iqn.2024-01.com.example:client1.initiator/ \
    set auth userid=iscsi_user password=securepassword123
/iscsi/iqn.2024-01.com.example:storage.server1/tpg1/acls/iqn.2024-01.com.example:client1.initiator/ \
    set auth mutual_userid=target_user mutual_password=targetsecret456
saveconfig
exit
```

## /etc/fstab for iSCSI over IPv6

```bash
# After iSCSI login, format and mount the disk
mkfs.ext4 /dev/disk/by-path/ip-2001:db8::10:3260-iscsi-iqn.2024-01.com.example:storage.server1-lun-0

# /etc/fstab entry
/dev/disk/by-path/ip-2001:db8::10:3260-iscsi-iqn.2024-01.com.example:storage.server1-lun-0   /mnt/iscsi   ext4   _netdev,defaults   0   0
```

## Verify iSCSI over IPv6

```bash
# Show active iSCSI sessions with IPv6 portals
iscsiadm -m session -P 3 | grep -E "Portal|State"

# Check iSCSI traffic over IPv6
tcpdump -i eth0 -n "ip6 and port 3260"

# Check iSCSI statistics
iscsiadm -m session -s
```

## Conclusion

iSCSI works over IPv6 by using the default `[::0]:3260` portal or replacing it with a specific IPv6 portal in targetcli, and connecting initiators with bracket-notation portal addresses (`[2001:db8::10]:3260`). Discovery, login, and CHAP authentication work identically to IPv4 iSCSI. Use `/dev/disk/by-path/` entries in `/etc/fstab` with `_netdev` to ensure iSCSI disks are mounted only after network initialization. NFSv4-style IPv6 single-port operation makes iSCSI firewall rules straightforward - only TCP port 3260 needs to be permitted.
