# How to Troubleshoot Netplan Configuration Errors on Linux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linux, Networking, Netplan, Ubuntu, Troubleshooting, Network Configuration

Description: Learn how to diagnose and fix common Netplan configuration errors on Ubuntu and other Linux systems, including YAML syntax errors, interface name mismatches, and apply failures.

## Introduction

Netplan uses YAML configuration files to define network settings. Configuration errors often result from YAML syntax mistakes, incorrect interface names, or conflicting configurations. This guide covers the most common errors and how to fix them.

## Previewing Changes Before Applying

Always use `netplan try` before `netplan apply`:

```bash
sudo netplan try
```

This applies the configuration and automatically reverts after 120 seconds unless you confirm it. If the configuration causes a connectivity loss, it will revert automatically.

## Enabling Debug Output

Get detailed output when applying:

```bash
sudo netplan --debug apply
```

This reveals the generated backend configuration (NetworkManager or systemd-networkd) and any errors in processing.

## Common Error: YAML Syntax

Netplan is strict about YAML formatting. Use spaces, never tabs.

**Wrong:**
```yaml
network:
    ethernets:
	ens3:          # TAB used here - causes error
    dhcp4: true
```

**Correct:**
```yaml
network:
  version: 2
  ethernets:
    ens3:
      dhcp4: true
```

Validate YAML syntax:

```bash
python3 -c "import yaml; yaml.safe_load(open('/etc/netplan/01-config.yaml'))" && echo "Valid"
```

## Common Error: Wrong Interface Name

Verify your interface name:

```bash
ip link show
# or

ls /sys/class/net/
```

Update your `.yaml` file to match exactly.

## Common Error: Multiple Conflicting Files

If multiple files in `/etc/netplan/` configure the same interface, conflicts occur:

```bash
ls -la /etc/netplan/
```

Files are processed in alphabetical order. Rename or remove conflicting files:

```bash
sudo rm /etc/netplan/00-installer-config.yaml
```

## Common Error: Backend Not Running

If systemd-networkd is not running:

```bash
sudo systemctl enable --now systemd-networkd
sudo netplan apply
```

## Checking Generated Configuration

View what Netplan generates for the backend:

```bash
sudo netplan --debug generate
cat /run/systemd/network/*.network 2>/dev/null
```

## Recovering After a Bad Apply

If you lost connectivity after `netplan apply` (not using `try`):

Access the console (cloud provider web console or physical console) and:

```bash
# Revert to DHCP temporarily
sudo ip addr flush dev ens3
sudo dhclient ens3
```

Then fix the Netplan configuration and re-apply.

## Viewing Network Status

```bash
networkctl status
networkctl list
ip -4 addr show
```

## Conclusion

Most Netplan errors stem from YAML formatting mistakes or wrong interface names. Using `netplan try` before `netplan apply` and enabling debug output with `--debug` quickly identifies and resolves configuration problems without risking permanent connectivity loss.
