# How to Configure Fluentd for Multi-Destination Log Forwarding on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Logging, Linux

Description: Step-by-step guide on configure fluentd for multi-destination log forwarding using Red Hat Enterprise Linux 9.

---

Fluentd can route logs to multiple destinations simultaneously, such as Elasticsearch for search, S3 for archival, and a SIEM for security analysis. This flexibility makes it a popular choice for complex logging architectures.

## Prerequisites

- RHEL with a valid subscription or CentOS Stream 9
- Fluent Package installed
- Root or sudo access
- A terminal session

## Step 1: Configure Fluentd

Edit the configuration file to match your environment:

```bash
# Open the configuration file

sudo vi /etc/fluent/fluentd.conf
```

Adjust the settings according to your requirements. The `copy` output plugin sends the same events to multiple destinations. This example accepts Fluentd forward protocol traffic and writes each event to both a local archive file and a second Fluentd collector:

```apacheconf
<source>
  @type forward
  port 24224
  bind 0.0.0.0
</source>

<match app.**>
  @type copy

  <store>
    @type file
    path /var/log/fluent/app
    <buffer tag,time>
      @type file
      path /var/log/fluent/buffer/app-file
      timekey 1d
      timekey_wait 10m
      timekey_use_utc true
    </buffer>
    <format>
      @type json
    </format>
  </store>

  <store>
    @type forward
    <server>
      host log-collector.example.com
      port 24224
    </server>
    <buffer>
      @type file
      path /var/log/fluent/buffer/app-forward
    </buffer>
  </store>
</match>
```

Check the configuration before restarting Fluentd:

```bash
sudo /opt/fluent/bin/fluentd --dry-run -c /etc/fluent/fluentd.conf
```

```bash
# Restart the service to apply changes
sudo systemctl restart fluentd.service
```

## Step 2: Enable and Start the Service

```bash
# Enable the service to start on boot
sudo systemctl enable fluentd.service

# Start the service
sudo systemctl start fluentd.service

# Check the status
sudo systemctl status fluentd.service
```


## Verification

Confirm everything is working by checking the status and logs:

```bash
# Check the service status
sudo systemctl status fluentd.service

# Review recent logs
journalctl -u fluentd.service --no-pager -n 20
```

## Troubleshooting

- If the service fails to start, check the logs with `journalctl -u fluentd.service -e --no-pager`.
- Ensure the Fluent Package is installed: `rpm -qa | grep fluent-package`.

## Conclusion

You have successfully completed the setup described in this guide. Remember to monitor the service and review logs regularly to catch issues early. For production environments, always test changes in a staging environment first and keep your RHEL system updated with the latest security patches.
