# How to Set Up the Datadog Agent for Infrastructure Monitoring on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Monitoring, Linux

Description: Step-by-step guide on set up the datadog agent for infrastructure monitoring using Red Hat Enterprise Linux 9.

---

The Datadog Agent collects system metrics from your RHEL servers and sends them to the Datadog platform for visualization and alerting. With additional configuration, it can also collect logs, traces, and process data.

## Prerequisites

- RHEL with a valid subscription or CentOS Stream 9
- A Datadog account and API key
- Root or sudo access
- A terminal session

## Step 1: Install the Datadog Agent

Run the Agent 7 installation script with your Datadog API key:

```bash
DD_API_KEY="<DATADOG_API_KEY>" DD_SITE="datadoghq.com" bash -c "$(curl -L https://install.datadoghq.com/scripts/install_script_agent7.sh)"
```

Use the Datadog site for your organization, such as `datadoghq.com`, `datadoghq.eu`, or `ddog-gov.com`.

## Step 2: Configure the Agent

Edit the configuration file to match your environment:

```bash
sudo vi /etc/datadog-agent/datadog.yaml
```

Adjust the settings according to your requirements. Key parameters to configure include `api_key`, `site`, `tags`, and optional features such as `logs_enabled`.

```bash
# Restart the service to apply changes
sudo systemctl restart datadog-agent
```

## Step 3: Enable and Start the Agent

```bash
# Enable the service to start on boot
sudo systemctl enable datadog-agent

# Start the service
sudo systemctl start datadog-agent

# Check the status
sudo systemctl status datadog-agent
```


## Verification

Confirm everything is working by checking the status and logs:

```bash
# Check the Agent status page
sudo datadog-agent status

# Review recent logs
journalctl -u datadog-agent --no-pager -n 20
```

## Troubleshooting

- If the Agent fails to start, check the logs with `journalctl -u datadog-agent -e --no-pager`.
- Ensure the Agent package is installed: `rpm -qa | grep datadog-agent`.

## Conclusion

You have successfully completed the setup described in this guide. Remember to monitor the service and review logs regularly to catch issues early. For production environments, always test changes in a staging environment first and keep your RHEL system updated with the latest security patches.
