# How to Install and Configure the Splunk Universal Forwarder on RHEL 9

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Linux, Splunk

Description: Step-by-step guide on install and configure the splunk universal forwarder on rhel 9 with practical examples and commands.

---

The Splunk Universal Forwarder sends log data from RHEL 9 servers to a Splunk deployment for centralized analysis.

## Download and Install

```bash
# Download from Splunk
wget -O splunkforwarder.rpm 'https://download.splunk.com/products/universalforwarder/releases/9.1.0/linux/splunkforwarder-9.1.0-x86_64.rpm'
sudo rpm -ivh splunkforwarder.rpm
```

## Initial Configuration

```bash
sudo /opt/splunkforwarder/bin/splunk start --accept-license --answer-yes --no-prompt \
  --seed-passwd 'YourAdminPass123!'
```

## Configure the Forward Server

```bash
sudo /opt/splunkforwarder/bin/splunk add forward-server splunk-indexer.example.com:9997 \
  -auth admin:YourAdminPass123!
```

## Add Log Sources

```bash
# Monitor system logs
sudo /opt/splunkforwarder/bin/splunk add monitor /var/log/messages -index main
sudo /opt/splunkforwarder/bin/splunk add monitor /var/log/secure -index main
sudo /opt/splunkforwarder/bin/splunk add monitor /var/log/audit/audit.log -index main
```

## Configure as a systemd Service

```bash
sudo /opt/splunkforwarder/bin/splunk enable boot-start -systemd-managed 1 -user splunkfwd
sudo systemctl start SplunkForwarder
```

## Configure Firewall

```bash
sudo firewall-cmd --permanent --add-port=9997/tcp
sudo firewall-cmd --reload
```

## Verify Data Flow

```bash
sudo /opt/splunkforwarder/bin/splunk list forward-server
sudo /opt/splunkforwarder/bin/splunk list monitor
```

## Conclusion

The Splunk Universal Forwarder on RHEL 9 provides reliable log shipping to your Splunk deployment. Configure the monitors for all relevant log files and verify data flow regularly.

