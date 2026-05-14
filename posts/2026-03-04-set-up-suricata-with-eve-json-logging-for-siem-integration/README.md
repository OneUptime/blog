# How to Set Up Suricata with EVE JSON Logging for SIEM Integration on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Suricata, IDS, SIEM, Linux

Description: Learn how to set Up Suricata with EVE JSON Logging for SIEM Integration on RHEL with step-by-step instructions, configuration examples, and best practices.

---

This guide covers how to Set Up Suricata with EVE JSON Logging for SIEM Integration on RHEL. Following these steps will help you set up a reliable configuration on RHEL.

## Prerequisites

- RHEL with a minimal or standard installation
- Root or sudo access
- A stable network connection

## Overview

Set Up Suricata with EVE JSON Logging for SIEM Integration requires careful planning and execution. This guide walks through the complete process from installation to verification.

## Step 1: Prepare the System

Update your system to ensure all packages are current:

```bash
sudo dnf update -y
```

Install any required dependencies:

```bash
sudo dnf install -y epel-release dnf-plugins-core
sudo dnf copr enable @oisf/suricata-8.0
```

## Step 2: Install Required Packages

```bash
sudo dnf install -y suricata
```

Verify the installation:

```bash
rpm -qi suricata
suricata --build-info
```

## Step 3: Configure the Service

Create or edit the main configuration file:

```bash
sudo vi /etc/suricata/suricata.yaml
```

Enable EVE JSON output in the `outputs` section:

```yaml
outputs:
  - eve-log:
      enabled: yes
      filetype: regular
      filename: eve.json
      types:
        - alert
        - http
        - dns
        - tls
        - flow
```

The RPM package stores logs in `/var/log/suricata`, so the EVE file is written to `/var/log/suricata/eve.json` when `default-log-dir` keeps its packaged default. Configure the capture interface in `/etc/sysconfig/suricata`:

```bash
sudo vi /etc/sysconfig/suricata
```

For example, to capture on `eth0`:

```bash
OPTIONS="--af-packet=eth0 --user=suricata"
```

## Step 4: Start and Enable the Service

```bash
sudo suricata-update
sudo systemctl enable --now suricata
sudo systemctl status suricata
```

## Step 5: Verify the Configuration

Test the setup:

```bash
sudo suricata -T -c /etc/suricata/suricata.yaml
```

Check the logs for any errors:

```bash
sudo journalctl -u suricata -f
sudo tail -f /var/log/suricata/eve.json
```

## Step 6: Configure Firewall Rules

Suricata in passive IDS mode captures packets from an interface and does not require an inbound firewalld service rule. If you forward EVE logs to a SIEM over syslog, allow the SIEM destination port from your log shipper or syslog service as appropriate:

```bash
sudo firewall-cmd --permanent --add-port=6514/tcp
sudo firewall-cmd --reload
```

## Step 7: Performance Tuning

Monitor resource usage and adjust configuration parameters based on your workload:

```bash
systemctl show suricata --property=MemoryCurrent
top -p $(pidof suricata)
```

## Security Considerations

- Run the service with a dedicated non-root user when possible
- Enable TLS/SSL for network communication
- Restrict access with firewall rules
- Keep packages updated with `dnf update`

## Troubleshooting

Common issues and solutions:

1. **Service fails to start**: Check `journalctl -u suricata -xe` for error messages
2. **Permission denied**: Verify file ownership and SELinux contexts with `ls -laZ`
3. **Port conflicts**: Use `ss -tlnp` to identify processes using the port

## Conclusion

You have successfully configured set up suricata with eve json logging for siem integration on RHEL. Monitor the service regularly and keep it updated to maintain security and performance.
