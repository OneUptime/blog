# How to Set Up OpenTelemetry Collector on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Observability, Linux

Description: Step-by-step guide on set up opentelemetry collector using Red Hat Enterprise Linux 9.

---

Setting up OpenTelemetry Collector on RHEL requires proper planning and configuration. This guide walks through each step from initial installation to verification.

## Prerequisites

- RHEL with a valid subscription or CentOS Stream 9
- Root or sudo access
- A terminal session

## Step 1: Install and Configure the Collector

Install the OpenTelemetry Collector RPM package:

```bash
# Install wget if it is not already installed
sudo yum -y install wget

# Download and install the OpenTelemetry Collector RPM for AMD64
wget https://github.com/open-telemetry/opentelemetry-collector-releases/releases/download/v0.152.0/otelcol_0.152.0_linux_amd64.rpm
sudo rpm -ivh otelcol_0.152.0_linux_amd64.rpm
```

Edit the configuration file to match your environment:

```bash
# Open the configuration file

sudo vi /etc/otelcol/config.yaml
```

Adjust the settings according to your requirements. Key parameters to configure include receivers, processors, exporters, service pipelines, authentication extensions, and logging options. A minimal local test configuration can receive OTLP data and write it to the Collector logs:

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

exporters:
  debug:
    verbosity: basic

service:
  pipelines:
    traces:
      receivers: [otlp]
      exporters: [debug]
    metrics:
      receivers: [otlp]
      exporters: [debug]
    logs:
      receivers: [otlp]
      exporters: [debug]
```

```bash
# Restart the service to apply changes
sudo systemctl restart otelcol
```

## Step 2: Enable and Start the Service

```bash
# Enable the service to start on boot
sudo systemctl enable otelcol

# Start the service
sudo systemctl start otelcol

# Check the status
sudo systemctl status otelcol
```


## Verification

Confirm everything is working by checking the status and logs:

```bash
# Check the service status
sudo systemctl status otelcol

# Review recent logs
journalctl -u otelcol --no-pager -n 20
```

## Troubleshooting

- If the service fails to start, check the logs with `journalctl -u otelcol -e --no-pager`.
- Validate the configuration before restarting with `otelcol validate --config=/etc/otelcol/config.yaml`.
- Ensure the Collector package is installed: `rpm -qa | grep otelcol`.

## Conclusion

You have successfully completed the setup described in this guide. Remember to monitor the service and review logs regularly to catch issues early. For production environments, always test changes in a staging environment first and keep your RHEL system updated with the latest security patches.
