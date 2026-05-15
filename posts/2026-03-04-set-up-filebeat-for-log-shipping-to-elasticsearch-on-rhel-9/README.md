# How to Set Up Filebeat for Log Shipping to Elasticsearch on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Logging, ELK Stack, Linux

Description: Step-by-step guide on set up filebeat for log shipping to elasticsearch using Red Hat Enterprise Linux 9.

---

Setting up Filebeat for Log Shipping to Elasticsearch on RHEL requires proper planning and configuration. This guide walks through each step from configuration to verification.

## Prerequisites

- RHEL with a valid subscription or CentOS Stream 9
- Root or sudo access
- A terminal session
- Filebeat installed from the Elastic RPM package or YUM repository
- Access to an Elasticsearch endpoint and credentials or an API key

## Step 2: Configure Filebeat

Edit the configuration file to match your environment:

```bash
# Open the configuration file

sudo vi /etc/filebeat/filebeat.yml
```

Adjust the settings according to your requirements. Key parameters to configure include the log input paths, the Elasticsearch endpoint, authentication settings, and logging options.

```yaml
filebeat.inputs:
- type: filestream
  id: rhel-system-logs
  enabled: true
  paths:
    - /var/log/*.log

output.elasticsearch:
  hosts: ["https://elasticsearch.example.com:9200"]
  api_key: "YOUR_API_KEY"
```

```bash
# Test the configuration
sudo filebeat test config -e

# Test the Elasticsearch output
sudo filebeat test output -e

# Restart Filebeat to apply changes
sudo systemctl restart filebeat
```

## Step 3: Enable and Start the Service

```bash
# Enable the service to start on boot
sudo systemctl enable filebeat

# Start the service
sudo systemctl start filebeat

# Check the status
sudo systemctl status filebeat
```


## Verification

Confirm everything is working by checking the status and logs:

```bash
# Check the service status
sudo systemctl status filebeat

# Review recent logs
journalctl -u filebeat.service --no-pager -n 20
```

## Troubleshooting

- If Filebeat fails to start, check the logs with `journalctl -u filebeat.service -e --no-pager`.
- Ensure the Filebeat package is installed: `rpm -q filebeat`.

## Conclusion

You have successfully completed the setup described in this guide. Remember to monitor the service and review logs regularly to catch issues early. For production environments, always test changes in a staging environment first and keep your RHEL system updated with the latest security patches.
