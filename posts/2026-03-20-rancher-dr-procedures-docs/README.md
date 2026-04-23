# How to Document Rancher DR Procedures

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Disaster-recovery, Documentation, Runbook, Kubernetes

Description: Best practices for creating clear, actionable disaster recovery documentation for Rancher that teams can follow under pressure.

## Introduction

Good DR documentation is as important as the technical implementation. When a disaster occurs, your team needs clear, tested procedures they can execute quickly under stress. This guide covers how to create comprehensive DR runbooks for Rancher.

## Documentation Principles

- **Clarity**: Assume the reader is stressed and under time pressure
- **Completeness**: Include every step, even obvious ones
- **Accuracy**: Test every command before documenting it
- **Accessibility**: Store docs in multiple locations (not just in the system that failed)
- **Currency**: Review and update after every change and every drill

## DR Documentation Structure

```text
dr-documentation/
├── README.md                    # Overview and quick-start guide
├── contacts.yaml                # Emergency contacts and escalation
├── architecture.md              # System architecture diagrams
├── runbooks/
│   ├── rancher-server-failure.md
│   ├── etcd-corruption.md
│   ├── network-failure.md
│   ├── storage-failure.md
│   └── complete-site-failure.md
├── procedures/
│   ├── backup-verification.md
│   ├── restore-procedure.md
│   └── failover-procedure.md
└── post-incident/
    ├── validation-checklist.md
    └── incident-report-template.md
```

## Sample Runbook: Rancher Server Failure

````markdown
# Runbook: Rancher Server Failure

**Severity**: Critical
**RTO**: 2 hours
**Last Updated**: 2026-03-20
**Last Tested**: 2026-03-15

## Indicators
- Rancher UI inaccessible (HTTPS timeout)
- Alerts from monitoring: RancherServerDown
- kubectl commands fail for management cluster

## Prerequisites
- [ ] Access to AWS console or CLI
- [ ] S3 bucket credentials: stored in 1Password vault "DR Credentials"
- [ ] DR server SSH access: dr-rancher.example.com
- [ ] kubeconfig for DR cluster: stored in /vault/dr-cluster-kubeconfig

## Steps

### 1. Verify the Failure (5 minutes)
```bash
# Attempt to reach Rancher API

curl -I https://rancher.example.com/healthz

# Check DNS resolution
nslookup rancher.example.com

# Attempt direct server access
ssh admin@rancher-primary.example.com
```

### 2. Escalate and Notify (5 minutes)
- Call On-Call Engineer: +1-XXX-XXX-XXXX
- Post to #incidents Slack channel: "Rancher server failure detected at [TIME]"
- Open PagerDuty incident: https://your-org.pagerduty.com

### 3. Retrieve Latest Backup (10 minutes)
```bash
# SSH to DR server
ssh admin@dr-rancher.example.com

# List available backups
aws s3 ls s3://rancher-dr-backups/prod/ --recursive | sort | tail -10

# Note the latest backup filename
BACKUP_FILE="<backup-filename-from-s3-listing>.tar.gz"
```

### 4. Execute Restore (30-60 minutes)
...
````

## Emergency Contacts Template

```yaml
# contacts.yaml
emergency_contacts:
  primary_oncall:
    name: "Infrastructure On-Call"
    phone: "+1-XXX-XXX-XXXX"
    pagerduty: "https://your-org.pagerduty.com/schedules"
  
  escalation:
    - level: 1
      role: "Senior Infrastructure Engineer"
      contact: "engineer@example.com"
      response_time: "15 minutes"
    - level: 2
      role: "Infrastructure Manager"
      contact: "manager@example.com"
      response_time: "30 minutes"
    - level: 3
      role: "CTO"
      contact: "cto@example.com"
      response_time: "1 hour"
  
  external_support:
    rancher:
      url: "https://support.rancher.com"
      phone: "+1-XXX-XXX-XXXX"
      contract_id: "YOUR_CONTRACT_ID"
    aws:
      url: "https://console.aws.amazon.com/support"
      support_level: "Business"
```

## Architecture Documentation Template

```markdown
# Rancher Architecture Overview

## Production Environment
- Primary Rancher: rancher.example.com (10.0.1.100)
- Cluster: 3-node RKE2, m5.xlarge instances
- Region: us-east-1
- etcd: Embedded in RKE2

## DR Environment
- Standby Rancher: rancher-dr.example.com (10.1.1.100)
- Cluster: Single-node RKE2 (scale out on activation)
- Region: us-west-2

## Backup Configuration
- Schedule: Every 30 minutes
- Retention: 48 hours
- Storage: s3://rancher-dr-backups/prod/
- Encryption: AES-256

## Network Architecture
- Primary site: 10.0.0.0/16
- DR site: 10.1.0.0/16
- VPN: Site-to-site between primary and DR
```

## Storing Documentation

Documentation should be accessible when systems are down:

```bash
# Option 1: Store in git repository and clone to multiple locations
git clone https://github.com/your-org/rancher-dr-docs /local/dr-docs

# Option 2: Store in S3 (accessible even when Rancher is down)
aws s3 sync ./dr-docs/ s3://company-runbooks/rancher/

# Option 3: Print critical runbooks (for total outage scenarios)
# Keep printed copies in server room

# Option 4: Store in password manager (1Password, Vault)
# Good for credentials and short procedures
```

## Maintaining Documentation Currency

```bash
#!/bin/bash
# doc-review-reminder.sh - Run monthly

STATE_FILE="$HOME/.dr-docs-last-review.txt"
LAST_REVIEW=$(cat "$STATE_FILE" 2>/dev/null || echo "Never")
TODAY=$(date +%Y-%m-%d)

echo "DR Documentation Review"
echo "Last reviewed: $LAST_REVIEW"
echo ""
echo "Review checklist:"
echo "[ ] All procedures tested within last 90 days"
echo "[ ] Contact information is current"
echo "[ ] Architecture diagrams reflect current state"
echo "[ ] Backup credentials are valid"
echo "[ ] RTO/RPO targets are still appropriate"
echo "[ ] New infrastructure changes documented"

echo "$TODAY" > "$STATE_FILE"
```

## Conclusion

Clear DR documentation saves time, reduces errors, and provides confidence during stressful situations. Invest in keeping runbooks accurate, accessible, and regularly tested. The best runbook is one that a new team member can follow successfully on their first attempt.
