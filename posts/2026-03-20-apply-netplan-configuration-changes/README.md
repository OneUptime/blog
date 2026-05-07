# How to Apply Netplan Configuration Changes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linux, Netplan, Ubuntu, Networking, Configuration

Description: Apply Netplan network configuration changes using netplan apply, netplan try, and netplan generate, understanding the difference between each command.

## Introduction

After modifying `.yaml` files in `/etc/netplan/`, you must apply the changes to make them active. Netplan provides three main commands: `netplan generate` (validates and generates backend configs), `netplan apply` (applies immediately), and `netplan try` (applies with auto-revert).

## Apply Changes Immediately

```bash
# Apply all Netplan configurations immediately

netplan apply

# Verify changes took effect
ip addr show
ip route show
```

## Using netplan try (Recommended for Remote Servers)

```bash
# Apply with the default 120-second timeout
# If you don't confirm, Netplan attempts to auto-revert
netplan try

# You'll see:
# "Do you want to keep these settings?
# Press ENTER before the timeout to accept the new configuration"
```

This is safer for remote SSH sessions - if the new config breaks connectivity, Netplan attempts to restore the old config after 120 seconds if you do not confirm. Because `netplan try` has known rollback bugs, verify that the rollback actually happened.

## Generate Backend Config Without Applying

```bash
# Validate YAML and generate backend config files (no apply)
netplan generate

# Generated files go under /run/, such as /run/systemd/network/ or
# /run/NetworkManager/system-connections/
# For example, inspect systemd-networkd output:
ls /run/systemd/network/
```

## Validate YAML Before Applying

```bash
# Check for syntax errors
netplan generate 2>&1

# A clean validation produces no output (exit code 0)
echo $?
```

## Apply with Verbose Output

```bash
# See what netplan is doing during apply
netplan apply --debug

# Or
netplan --debug apply
```

## Apply Only Specific Configuration File

```bash
# Netplan merges all files in /lib/netplan/, /etc/netplan/, and /run/netplan/
# Files with different names are processed in lexicographical order

# netplan apply works on the merged configuration, not a single file
# For temporary testing of an extra file, use:
netplan try --config-file ./test.yaml
```

## Reload vs Apply

```bash
# netplan apply: regenerate backend config from Netplan YAML and apply it
netplan apply

# networkctl reload: systemd-networkd only; reloads existing .network/.netdev files
# It does not regenerate them from Netplan YAML
networkctl reload
```

## Check Netplan Version

```bash
# On Ubuntu/Debian, check the installed netplan.io package version
dpkg-query -W netplan.io
```

## Common Apply Issues

```bash
# Issue: YAML syntax error
netplan generate
# Output shows line/column of error

# Issue: Changes not taking effect
# Check which backend is in use
grep -R "renderer:" /etc/netplan/

# If no renderer is set, Netplan defaults to networkd (systemd-networkd)
# renderer: NetworkManager uses the NetworkManager backend
```

## Conclusion

Use `netplan try` for safe interactive testing (it attempts to auto-revert if you don't confirm), `netplan apply` for scripted/immediate application, and `netplan generate` for validation without applying. After applying, verify with `ip addr`, `ip route`, and `ping` to confirm the configuration is working.
