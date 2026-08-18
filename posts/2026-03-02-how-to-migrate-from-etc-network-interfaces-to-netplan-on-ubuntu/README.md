# How to Migrate from /etc/network/interfaces to Netplan on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Netplan, Networking, Migration, Configuration

Description: A practical guide to migrating network configuration from the legacy /etc/network/interfaces format to Netplan on Ubuntu 18.04 and later.

---

Ubuntu switched from `/etc/network/interfaces` to Netplan starting with Ubuntu 17.10. If you have older servers that were upgraded rather than freshly installed, or if you set up networking manually using the legacy format, you will eventually need to migrate. This guide covers the translation from common `interfaces` configurations to their Netplan equivalents. If the server is remote, read [Performing the Migration](#performing-the-migration) before you touch anything - the order of those steps is what keeps you from locking yourself out.

## Why Migrate

Staying on `/etc/network/interfaces` works - Ubuntu still supports it through `ifupdown` - but it is unsupported and will be removed in future releases. Netplan also integrates better with `systemd-networkd` and `cloud-init`, which makes managing Ubuntu servers at scale more consistent.

## Check Your Current Setup

Before touching anything:

```bash
# Check what is currently managing networking

systemctl status networking
systemctl status systemd-networkd
systemctl status NetworkManager

# View the current interfaces file
cat /etc/network/interfaces
ls /etc/network/interfaces.d/
```

Also check if Netplan is already installed and has configuration files:

```bash
ls /etc/netplan/
netplan --version
```

## Backup First

```bash
# Back up all network configuration
sudo cp /etc/network/interfaces /etc/network/interfaces.backup
sudo cp -r /etc/network/interfaces.d/ /etc/network/interfaces.d.backup/
sudo cp -r /etc/netplan/ /etc/netplan.backup/ 2>/dev/null || true
```

## Migration Examples

### Simple DHCP Interface

Old `interfaces` format:

```bash
# /etc/network/interfaces
auto lo
iface lo inet loopback

auto eth0
iface eth0 inet dhcp
```

Netplan equivalent:

```yaml
# /etc/netplan/01-network.yaml
network:
  version: 2
  renderer: networkd
  ethernets:
    lo:
      addresses: [127.0.0.1/8]
    eth0:
      dhcp4: true
```

Note: The loopback interface does not need explicit configuration in Netplan - it is handled automatically. You can omit the `lo` section entirely.

### Static IP Configuration

Old format:

```bash
# /etc/network/interfaces
auto eth0
iface eth0 inet static
    address 192.168.1.100
    netmask 255.255.255.0
    gateway 192.168.1.1
    dns-nameservers 9.9.9.9 149.112.112.112
    dns-search example.com
```

Netplan equivalent:

```yaml
# /etc/netplan/01-network.yaml
network:
  version: 2
  renderer: networkd
  ethernets:
    eth0:
      dhcp4: false
      addresses:
        - 192.168.1.100/24    # Note: CIDR notation, not separate netmask
      routes:
        - to: default
          via: 192.168.1.1
      nameservers:
        addresses: [9.9.9.9, 149.112.112.112]
        search: [example.com]
```

Key differences:
- Netplan uses CIDR notation (`192.168.1.100/24`) not `address` + `netmask`
- The gateway is specified as a route with `to: default`
- DNS is under `nameservers`

### Multiple IP Addresses

Old format:

```bash
auto eth0
iface eth0 inet static
    address 192.168.1.100
    netmask 255.255.255.0
    gateway 192.168.1.1

auto eth0:1
iface eth0:1 inet static
    address 192.168.1.101
    netmask 255.255.255.0
```

Netplan equivalent (no virtual interfaces needed):

```yaml
network:
  version: 2
  renderer: networkd
  ethernets:
    eth0:
      dhcp4: false
      addresses:
        - 192.168.1.100/24
        - 192.168.1.101/24    # Multiple addresses on same interface
      routes:
        - to: default
          via: 192.168.1.1
```

### Static Route

Old format:

```bash
auto eth0
iface eth0 inet static
    address 192.168.1.100
    netmask 255.255.255.0
    gateway 192.168.1.1
    up ip route add 10.0.0.0/8 via 192.168.1.254 dev eth0
    down ip route del 10.0.0.0/8 via 192.168.1.254 dev eth0
```

Netplan equivalent:

```yaml
network:
  version: 2
  renderer: networkd
  ethernets:
    eth0:
      dhcp4: false
      addresses: [192.168.1.100/24]
      routes:
        - to: default
          via: 192.168.1.1
        - to: 10.0.0.0/8
          via: 192.168.1.254
```

### VLAN Interface

Old format:

```bash
auto eth0.100
iface eth0.100 inet static
    address 192.168.100.1
    netmask 255.255.255.0
    vlan-raw-device eth0
```

Netplan equivalent:

```yaml
network:
  version: 2
  renderer: networkd
  ethernets:
    eth0:
      dhcp4: false
  vlans:
    eth0.100:
      id: 100
      link: eth0
      addresses: [192.168.100.1/24]
```

### Bridge Configuration

Old format:

```bash
auto br0
iface br0 inet static
    address 192.168.1.100
    netmask 255.255.255.0
    gateway 192.168.1.1
    bridge_ports eth0
    bridge_stp on
    bridge_fd 0
```

Netplan equivalent:

```yaml
network:
  version: 2
  renderer: networkd
  ethernets:
    eth0:
      dhcp4: false
  bridges:
    br0:
      interfaces: [eth0]
      dhcp4: false
      addresses: [192.168.1.100/24]
      routes:
        - to: default
          via: 192.168.1.1
      parameters:
        stp: true
        forward-delay: 0
```

### Bonding/Link Aggregation

Old format:

```bash
auto bond0
iface bond0 inet static
    address 192.168.1.100
    netmask 255.255.255.0
    gateway 192.168.1.1
    bond-slaves eth0 eth1
    bond-mode active-backup
    bond-miimon 100
    bond-primary eth0
```

Netplan equivalent:

```yaml
network:
  version: 2
  renderer: networkd
  ethernets:
    eth0:
      dhcp4: false
    eth1:
      dhcp4: false
  bonds:
    bond0:
      interfaces: [eth0, eth1]
      addresses: [192.168.1.100/24]
      routes:
        - to: default
          via: 192.168.1.1
      parameters:
        mode: active-backup
        primary: eth0
        mii-monitor-interval: 100
```

## Performing the Migration

Every step below touches the interface your SSH session runs over, so the order matters. The sequence keeps the working `ifupdown` configuration in place as a fallback until Netplan has proven itself on the live system.

The one thing never to do remotely is stop the old networking service before Netplan is up. `networking.service` ships with `ExecStop=/sbin/ifdown -a --read-environment --exclude=lo`, so `systemctl stop networking` tears down every interface except loopback - including the one carrying your session.

### Step 0: Arrange Out-of-Band Access

Before you start, make sure you have a way back in that does not depend on the network you are about to reconfigure:

- A cloud provider serial console or web console
- IPMI / iDRAC / iLO on physical hardware
- Someone who can walk up to the machine

If you have none of these, the timed rollback in Step 4 is what stands in for a console. Do not skip it.

### Step 1: Write the Netplan Configuration

Create the Netplan file based on your translation:

```bash
sudo nano /etc/netplan/01-network.yaml
```

Netplan ships a converter that can give you a first draft from an existing `interfaces` file. It is a testing command, hidden unless test commands are enabled, and it refuses anything it does not understand (`pointopoint`, `metric`, `mapping` stanzas, and similar), so review the output rather than trusting it:

```bash
# Print the converted YAML without changing any files
sudo env ENABLE_TEST_COMMANDS=1 netplan migrate --dry-run
```

Writing the file does not change the running network - nothing is applied until Step 5.

### Step 2: Validate

```bash
# Check YAML syntax and generate backend configs
sudo netplan generate
```

`netplan generate` only writes backend configuration under `/run`, so it is safe to run at any time. Fix any errors before proceeding.

### Step 3: Install Required Packages

If migrating from `ifupdown` to `networkd`:

```bash
# Install netplan if not present (systemd-networkd is included with systemd)
sudo apt install netplan.io

# Enable systemd-networkd for future boots (this does not start it)
sudo systemctl enable systemd-networkd
```

Having `ifupdown` and `systemd-networkd` installed at the same time is fine for now. `ifupdown` is not a daemon - `networking.service` is a `oneshot` unit that ran once at boot and then stayed marked active - so it will not fight `networkd` over a running interface. The two only collide at the next boot, which Step 6 handles.

### Step 4: Arm a Timed Rollback (Remote Servers)

`netplan try` is a good safety net for editing an existing Netplan config, but it is a weaker one during a migration. It reverts by restoring the previous contents of `/etc/netplan` and re-applying them. On a machine that had no Netplan config at all, reverting means applying an empty config: `systemd-networkd` drops the addresses it configured, and `ifupdown` does not re-run on its own. The `netplan-try(8)` man page is explicit that after a timeout or cancellation you have to verify by hand that the network actually reverted.

A reboot is what genuinely restores the old setup, because `/etc/network/interfaces` is untouched and `networking.service` is still enabled at this point. Schedule one before you apply anything:

```bash
# In 10 minutes: move the new config aside and reboot back into ifupdown
sudo systemd-run --on-active=10min --unit=netplan-rollback \
  /bin/sh -c 'mv /etc/netplan/01-network.yaml /root/01-network.yaml.failed; systemctl reboot'
```

That creates a transient `netplan-rollback.timer`. If the migration works, you cancel it in Step 7. If you lose your session, the machine reboots itself back into the configuration it had this morning.

### Step 5: Apply the Netplan Configuration

The old service is still enabled and your rollback is armed, so this is now a recoverable step:

```bash
sudo netplan try
# Press Enter to confirm while your session is still alive
```

`netplan try` reverts after 120 seconds by default; use `--timeout` to change it.

One caveat worth knowing before you rely on it: `netplan try` refuses to run when the configuration contains a bridge or bond with any non-default parameters. It prints `reverting custom parameters for bridges and bonds is not supported` and exits. The bridge example above (`stp`, `forward-delay`) and the bond example (`mode`, `primary`, `mii-monitor-interval`) both fall in that category. For those configurations, apply directly and lean on the rollback timer instead:

```bash
sudo netplan apply
```

If you are at the console, you can go straight to `netplan apply` and skip the timer entirely.

### Step 6: Disable the Old Networking Service

Only once Netplan is applied and your session survived:

```bash
# Remove ifupdown from future boots - this does not touch the running system
sudo systemctl disable networking

# Optional: make sure nothing re-enables it
sudo systemctl mask networking
```

Use `disable`, not `stop`. `systemd-networkd` already owns the interface, so there is nothing to gain from stopping the old unit, and stopping it runs `ifdown -a` and disconnects you. Run `systemctl stop networking` only from a console.

### Step 7: Cancel the Rollback and Reboot to Verify

```bash
# Cancel the scheduled rollback
sudo systemctl stop netplan-rollback.timer
```

A reboot is the only real proof that the machine comes back on Netplan alone, so do it deliberately - during a maintenance window, with console access available:

```bash
sudo reboot
```

Once the reboot confirms everything works, you can remove the legacy stack. Keep the backups you made earlier:

```bash
sudo apt purge ifupdown
```

### Step 8: Verify

```bash
# Check interface status
ip addr show
ip route show

# Test connectivity
ping -c 3 192.168.1.1
ping -c 3 google.com

# Check DNS
resolvectl status
```

## Handling Pre/Post Scripts

The `interfaces` file supports `pre-up`, `up`, `post-up`, `pre-down`, `down`, and `post-down` hooks. Netplan does not have direct equivalents. Replace them with:

- **Systemd services** with `After=network.target`
- **Networkd dispatcher scripts** in `/etc/networkd-dispatcher/`

For example, replace `up` hook with a networkd dispatcher script:

```bash
# Create a routable-up script that runs when eth0 becomes routable
sudo mkdir -p /etc/networkd-dispatcher/routable.d/
sudo tee /etc/networkd-dispatcher/routable.d/custom-routes.sh <<'EOF'
#!/bin/bash
# Run when an interface becomes routable
[ "$IFACE" = "eth0" ] || exit 0
ip route add 10.0.0.0/8 via 192.168.1.254 dev eth0
EOF
sudo chmod +x /etc/networkd-dispatcher/routable.d/custom-routes.sh
```

Install networkd-dispatcher if needed:

```bash
sudo apt install networkd-dispatcher
```

## Rolling Back

If the migration fails, the reboot from Step 4 is the most reliable rollback: with the Netplan file moved aside and `networking.service` still enabled, the machine comes back on the old `interfaces` configuration. Backend files generated by Netplan live under `/run` and disappear on reboot on their own.

To roll back without rebooting, do it from the console:

```bash
# Move the Netplan config out of the way so it does not return on boot
sudo mv /etc/netplan/01-network.yaml /root/

# Hand the interfaces back to ifupdown
sudo systemctl disable --now systemd-networkd
sudo systemctl enable --now networking
```

Do not run that over SSH. `systemd-networkd` defaults to `KeepConfiguration=no`, so stopping it drops the addresses and routes it configured, and your connection goes away before `ifupdown` gets a chance to bring the interfaces back.

The backup of `/etc/network/interfaces` you made at the start can restore the original configuration.

Migrating network configuration is one of those tasks where careful planning and a clear rollback procedure make the difference between a routine maintenance window and a recovery incident. Test in a non-production environment first when possible.
