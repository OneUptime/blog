# How to Set Up Grafana Agent for Metrics and Logs Shipping on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Monitoring, Linux

Description: Step-by-step guide on set up grafana agent for metrics and logs shipping using Red Hat Enterprise Linux 9.

---

Grafana Agent has reached end-of-life. Grafana Alloy is the recommended lightweight telemetry collector for shipping metrics and logs from RHEL servers to Grafana Cloud or self-hosted Prometheus-compatible and Loki backends. It uses fewer resources than running separate Prometheus and Promtail instances.

## Prerequisites

- RHEL with a valid subscription or CentOS Stream 9
- Root or sudo access
- A terminal session

## Step 1: Install Grafana Alloy

Import the Grafana RPM repository key, add the Grafana repository, and install Alloy:

```bash
wget -q -O gpg.key https://rpm.grafana.com/gpg.key
sudo rpm --import gpg.key
echo -e '[grafana]\nname=grafana\nbaseurl=https://rpm.grafana.com\nrepo_gpgcheck=1\nenabled=1\ngpgcheck=1\ngpgkey=https://rpm.grafana.com/gpg.key\nsslverify=1\nsslcacert=/etc/pki/tls/certs/ca-bundle.crt' | sudo tee /etc/yum.repos.d/grafana.repo

sudo dnf install alloy
```

## Step 2: Configure the Service

Edit the configuration file to match your environment:

```bash
# Open the configuration file

sudo vi /etc/alloy/config.alloy
```

Adjust the settings according to your requirements. Key parameters to configure include remote write endpoints, Loki endpoints, authentication settings, and logging options. The following example collects Linux system metrics and common RHEL log files:

```alloy
prometheus.exporter.unix "node" {}

prometheus.scrape "node" {
  targets    = prometheus.exporter.unix.node.targets
  forward_to = [prometheus.remote_write.default.receiver]
}

prometheus.remote_write "default" {
  endpoint {
    url = "http://prometheus.example.com:9090/api/v1/write"
  }
}

local.file_match "system_logs" {
  path_targets = [{
    __path__ = "/var/log/{messages,*.log}",
    job      = "rhel/system",
  }]
}

loki.source.file "system_logs" {
  targets    = local.file_match.system_logs.targets
  forward_to = [loki.write.default.receiver]
}

loki.write "default" {
  endpoint {
    url = "http://loki.example.com:3100/loki/api/v1/push"
  }
}
```

```bash
# Restart the service to apply changes
sudo systemctl restart alloy
```

## Step 3: Enable and Start the Service

```bash
# Enable the service to start on boot
sudo systemctl enable alloy.service

# Start the service
sudo systemctl start alloy

# Check the status
sudo systemctl status alloy
```


## Verification

Confirm everything is working by checking the status and logs:

```bash
# Check the service status
sudo systemctl status alloy

# Review recent logs
sudo journalctl -u alloy --no-pager -n 20
```

## Troubleshooting

- If the service fails to start, check the logs with `sudo journalctl -u alloy -e --no-pager`.
- Ensure all required packages are installed: `rpm -qa | grep alloy`.

## Conclusion

You have successfully completed the setup described in this guide. Remember to monitor the service and review logs regularly to catch issues early. For production environments, always test changes in a staging environment first and keep your RHEL system updated with the latest security patches.
