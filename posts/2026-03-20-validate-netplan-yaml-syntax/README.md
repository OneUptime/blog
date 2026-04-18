# How to Validate Netplan YAML Syntax Before Applying

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linux, Netplan, Ubuntu, YAML, Validation, Networking

Description: Validate Netplan YAML configuration files for syntax errors before applying changes, using netplan generate and other tools to catch mistakes early.

## Introduction

Invalid YAML or incorrect Netplan syntax can break network connectivity when applied. Always validate configuration before applying, especially on remote servers. `netplan generate` checks syntax and generates backend files without activating changes.

## Validate Using netplan generate

```bash
# Check all .yaml files in /etc/netplan/ for errors

netplan generate

# No output = valid configuration
# Exit code 0 = success, non-zero = error
echo $?
```

## Validate a Specific File

```bash
# Netplan always parses all files in /etc/netplan/ together.
# Use --debug to see verbose output and pinpoint which file caused an error.
netplan generate --debug 2>&1
```

## Check YAML Syntax with Python

```bash
# Quick YAML syntax validation (catches indentation errors)
python3 -c "import yaml; yaml.safe_load(open('/etc/netplan/01-netcfg.yaml'))"

# No output = valid YAML syntax
```

## Common YAML Mistakes

```yaml
# WRONG: Mixed tabs and spaces
network:
	version: 2   # ← tab character causes error
  ethernets:

# CORRECT: Spaces only (2-space indent is standard)
network:
  version: 2
  ethernets:
```

```yaml
# WRONG: Missing colon after key
network
  version: 2

# CORRECT
network:
  version: 2
```

```yaml
# WRONG: List item missing dash
ethernets:
  eth0:
    addresses:
      192.168.1.1/24   # ← should be a list item

# CORRECT
addresses:
  - 192.168.1.1/24
```

## View Generated Backend Files

```bash
# After netplan generate, view what would be created
ls /run/systemd/network/

# View a generated network file
cat /run/systemd/network/10-netplan-eth0.network
```

## Use netplan try for Safe Validation + Application

```bash
# Applies temporarily - auto-reverts if you don't confirm
netplan try

# If network breaks, it auto-reverts after 120 seconds
# If it works, press Enter to confirm
```

## Check File Permissions

```bash
# Netplan files must be owned by root and not world-writable
ls -la /etc/netplan/

# Fix permissions if needed
chmod 600 /etc/netplan/01-netcfg.yaml
chown root:root /etc/netplan/01-netcfg.yaml
```

## Lint with yamllint (Optional)

```bash
# Install yamllint
apt install yamllint

# Check Netplan file
yamllint /etc/netplan/01-netcfg.yaml
```

## Conclusion

Always run `netplan generate` before `netplan apply` to catch YAML and Netplan-specific syntax errors. For remote servers, use `netplan try` which auto-reverts if connectivity breaks. Ensure files are owned by root with correct permissions - Netplan rejects files with incorrect ownership.
