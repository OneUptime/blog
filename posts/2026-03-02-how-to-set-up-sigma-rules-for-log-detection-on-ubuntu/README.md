# How to Set Up Sigma Rules for Log Detection on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Sigma, Security, SIEM, Log Analysis

Description: Learn how to use Sigma rules on Ubuntu for threat detection in log files, converting rules to grep, jq, and SIEM query formats with the sigmac converter tool.

---

Sigma is an open, generic signature format for describing log events. Think of it as YARA for log files: you write a detection rule once in Sigma's format, and then convert it to run against Elasticsearch, Splunk, QRadar, Microsoft Sentinel, OpenSearch, or other supported backends. This backend-agnostic approach means your detection logic isn't locked to any particular SIEM.

This guide focuses on getting Sigma working on Ubuntu: installing the tools, writing rules, converting them to usable query formats, and integrating them with your log pipeline.

## Installing Sigma Tools

### Using sigma-cli (Modern Approach)

The modern Sigma toolchain is `sigma-cli`, which replaces the older `sigmac` tool:

```bash
# Create a Python virtual environment

sudo apt install python3-pip python3-venv
python3 -m venv /opt/sigma-venv
source /opt/sigma-venv/bin/activate

# Install sigma-cli
pip install sigma-cli

# Install backend plugins for your target systems
sigma plugin install elasticsearch
sigma plugin install splunk
sigma plugin install ibm-qradar-aql

# Install the Linux processing pipeline (used by Linux log conversions)
sigma plugin install linux

# Verify installation
sigma --version
sigma plugin list
```

### Getting the Sigma Rules Repository

```bash
# Clone the official Sigma rules repository
git clone https://github.com/SigmaHQ/sigma.git /opt/sigma-rules

# Check how many rules are available
find /opt/sigma-rules/rules -name "*.yml" | wc -l
```

The rules are organized by category under `/opt/sigma-rules/rules/`:
- `linux/` - Linux-specific detections
- `network/` - Network device logs
- `cloud/` - Cloud provider logs
- `application/` - Application logs
- `windows/` - Windows event logs

## Understanding Sigma Rule Format

A Sigma rule is a YAML file with a specific structure:

```yaml
title: Suspicious SSH Activity
id: a1b2c3d4-e5f6-7890-abcd-ef1234567890
status: experimental
description: Detects suspicious SSH authentication patterns
references:
  - https://www.example.com/ref
author: Security Team
date: 2024/01/15
tags:
  - attack.initial_access
  - attack.t1078
logsource:
  product: linux
  service: auth
detection:
  selection:
    # Match fields from the log source
    CommandLine|contains:
      - 'ssh'
    Message|contains:
      - 'Failed password'
      - 'Invalid user'
  filter_legitimate:
    # Exclude known legitimate sources
    SourceAddress: '192.168.1.0/24'
  condition: selection and not filter_legitimate
falsepositives:
  - Legitimate administrators connecting from external networks
level: medium
```

### Key Rule Components

**logsource** - Defines what type of logs this rule applies to:
```yaml
logsource:
  product: linux
  service: auth   # Maps to /var/log/auth.log
```

```yaml
logsource:
  product: linux
  service: syslog  # Maps to /var/log/syslog
```

**detection** - The matching logic using named selections and conditions:
```yaml
detection:
  selection_1:
    FieldName: 'exact match'
  selection_2:
    OtherField|contains: 'partial match'
  selection_3:
    ThirdField|endswith|all:
      - 'must have this'
      - 'and this'
  condition: selection_1 and (selection_2 or selection_3)
```

**Field modifiers** transform how matching works:
- `|contains` - Substring match
- `|startswith` - Prefix match
- `|endswith` - Suffix match
- `|re` - Regular expression
- `|contains|all` - All values must be present
- `|cidr` - CIDR network notation

## Writing Practical Sigma Rules

### Detecting Failed SSH Logins

```bash
sudo nano /opt/sigma-rules/custom/linux_ssh_bruteforce.yml
```

```yaml
title: SSH Brute Force Detection
id: c7d8e9f0-1234-5678-9abc-def012345678
status: test
description: Detects high volume of SSH authentication failures
references:
  - https://attack.mitre.org/techniques/T1110/
author: Custom Rule
date: 2026/03/02
tags:
  - attack.credential_access
  - attack.t1110
logsource:
  product: linux
  service: auth
detection:
  keywords:
    - 'Failed password'
    - 'authentication failure'
    - 'Invalid user'
  condition: keywords
level: medium
falsepositives:
  - Misconfigured services
  - Legitimate failed logins
```

### Detecting Privilege Escalation via sudo

```yaml
title: Sudo Command Execution by Non-Standard User
id: a9b8c7d6-5432-1098-fedc-ba9876543210
status: stable
description: Detects sudo usage for commands that could indicate privilege escalation
author: Custom Rule
date: 2026/03/02
tags:
  - attack.privilege_escalation
  - attack.t1548.003
logsource:
  product: linux
  service: auth
detection:
  selection:
    Message|contains:
      - 'sudo'
      - 'COMMAND=/bin/bash'
      - 'COMMAND=/usr/bin/python'
      - 'COMMAND=/usr/bin/vim'
  filter_admins:
    User: 'admin'
  condition: selection and not filter_admins
level: high
falsepositives:
  - Administrators using allowed sudo commands
```

### Detecting Suspicious Cron Jobs

```yaml
title: Cron Job Added or Modified
id: f1e2d3c4-b5a6-9780-6543-210fedcba987
status: experimental
description: Detects new or modified cron jobs which could indicate persistence
tags:
  - attack.persistence
  - attack.t1053.003
logsource:
  product: linux
  service: syslog
detection:
  selection:
    Message|contains|all:
      - 'cron'
      - 'REPLACED'
  condition: selection
level: medium
falsepositives:
  - Normal cron maintenance
  - Application installations
```

## Converting Rules to Query Formats

### Convert to Elasticsearch Query (Kibana)

```bash
source /opt/sigma-venv/bin/activate

# Convert a single rule
sigma convert \
  --target elasticsearch \
  --pipeline linux \
  /opt/sigma-rules/custom/linux_ssh_bruteforce.yml

# Convert all Linux rules
sigma convert \
  --target elasticsearch \
  --pipeline linux \
  /opt/sigma-rules/rules/linux/ \
  --output /tmp/sigma-elasticsearch-rules.json
```

### Convert to Splunk SPL

```bash
sigma convert \
  --target splunk \
  /opt/sigma-rules/custom/linux_ssh_bruteforce.yml
```

## Integrating with Elasticsearch/OpenSearch

After converting rules to Elasticsearch format, import them as detection rules or Watcher alerts:

```bash
# Convert rules to Elasticsearch format
sigma convert \
  --target elasticsearch \
  --pipeline linux \
  /opt/sigma-rules/rules/linux/ \
  --format kibana_ndjson \
  --output /tmp/kibana-rules.ndjson

# Import to Kibana (requires valid API key)
curl -X POST "https://your-kibana:5601/api/saved_objects/_import" \
  -H "kbn-xsrf: true" \
  -H "Authorization: ApiKey your-api-key" \
  --form file=@/tmp/kibana-rules.ndjson
```

## Keeping Rules Updated

```bash
# Update the Sigma rules repository
cd /opt/sigma-rules
git pull origin master

# Check for new rules in the Linux category
git log --oneline --since="1 week ago" -- rules/linux/

# Run conversion again after updates
sigma convert \
  --target elasticsearch \
  --pipeline linux \
  /opt/sigma-rules/rules/linux/ \
  --output /tmp/sigma-elasticsearch-rules.json
```

## Validating Your Custom Rules

```bash
# Validate a rule's syntax before using it
sigma check /opt/sigma-rules/custom/linux_ssh_bruteforce.yml

# Validate all custom rules
sigma check /opt/sigma-rules/custom/
```

Sigma's value comes from the shared community of rules. The SigmaHQ repository contains thousands of detection rules contributed by security researchers, and because they're backend-agnostic, you can use them with whatever log infrastructure you have - from a single Splunk index to a multi-cluster Elasticsearch deployment.
