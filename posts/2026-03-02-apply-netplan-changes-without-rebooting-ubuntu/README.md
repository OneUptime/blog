# How to Apply Netplan Changes Without Rebooting on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Networking, Netplan, Configuration, System Administration

Description: Apply Netplan network configuration changes on Ubuntu without rebooting, using netplan apply and netplan try safely, including how to avoid getting locked out over SSH.

---

One of the operational benefits of Netplan over the older `/etc/network/interfaces` approach is that you can apply changes without rebooting. On a server you manage over SSH, this is critical - a networking mistake that drops the connection and requires a reboot means you need console access to fix it. Netplan's `try` command addresses this with an automatic rollback mechanism.

## The Three Netplan Commands

Netplan gives you three commands for managing configuration:

```bash
# 1. Generate - converts YAML to backend config files without applying
sudo netplan generate

# 2. Try - applies changes with a 120-second timeout before automatic rollback
sudo netplan try

# 3. Apply - applies changes immediately, permanently, no rollback
sudo netplan apply
```

## Understanding `netplan try`

The `try` command is the safe way to apply network changes over SSH:

```bash
sudo netplan try
```

When you run `netplan try`:
1. The new configuration is applied immediately
2. A 120-second countdown begins
3. If you press Enter before the timer expires, the changes are confirmed permanently
4. If the timer expires without confirmation (because you lost SSH access due to a bad config), the old configuration is automatically restored

```
Do you want to keep these settings?

Press ENTER before the timeout to accept the new configuration

Changes will revert in 116 seconds
```

This automatic rollback is what makes remote network configuration changes much safer.

## Workflow for Remote Configuration Changes

The safe workflow for changing network configuration over SSH:

```bash
# 1. Make a backup of the current config
sudo cp /etc/netplan/01-config.yaml /etc/netplan/01-config.yaml.bak

# 2. Edit the configuration
sudo nano /etc/netplan/01-config.yaml

# 3. Validate syntax
sudo netplan generate

# 4. Apply with rollback protection
sudo netplan try

# 5. Immediately test connectivity from the same terminal or another session
# Test before pressing Enter to confirm
ping -c 3 8.8.8.8
curl -s https://example.com > /dev/null && echo "Internet reachable"

# 6. If everything works, press Enter to confirm
# If something broke, your connection will drop and recover in <120 seconds
```

## Adjusting the Try Timeout

The default 120 seconds may not be enough time to run thorough connectivity tests. You can extend it:

```bash
# Try with a custom timeout (in seconds)
sudo netplan try --timeout 300    # 5 minutes

# For complex changes that need extensive verification
sudo netplan try --timeout 600    # 10 minutes
```

## What `netplan apply` Does

When you run `netplan apply`, it:

1. Reads all YAML files in `/etc/netplan/`
2. Merges them (files processed in lexicographic order)
3. Calls `netplan generate` to produce backend configuration files
4. Signals the backend (systemd-networkd or NetworkManager) to reload
5. For interfaces that changed, brings them down and back up with the new config

```bash
# See what netplan generate produces before applying
sudo netplan generate

# Check the generated backend configs
ls /run/systemd/network/    # for networkd backend
ls /etc/NetworkManager/system-connections/  # for NM backend

# Then apply
sudo netplan apply
```

## Partial Application

Netplan applies the entire configuration, not individual interfaces. There is no way to apply only the change to one interface. However, you can work around this:

```bash
# Restart a specific interface without applying the full Netplan config
sudo networkctl reconfigure enp3s0

# Or with ip commands
sudo ip link set enp3s0 down
sudo ip link set enp3s0 up
```

For adding a new IP address to an interface without dropping the existing one, you can use `ip` commands directly:

```bash
# Add an IP temporarily (survives until reboot or netplan apply)
sudo ip addr add 192.168.1.200/24 dev enp3s0

# Make it permanent by adding it to Netplan config and applying
```

## Handling Cloud-Init Conflicts

On cloud instances (AWS, Azure, GCP), cloud-init often manages network configuration and can overwrite your Netplan changes on reboot. After applying manual changes, disable cloud-init's network configuration:

```bash
# Disable cloud-init network management
echo "network: {config: disabled}" | \
  sudo tee /etc/cloud/cloud.cfg.d/99-disable-network-config.cfg

# Your Netplan changes will now survive reboots
```

## Verifying Changes Applied Correctly

After applying, confirm the new configuration is active:

```bash
# Check interface IPs
ip addr show

# Check routes
ip route show

# Check DNS
resolvectl status

# Test connectivity
ping -c 3 192.168.1.1    # gateway
ping -c 3 8.8.8.8         # internet by IP
ping -c 3 google.com      # DNS resolution + internet

# Check specific interface status
networkctl status enp3s0

# Confirm the network backend is healthy
sudo systemctl status systemd-networkd
```

## Rolling Back Manually

If you applied changes with `netplan apply` (no rollback) and they broke things:

```bash
# Restore from backup
sudo cp /etc/netplan/01-config.yaml.bak /etc/netplan/01-config.yaml

# Apply the backup config
sudo netplan apply

# If you can't reach the machine, you'll need console access
```

This is why keeping backups and using `netplan try` for remote changes matters. `netplan apply` with no safety net is fine for local console access, but risky over SSH.

## Debugging When Apply Fails

If `netplan apply` produces errors:

```bash
# Check for syntax errors
sudo netplan generate 2>&1

# YAML validation
sudo apt install -y yamllint
yamllint /etc/netplan/*.yaml

# Check file permissions (must be 600 or 644, owned by root)
ls -la /etc/netplan/

# Check backend logs for errors
sudo journalctl -u systemd-networkd --since "5 minutes ago"
sudo journalctl -u NetworkManager --since "5 minutes ago"

# More verbose output
sudo netplan --debug apply 2>&1
```

Common errors and fixes:

```bash
# Error: "permission denied" on a netplan file
sudo chown root:root /etc/netplan/*.yaml
sudo chmod 600 /etc/netplan/*.yaml

# Error: "invalid YAML"
# YAML is whitespace-sensitive - check indentation
# Use spaces, never tabs

# Error: "Unknown key ..."
# Check Netplan documentation for the correct key name
man netplan
# or
netplan --help
```

## Making Changes Idempotent

Since `netplan apply` restarts affected interfaces, applying the same config twice has effects (brief network interruption). For automation:

```bash
# Generate config to see if anything changed
sudo netplan generate

# Only apply if generated config differs from current backend config
# This is tricky to do precisely - usually it's fine to just apply
# and accept the brief interruption

# Alternatively, use systemd-networkd's reconfigure command
# which is gentler than a full interface restart
sudo networkctl reconfigure enp3s0
```

## Netplan and systemd-networkd Interaction

When using the networkd renderer, Netplan generates `.network` files in `/run/systemd/network/`. Changes to these files take effect when systemd-networkd is reloaded:

```bash
# After netplan generate, manually reload networkd without the full apply
sudo systemctl reload systemd-networkd

# This is gentler than netplan apply but achieves similar results
# for configuration changes that don't require interface restarts
```

Understanding the Netplan-to-backend pipeline makes troubleshooting easier. Netplan itself does not manage interfaces directly - it configures the backend (networkd or NetworkManager) which does the actual work.
