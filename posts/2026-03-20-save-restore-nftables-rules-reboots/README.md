# How to Save and Restore nftables Rules Across Reboots

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: nftables, Linux, Firewall, Persistence, Systemd, Networking

Description: Persist nftables firewall rules across reboots by saving the ruleset to a configuration file and enabling the nftables systemd service.

## Introduction

Rules added with `nft add rule` are stored in memory and lost on reboot. To make your firewall persistent, you need to save the ruleset to a file and configure the system to reload it automatically at boot. nftables integrates with systemd for this purpose.

## Prerequisites

- nftables installed
- systemd-based Linux distribution
- Root access

## Save the Current Ruleset

The `nft list ruleset` command dumps the complete current ruleset in a format that can be reloaded with `nft -f`.

```bash
# Save the entire current ruleset to the Debian/Ubuntu default nftables config file
{
    printf 'flush ruleset\n'
    nft list ruleset
} > /etc/nftables.conf
```

Verify the saved file:

```bash
cat /etc/nftables.conf
```

## Enable the nftables systemd Service

On Debian/Ubuntu and many other distributions, the `nftables.service` unit reads `/etc/nftables.conf` at boot and applies the ruleset. Check your distribution's unit with `systemctl cat nftables` if it uses a different path.

```bash
# Enable nftables to start at boot
systemctl enable nftables

# Start it now (if not already running)
systemctl start nftables

# Check status
systemctl status nftables
```

## The nftables Configuration File Format

The configuration file uses the same nft script syntax. Ensure it starts with a `flush ruleset` to clear any existing rules before applying:

```bash
#!/usr/sbin/nft -f

# Clear existing rules before loading
flush ruleset

table inet filter {
    chain input {
        type filter hook input priority 0; policy drop;

        iif lo accept
        ct state established,related accept
        ct state invalid drop

        tcp dport 22 accept
        tcp dport { 80, 443 } accept
    }

    chain forward {
        type filter hook forward priority 0; policy drop;
    }

    chain output {
        type filter hook output priority 0; policy accept;
    }
}
```

## Reload Rules Without Reboot

After editing `/etc/nftables.conf`, reload the rules if your unit supports reload:

```bash
# Reload nftables rules from the config file
systemctl reload nftables

# Or apply directly with nft
nft -f /etc/nftables.conf
```

## Validate the Config File Before Applying

To test syntax without actually applying the rules:

```bash
# Dry-run: check syntax only
nft --check -f /etc/nftables.conf
```

## Save with Atomic Replacement

For safety, write to a temporary file and move it into place:

```bash
# Save atomically
tmpfile=$(mktemp /etc/nftables.conf.XXXXXX) && \
    { printf 'flush ruleset\n'; nft list ruleset; } > "$tmpfile" && \
    mv "$tmpfile" /etc/nftables.conf && \
    echo "Ruleset saved successfully"
```

## Debian/Ubuntu-Specific Notes

On Debian/Ubuntu systems, `/etc/nftables.conf` is the usual default. If you are not sure which file your package uses, check the service unit:

```bash
# Check the service unit file
systemctl cat nftables

# On Debian/Ubuntu, install the service with the nftables package
apt install nftables
```

## Conclusion

Persisting nftables rules requires two steps: saving the ruleset with a leading `flush ruleset` in `/etc/nftables.conf` and enabling the nftables systemd service. The service reloads rules from the file at every boot, ensuring your firewall is always active. Always validate the config file syntax before applying changes to production systems.
