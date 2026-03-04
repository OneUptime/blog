# How to Create Custom Zabbix Templates for RHEL Services

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Zabbix, Templates, Monitoring, Customization, Linux

Description: Build custom Zabbix templates to monitor specific RHEL services, including custom items, triggers, graphs, and discovery rules.

---

Zabbix templates let you define monitoring items, triggers, and graphs once and apply them to many hosts. This guide covers creating custom templates for RHEL services.

## Create a Template via the Web Interface

1. Go to Data collection > Templates > Create template
2. Set the template name: `Custom RHEL Service Monitor`
3. Add it to a template group (e.g., `Templates/Operating systems`)
4. Save

## Add Custom Items

### Monitor a Systemd Service

Create a UserParameter on the agent to check service status:

```bash
# On each monitored host, add a UserParameter
sudo tee /etc/zabbix/zabbix_agent2.d/custom-services.conf << 'CONF'
# Check if a systemd service is active (returns 1 for active, 0 for inactive)
UserParameter=service.status[*],systemctl is-active $1 > /dev/null 2>&1 && echo 1 || echo 0

# Get the number of restarts for a service
UserParameter=service.restarts[*],systemctl show $1 --property=NRestarts --value

# Get service memory usage in bytes
UserParameter=service.memory[*],systemctl show $1 --property=MemoryCurrent --value

# Get the uptime of a service in seconds
UserParameter=service.uptime[*],systemctl show $1 --property=ActiveEnterTimestamp --value | xargs -I{} date -d "{}" +%s | xargs -I{} sh -c 'echo $(($(date +%s) - {}))'
CONF

# Restart the agent
sudo systemctl restart zabbix-agent2

# Test the parameters
zabbix_agent2 -t service.status[nginx]
zabbix_agent2 -t service.memory[nginx]
```

Now add items to the template:

```text
Item 1: Nginx Service Status
  Name: Nginx service status
  Type: Zabbix agent
  Key: service.status[nginx]
  Type of information: Numeric (unsigned)
  Update interval: 30s

Item 2: Nginx Memory Usage
  Name: Nginx memory usage
  Type: Zabbix agent
  Key: service.memory[nginx]
  Type of information: Numeric (unsigned)
  Units: B
  Update interval: 60s
```

## Add Triggers

Create triggers that fire when services are down:

```text
Trigger 1: Nginx is down
  Name: Nginx service is not running on {HOST.NAME}
  Severity: High
  Expression: last(/Custom RHEL Service Monitor/service.status[nginx])=0
  Recovery expression: last(/Custom RHEL Service Monitor/service.status[nginx])=1

Trigger 2: Nginx high memory usage
  Name: Nginx memory exceeds 1GB on {HOST.NAME}
  Severity: Warning
  Expression: last(/Custom RHEL Service Monitor/service.memory[nginx])>1073741824
```

## Create Discovery Rules

Automatically discover all running services:

```bash
# Add a discovery UserParameter on the agent
sudo tee -a /etc/zabbix/zabbix_agent2.d/custom-services.conf << 'CONF'

# Discover active systemd services (output JSON for Zabbix LLD)
UserParameter=service.discovery,systemctl list-units --type=service --state=running --no-legend --no-pager | awk '{print $1}' | sed 's/.service$//' | python3 -c "import sys,json; print(json.dumps([{'{#SERVICE}':s.strip()} for s in sys.stdin if s.strip()]))"
CONF

sudo systemctl restart zabbix-agent2
```

In the template, create a Discovery Rule:
```text
Name: Systemd service discovery
Key: service.discovery
Update interval: 1h
```

Add item prototypes:
```text
Name: Service {#SERVICE} status
Key: service.status[{#SERVICE}]
Type of information: Numeric (unsigned)
Update interval: 60s
```

Add trigger prototypes:
```text
Name: Service {#SERVICE} is down on {HOST.NAME}
Expression: last(/Custom RHEL Service Monitor/service.status[{#SERVICE}])=0
Severity: Average
```

## Export and Import Templates

```bash
# Export a template via the API
curl -X POST http://zabbix.example.com/api_jsonrpc.php \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "template.get",
    "params": {
        "filter": {"host": ["Custom RHEL Service Monitor"]},
        "output": "extend"
    },
    "auth": "YOUR_AUTH_TOKEN",
    "id": 1
  }'
```

You can also export from Data collection > Templates > select template > Export. Import on another Zabbix instance via the Import button.

Custom templates make monitoring consistent and reusable across all your RHEL hosts.
