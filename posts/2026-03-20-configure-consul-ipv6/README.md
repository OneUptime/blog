# How to Configure Consul with IPv6 Addresses

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Consul, HashiCorp, Service Discovery, Service Mesh

Description: Learn how to configure HashiCorp Consul agents and clusters to use IPv6 addresses for client API, DNS, RPC, and cluster (Serf) communication.

## Consul Server Configuration

```json
{
  "server": true,
  "datacenter": "dc1",
  "data_dir": "/var/lib/consul",
  "log_level": "INFO",
  "node_name": "consul-server-1",

  "bind_addr": "2001:db8::10",
  "advertise_addr": "2001:db8::10",

  "client_addr": "2001:db8::10",

  "bootstrap_expect": 3,

  "retry_join": [
    "[2001:db8::10]",
    "[2001:db8::11]",
    "[2001:db8::12]"
  ],

  "ui_config": {
    "enabled": true
  },

  "ports": {
    "http": 8500,
    "dns": 8600,
    "server": 8300,
    "serf_lan": 8301,
    "serf_wan": 8302
  }
}
```

## Consul Client Agent Configuration

```json
{
  "server": false,
  "datacenter": "dc1",
  "data_dir": "/var/lib/consul",
  "node_name": "app-server-1",

  "bind_addr": "2001:db8::20",
  "advertise_addr": "2001:db8::20",
  "client_addr": "127.0.0.1",

  "retry_join": [
    "[2001:db8::10]",
    "[2001:db8::11]",
    "[2001:db8::12]"
  ]
}
```

## Dual-Stack Configuration

```json
{
  "bind_addr": "{{ GetPrivateInterfaces | include \"type\" \"IPv6\" | attr \"address\" }}",
  "advertise_addr": "2001:db8::10",

  "client_addr": "0.0.0.0",

  "addresses": {
    "http": "2001:db8::10 127.0.0.1",
    "dns": "2001:db8::10 127.0.0.1"
  }
}
```

## Start and Verify

```bash
# Start Consul server

consul agent -config-dir=/etc/consul.d/

# Or as systemd service
systemctl start consul

# Check Consul members
consul members
# Should show IPv6 addresses

# Check leader
consul operator raft list-peers

# Verify HTTP API over IPv6
curl -6 http://[2001:db8::10]:8500/v1/status/leader

# Check services
curl -6 http://[2001:db8::10]:8500/v1/catalog/services
```

## Register a Service with IPv6

```bash
# Register service via HTTP API
curl -6 -X PUT http://[2001:db8::10]:8500/v1/agent/service/register \
    -H "Content-Type: application/json" \
    -d '{
        "ID": "web-service-1",
        "Name": "web-service",
        "Tags": ["ipv6", "production"],
        "Address": "2001:db8::20",
        "Port": 8080,
        "Check": {
            "HTTP": "http://[2001:db8::20]:8080/health",
            "Interval": "10s",
            "Timeout": "3s"
        }
    }'

# Query service catalog
curl -6 "http://[2001:db8::10]:8500/v1/catalog/service/web-service?pretty"

# DNS query (AAAA record gives the IPv6 address)
dig @2001:db8::10 -p 8600 web-service.service.consul AAAA
```

## Python Consul Client over IPv6

```python
import consul

# Connect to Consul via IPv6
c = consul.Consul(host='[2001:db8::10]', port=8500)

# Store a key-value pair
c.kv.put('config/database/host', '2001:db8::30')

# Retrieve value
index, data = c.kv.get('config/database/host')
print(f"DB host: {data['Value'].decode()}")

# List services
index, services = c.catalog.services()
for service_name in services:
    print(f"Service: {service_name}")

# Deregister service
c.agent.service.deregister('web-service-1')
```

## Summary

Consul 1.22.x and later support IPv6 addresses in agent and service configurations on VMs and Kubernetes. Configure IPv6 by setting `bind_addr` and `advertise_addr` to IPv6 addresses, and use `client_addr` or the `addresses` block for HTTP and DNS listeners. When you use literal IPv6 addresses in `retry_join`, enclose them in square brackets for cluster formation. Test with `consul members` and `curl -6 http://[2001:db8::10]:8500/v1/status/leader`. DNS queries work with `dig @2001:db8::10 -p 8600 web-service.service.consul AAAA`.
