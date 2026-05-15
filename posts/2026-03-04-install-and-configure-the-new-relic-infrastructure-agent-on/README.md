# How to Install and Configure the New Relic Infrastructure Agent on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Monitoring, Linux

Description: Step-by-step guide on install and configure the new relic infrastructure agent using Red Hat Enterprise Linux 9.

---

The New Relic Infrastructure Agent monitors system health metrics on RHEL and sends them to New Relic's observability platform for analysis, alerting, and dashboarding.

## Prerequisites

- RHEL with a valid subscription or CentOS Stream 9
- Root or sudo access
- A terminal session
- A valid New Relic license key

## Step 1: Install Required Packages

```bash
# Update the system first
sudo dnf update -y

# Add the New Relic infrastructure agent repository for RHEL 9
sudo curl -o /etc/yum.repos.d/newrelic-infra.repo https://download.newrelic.com/infrastructure_agent/linux/yum/el/9/x86_64/newrelic-infra.repo

# Refresh the New Relic repository metadata
sudo yum -q makecache -y --disablerepo='*' --enablerepo='newrelic-infra'

# Install the infrastructure agent
sudo dnf install -y newrelic-infra
```

## Step 2: Configure the Service

Edit the configuration file to match your environment:

```bash
# Open the configuration file
sudo vi /etc/newrelic-infra.yml
```

Add your New Relic license key and adjust the settings according to your requirements. Key parameters to configure include `license_key`, `display_name`, `custom_attributes`, and logging options.

```yaml
license_key: YOUR_LICENSE_KEY
display_name: rhel-9-host
custom_attributes:
  label.environment: production
```

```bash
# Restart the service to apply changes
sudo systemctl restart newrelic-infra
```

## Step 3: Enable and Start the Service

```bash
# Enable the service to start on boot
sudo systemctl enable newrelic-infra

# Start the service
sudo systemctl start newrelic-infra

# Check the status
sudo systemctl status newrelic-infra
```


## Verification

Confirm everything is working by checking the status and logs:

```bash
# Check the service status
sudo systemctl status newrelic-infra

# Review recent logs
journalctl -u newrelic-infra --no-pager -n 20
```

## Troubleshooting

- If the service fails to start, check the logs with `journalctl -u newrelic-infra -e --no-pager`.
- Ensure the required package is installed: `rpm -qa | grep newrelic-infra`.

## Conclusion

You have successfully completed the setup described in this guide. Remember to monitor the service and review logs regularly to catch issues early. For production environments, always test changes in a staging environment first and keep your RHEL system updated with the latest security patches.
