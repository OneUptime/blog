# How to Install and Enable fapolicyd for Application Whitelisting on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, fapolicyd, Security, Application Whitelisting, Linux

Description: Learn how to install and enable fapolicyd on RHEL to enforce application whitelisting and prevent unauthorized binaries from executing.

---

fapolicyd (File Access Policy Daemon) is a user-space application whitelisting framework included in RHEL. It controls which applications can run on your system based on trust policies, providing a strong defense against malware and unauthorized software execution.

## Installing fapolicyd

```bash
# Install fapolicyd package
sudo dnf install fapolicyd -y

# Verify the installation
rpm -q fapolicyd
```

## Enabling and Starting the Service

```bash
# Enable fapolicyd to start at boot
sudo systemctl enable fapolicyd

# Start the service
sudo systemctl start fapolicyd

# Check service status
sudo systemctl status fapolicyd
```

## Understanding the Default Configuration

The main configuration file is located at `/etc/fapolicyd/fapolicyd.conf`.

```bash
# View the current configuration
cat /etc/fapolicyd/fapolicyd.conf

# Key settings to review:
# permissive = 0    (set to 1 for testing, 0 for enforcement)
# nice_val = 14     (process priority)
# q_size = 640      (internal queue size)
# db_max_size = 50  (trust database max size in MB)
```

## Testing in Permissive Mode First

Before enforcing policies, run fapolicyd in permissive mode to identify what would be blocked.

```bash
# Edit the configuration to enable permissive mode
sudo sed -i 's/^permissive = 0/permissive = 1/' /etc/fapolicyd/fapolicyd.conf

# Restart fapolicyd to apply the change
sudo systemctl restart fapolicyd

# Monitor what would be denied in the logs
sudo journalctl -u fapolicyd --since "10 minutes ago" | grep "deny"
```

## Switching to Enforcement Mode

Once you have verified that legitimate applications are not being blocked, switch to enforcement mode.

```bash
# Disable permissive mode
sudo sed -i 's/^permissive = 1/permissive = 0/' /etc/fapolicyd/fapolicyd.conf

# Restart the service
sudo systemctl restart fapolicyd

# Verify enforcement is active
sudo fapolicyd-cli --list
```

## Checking the Trust Database

fapolicyd maintains a trust database of known-good applications.

```bash
# Update the trust database from RPM
sudo fapolicyd-cli --update

# Dump current trust entries (first 10)
sudo fapolicyd-cli --dump-db | head -20
```

Start with permissive mode in a staging environment, monitor for false positives, and then roll out enforcement to production systems.
