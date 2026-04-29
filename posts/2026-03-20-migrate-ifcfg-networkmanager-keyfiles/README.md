# How to Migrate from ifcfg Files to NetworkManager Keyfiles

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: NetworkManager, Ifcfg, Keyfile, Migration, RHEL, Linux, Network Configuration

Description: Learn how to migrate legacy ifcfg-style network configuration files to the modern NetworkManager keyfile format on RHEL/CentOS, including validation and rollback procedures.

---

Red Hat moved from ifcfg files (`/etc/sysconfig/network-scripts/`) to NetworkManager keyfiles (`.nmconnection`) starting with RHEL 9. Migrating ensures compatibility with modern tools and removes deprecated configuration.

## Understanding the Formats

**Legacy ifcfg format:**
```bash
# /etc/sysconfig/network-scripts/ifcfg-eth0

TYPE=Ethernet
BOOTPROTO=none
DEVICE=eth0
NAME=eth0
IPADDR=10.0.0.5
PREFIX=24
GATEWAY=10.0.0.1
DNS1=10.0.0.1
ONBOOT=yes
```

**Modern keyfile format:**
```ini
# /etc/NetworkManager/system-connections/eth0.nmconnection
[connection]
id=eth0
type=ethernet
interface-name=eth0
autoconnect=true

[ethernet]

[ipv4]
method=manual
address1=10.0.0.5/24
gateway=10.0.0.1
dns=10.0.0.1;

[ipv6]
method=ignore
```

## Automatic Migration with nmcli

```bash
# RHEL 9+: NetworkManager can migrate ifcfg profiles to keyfiles
# Check if migration is needed
ls /etc/sysconfig/network-scripts/ifcfg-*

# Method 1: Use nmcli to trigger migration
nmcli connection migrate

# Output:
# Connection 'eth0' (...) successfully migrated.
# Connection 'bond0' (...) successfully migrated.

# Verify migrated profiles are now stored as keyfiles
nmcli -f TYPE,FILENAME,NAME connection
```

## Manual Migration Steps

```bash
# Step 1: Show current connection config
nmcli connection show eth0

# Step 2: Generate a keyfile in offline mode
nmcli --offline connection add type ethernet con-name eth0 ifname eth0 \
  ipv4.method manual ipv4.addresses 10.0.0.5/24 ipv4.gateway 10.0.0.1 \
  ipv4.dns "10.0.0.1 8.8.8.8" ipv6.method ignore \
  > /etc/NetworkManager/system-connections/eth0.nmconnection

# Step 3: Set correct permissions
chmod 600 /etc/NetworkManager/system-connections/eth0.nmconnection

# Step 4: Reload NM to pick up new file
nmcli connection reload

# Step 5: Verify new connection is loaded
nmcli connection show eth0
```

## Disabling ifcfg Plugin

```bash
# /etc/NetworkManager/NetworkManager.conf
[main]
plugins=keyfile    # Remove ifcfg-rh from this line

# Reload NM
systemctl restart NetworkManager
```

## Validating After Migration

```bash
# Verify all connections are still present
nmcli connection show

# Test connectivity
nmcli connection up eth0
ping 10.0.0.1

# Check no errors in NM logs
journalctl -u NetworkManager | grep -E "error|warn" | tail -20
```

## Rollback Procedure

```bash
# If migration causes issues, restore ifcfg support
# /etc/NetworkManager/NetworkManager.conf
[main]
plugins=ifcfg-rh,keyfile

# Restart NM after changing the plugin list
systemctl restart NetworkManager

# Migrate the profile back to ifcfg-rh format
nmcli connection migrate --plugin ifcfg-rh eth0
```

## Key Takeaways

- RHEL 9+ uses keyfiles by default; use `nmcli connection migrate` to auto-convert ifcfg files.
- Keyfiles use INI format and are stored in `/etc/NetworkManager/system-connections/`.
- Set `chmod 600` on keyfiles - NM refuses to load world-readable connection files containing passwords.
- Keep the `ifcfg-rh` plugin in `NetworkManager.conf` during migration as a fallback until all files are converted.
