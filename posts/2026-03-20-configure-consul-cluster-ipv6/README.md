# How to Configure Consul Cluster with IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Consul, IPv6, Service Discovery, Service Mesh, HashiCorp, Cluster

Description: Configure HashiCorp Consul for service discovery and service mesh over IPv6, covering server cluster setup, client registration, and DNS interface configuration.

---

HashiCorp Consul provides service discovery, health checking, and service mesh capabilities. It has native IPv6 support through configurable bind and advertise address settings.

## Consul IPv6 Configuration

```json
{
  "datacenter": "dc1",
  "node_name": "consul-server-1",
  "bind_addr": "2001:db8::1",
  "advertise_addr": "2001:db8::1",
  "client_addr": "::",
  "server": true,
  "bootstrap_expect": 3,
  "retry_join": [
    "[2001:db8::1]:8301",
    "[2001:db8::2]:8301",
    "[2001:db8::3]:8301"
  ],
  "data_dir": "/var/lib/consul",
  "log_level": "INFO",
  "enable_syslog": true,
  "addresses": {
    "dns": "::",
    "http": "::"
  },
  "ports": {
    "dns": 8600,
    "http": 8500,
    "server": 8300,
    "serf_lan": 8301,
    "serf_wan": 8302
  }
}
```

## Starting Consul Server with IPv6

```bash
# Start Consul server

consul agent -config-dir=/etc/consul/ &

# Or using a specific config file
consul agent \
  -server \
  -bootstrap-expect=3 \
  -bind=2001:db8::1 \
  -advertise=2001:db8::1 \
  -client=:: \
  -retry-join='[2001:db8::1]:8301' \
  -retry-join='[2001:db8::2]:8301' \
  -retry-join='[2001:db8::3]:8301' \
  -data-dir=/var/lib/consul \
  -node=consul-server-1 \
  -datacenter=dc1 &
```

## Consul Client Agent Configuration for IPv6

```json
{
  "datacenter": "dc1",
  "node_name": "web-server-1",
  "bind_addr": "2001:db8::10",
  "advertise_addr": "2001:db8::10",
  "client_addr": "::1",
  "retry_join": [
    "[2001:db8::1]:8301",
    "[2001:db8::2]:8301",
    "[2001:db8::3]:8301"
  ],
  "data_dir": "/var/lib/consul",
  "log_level": "INFO",
  "ports": {
    "grpc": 8502
  }
}
```

## Registering Services with IPv6

```json
{
  "service": {
    "name": "webapp",
    "id": "webapp-1",
    "address": "2001:db8::10",
    "port": 80,
    "tags": ["production", "ipv6"],
    "connect": {
      "sidecar_service": {
        "proxy": {
          "local_service_address": "2001:db8::10"
        }
      }
    },
    "check": {
      "http": "http://[2001:db8::10]:80/health",
      "interval": "10s",
      "timeout": "2s"
    }
  }
}
```

## Verifying Consul IPv6 Operation

```bash
# Check cluster members
consul members -http-addr='http://[::1]:8500'

# Check service catalog
consul catalog services -http-addr='http://[::1]:8500'

# Test DNS resolution over IPv6
dig @::1 -p 8600 webapp.service.consul AAAA +short

# Query the HTTP API
curl 'http://[::1]:8500/v1/health/service/webapp'

# Check node health
consul health node -http-addr='http://[::1]:8500' consul-server-1
```

## Consul DNS with IPv6

```bash
# Configure system to use Consul DNS
# /etc/systemd/resolved.conf.d/consul.conf
[Resolve]
DNS=[::1]:8600
DNSSEC=false
Domains=~consul
```

## Service Mesh (Envoy) with IPv6

```bash
# Connect Envoy proxy for service mesh over IPv6
consul connect envoy \
  -grpc-addr='[::1]:8502' \
  -sidecar-for webapp-1 \
  -- \
  --log-level debug
```

## Firewall Rules for Consul IPv6

```bash
# Open Consul ports for IPv6
sudo ip6tables -A INPUT -p tcp --dport 8300 -j ACCEPT  # Server RPC
sudo ip6tables -A INPUT -p tcp --dport 8301 -j ACCEPT  # Serf LAN TCP
sudo ip6tables -A INPUT -p udp --dport 8301 -j ACCEPT  # Serf LAN UDP
sudo ip6tables -A INPUT -p tcp --dport 8302 -j ACCEPT  # Serf WAN TCP
sudo ip6tables -A INPUT -p udp --dport 8302 -j ACCEPT  # Serf WAN UDP
sudo ip6tables -A INPUT -p tcp --dport 8500 -j ACCEPT  # HTTP API
sudo ip6tables -A INPUT -p tcp --dport 8600 -j ACCEPT  # DNS TCP
sudo ip6tables -A INPUT -p udp --dport 8600 -j ACCEPT  # DNS UDP
sudo ip6tables -A INPUT -p tcp --dport 21000:21255 -j ACCEPT  # Sidecar proxies

sudo ip6tables-save > /etc/ip6tables/rules.v6
```

Consul's flexible binding configuration makes it straightforward to deploy service discovery and service mesh infrastructure on IPv6 networks, enabling modern microservices architectures to operate natively over IPv6.
