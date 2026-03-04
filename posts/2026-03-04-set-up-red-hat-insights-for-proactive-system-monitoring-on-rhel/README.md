# How to Set Up Red Hat Insights for Proactive System Monitoring on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Red Hat Insights, Monitoring, Security, Compliance

Description: Register your RHEL systems with Red Hat Insights to get proactive risk assessment, security advisories, and configuration recommendations.

---

Red Hat Insights is a SaaS-based analysis service included with every RHEL subscription. It analyzes system configuration data and provides recommendations for security, performance, availability, and stability.

## Install and Register the Insights Client

```bash
# Install the insights client (usually pre-installed on RHEL 9)
sudo dnf install -y insights-client

# Register the system with Red Hat Insights
sudo insights-client --register

# The client collects system data and uploads it to Red Hat
# Output shows: Successfully registered host <hostname>
```

## Verify Registration

```bash
# Check the registration status
sudo insights-client --status

# View the system ID
sudo insights-client --display-name

# Set a custom display name
sudo insights-client --display-name="prod-web-01"
```

## View Recommendations

After registration, visit the Insights dashboard:

```
https://console.redhat.com/insights/
```

You can also check from the command line:

```bash
# Run an immediate check and upload
sudo insights-client --check-results

# View the compliance report
sudo insights-client --compliance
```

## Configure Automatic Collection

The insights-client runs daily via a systemd timer:

```bash
# Check the timer status
sudo systemctl status insights-client.timer

# View the schedule
sudo systemctl list-timers | grep insights

# Trigger an immediate collection
sudo insights-client
```

## Configure What Data is Collected

You can control what data Insights collects:

```bash
# View the current collection configuration
cat /etc/insights-client/insights-client.conf

# To remove specific data from collection, use the remove.conf file
sudo vi /etc/insights-client/remove.conf
```

Example remove.conf:

```ini
# /etc/insights-client/remove.conf
[remove]
# Remove hostname from collection
commands=/bin/hostname

# Remove specific files from collection
files=/etc/hosts
```

```bash
# Verify what will be collected before uploading
sudo insights-client --no-upload --keep-archive
# The archive location will be printed - inspect its contents
```

## Remediate Issues with Ansible

Insights can generate Ansible playbooks to fix detected issues:

```bash
# Download remediation playbooks from the Insights web UI
# Then run them against affected hosts
ansible-playbook -i inventory insights-remediation.yml
```

Insights identifies risks before they cause outages, making it a valuable tool for both security and operations teams.
