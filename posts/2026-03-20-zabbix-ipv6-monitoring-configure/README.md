# How to Configure Zabbix for IPv6 Monitoring

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Zabbix, IPv6, Monitoring, Network, Agent, Configuration

Description: A guide to configuring Zabbix server, proxy, and agents to monitor IPv6 hosts and services, including interface configuration and ICMP checks.

Zabbix has native IPv6 support throughout its stack. The Zabbix server, proxies, and agents can all communicate over IPv6, and monitoring items can target IPv6 addresses directly.

## Step 1: Configure Zabbix Server for IPv6

Edit `/etc/zabbix/zabbix_server.conf`:

```ini
# /etc/zabbix/zabbix_server.conf - Zabbix Server IPv6 configuration

# Listen on all interfaces (IPv4 and IPv6)
ListenIP=0.0.0.0,::

# Optional: specify a specific IPv6 listening address
# ListenIP=2001:db8::1

# Listen port
ListenPort=10051

# Allow IPv6 connections from Zabbix agents
# ListenIP accepts a comma-separated list of IPv4 and IPv6 addresses
```

Restart Zabbix server:

```bash
sudo systemctl restart zabbix-server

# Verify it's listening on IPv6
ss -6 -tlnp | grep zabbix_server
```

## Step 2: Configure Zabbix Agent for IPv6

```ini
# /etc/zabbix/zabbix_agentd.conf - Agent configuration for IPv6

# Server IPv6 address (Zabbix server or proxy that collects from this agent)
Server=2001:db8::1

# Active checks target (comma-separated if multiple)
# For IPv6 with a port, brackets are required: [2001:db8::1]:10051
ServerActive=2001:db8::1

# Hostname of this host (must match in Zabbix frontend)
Hostname=web-01.example.com

# Listen on all interfaces including IPv6
ListenIP=0.0.0.0,::
ListenPort=10050
```

```bash
sudo systemctl restart zabbix-agent2
```

## Step 3: Add an IPv6 Host in Zabbix Frontend

Via the Zabbix web interface (Zabbix 7.0):

1. Go to **Data collection → Hosts → Create host**
2. Set **Host name**: `web-01`
3. Under **Interfaces**, click **Add**:
   - Type: **Agent**
   - IP address: `2001:db8::10` (the host's IPv6 address)
   - Port: `10050`
4. Add the template `Linux by Zabbix agent`
5. Click **Add**

Or via Zabbix API:

```bash
# Add host with IPv6 interface via Zabbix API (Zabbix 6.4+ Bearer auth)
curl -X POST https://zabbix.example.com/api_jsonrpc.php \
  -H "Content-Type: application/json-rpc" \
  -H "Authorization: Bearer $ZABBIX_TOKEN" \
  -d '{
    "jsonrpc": "2.0",
    "method": "host.create",
    "params": {
      "host": "web-01",
      "interfaces": [{
        "type": 1,
        "main": 1,
        "useip": 1,
        "ip": "2001:db8::10",
        "dns": "",
        "port": "10050"
      }],
      "groups": [{"groupid": "2"}],
      "templates": [{"templateid": "10001"}]
    },
    "id": 1
  }'
```

## Step 4: Create an ICMPv6 Availability Check

```bash
# Zabbix ICMP ping check configuration (UI: Items → Create Item)
# Key: icmpping[2001:db8::10]
# The icmpping key supports IPv6 addresses directly
```

Or use the API to create an ICMP ping item:

```bash
curl -X POST https://zabbix.example.com/api_jsonrpc.php \
  -H "Content-Type: application/json-rpc" \
  -H "Authorization: Bearer $ZABBIX_TOKEN" \
  -d '{
    "jsonrpc": "2.0",
    "method": "item.create",
    "params": {
      "hostid": "'"$HOST_ID"'",
      "name": "ICMPv6 ping to 2001:db8::10",
      "key_": "icmpping[2001:db8::10,3,200,1024]",
      "type": 3,
      "delay": "60s",
      "value_type": 3
    },
    "id": 1
  }'
```

## Step 5: Monitor IPv6 Network Interfaces with SNMP

```ini
# Add an SNMP host with IPv6 address in Zabbix
# Interface type: SNMP
# IP: 2001:db8::fe
# Port: 161
# SNMP version: v2c
# Community: public
```

Template `Network interfaces by SNMP` will automatically collect IPv6 interface statistics via the IF-MIB and IP-MIB.

## Step 6: Create a Trigger for IPv6 Host Unavailability

```text
# Trigger expression for ICMPv6 unavailability (Zabbix 6.0+ syntax)
last(/web-01/icmpping[2001:db8::10,3,200,1024])=0
```

Or for consecutive failures:

```text
count(/web-01/icmpping[2001:db8::10],#5,"eq",0)>=3
```

## Verify Zabbix IPv6 Monitoring

```bash
# Check Zabbix server is accepting IPv6 connections
ss -6 -tlnp | grep zabbix

# Test agent connectivity from the Zabbix server
zabbix_get -s 2001:db8::10 -p 10050 -k system.hostname

# Verify latest data in Zabbix UI: Monitoring → Latest data → Filter by host
```

Zabbix's native IPv6 support means no special plugins are required - simply use IPv6 addresses in the host interface configuration and Zabbix handles the rest automatically.
