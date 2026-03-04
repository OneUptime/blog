# How to Set Up Red Hat Insights for Proactive System Monitoring on RHEL 9

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Linux, Red Hat Insights, Monitoring

Description: Step-by-step guide on set up red hat insights for proactive system monitoring on rhel 9 with practical examples and commands.

---

Red Hat Insights provides proactive system monitoring, vulnerability detection, and remediation recommendations for RHEL 9.

## Install the Insights Client

```bash
sudo dnf install -y insights-client
```

## Register with Insights

```bash
sudo insights-client --register
```

## Verify Registration

```bash
sudo insights-client --status
```

## Run an Initial Scan

```bash
sudo insights-client
```

## View Results

Access the Red Hat Insights dashboard at https://console.redhat.com/insights/. Your system will appear with recommendations for:

- Security vulnerabilities (CVEs)
- Configuration issues
- Performance recommendations
- Availability risks

## Configure Automatic Updates

The insights-client runs daily by default via a systemd timer:

```bash
sudo systemctl status insights-client.timer
```

## Apply Remediation Playbooks

Insights generates Ansible playbooks for remediation:

```bash
# Download a remediation playbook from the console
# Then apply it
ansible-playbook remediation-playbook.yml
```

## Use the rhc Client

The remote host configuration client provides additional capabilities:

```bash
sudo dnf install -y rhc rhc-worker-playbook
sudo rhc connect
```

## Tag Systems for Organization

```bash
sudo tee /etc/insights-client/tags.yaml <<EOF
group: production
environment: datacenter-east
application: web-tier
EOF

sudo insights-client
```

## Compliance Scanning

Insights includes OpenSCAP-based compliance scanning:

```bash
sudo insights-client --compliance
```

## Conclusion

Red Hat Insights gives you proactive visibility into RHEL 9 system health, security, and compliance. Register all systems and use the remediation playbooks to address issues efficiently.

