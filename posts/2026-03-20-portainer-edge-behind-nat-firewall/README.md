# How to Set Up Edge Agent Behind a NAT or Firewall - Portainer Behind

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Edge Agent, NAT, Firewall, Network, Remote Access

Description: Deploy and configure Portainer Edge Agents in NAT or firewalled environments where devices don't have public IP addresses.

## Introduction

NAT (Network Address Translation) is ubiquitous - most edge devices sit behind a home router, office NAT gateway, or corporate firewall without a public IP. The Portainer Edge Agent is specifically designed for this scenario: it initiates outbound connections, making it transparent to NAT devices.

## How Edge Agent Works Through NAT

The key design principle:

```text
[Edge Device behind NAT]                [Internet]           [Portainer Server]
    |                                                              |
    |------ TCP SYN to portainer.example.com:8000 ------------>  |
    |<----- TCP SYN-ACK (NAT tracks this connection) ----------  |
    |                                                              |
    |  [Persistent outbound connection - NAT allows return traffic]
    |                                                              |
    Portainer sends commands via this established connection
```

No inbound ports needed on the edge device's NAT gateway.

## Requirements

From the edge device (outbound only):
- **Port 9443 outbound** → Portainer HTTPS for registration and API (or 443 if Portainer is published behind a reverse proxy)
- **Port 8000 outbound** → Portainer Tunnel Server for the reverse tunnel used during interactive sessions by default

## Verifying Outbound Connectivity

```bash
# Test from behind NAT

curl -sv https://portainer.example.com:9443 2>&1 | head -20
# Should succeed if the Portainer HTTPS/API port is allowed outbound
# If Portainer uses a self-signed certificate, add -k to curl

nc -zv portainer.example.com 8000
# Should succeed if port 8000 is allowed outbound
```

## Deploying Edge Agent Behind NAT

```bash
# Standard edge agent deployment (works through NAT automatically)
docker run -d \
  --name portainer_edge_agent \
  --restart always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v /var/lib/docker/volumes:/var/lib/docker/volumes \
  -v /:/host \
  -v portainer_agent_data:/data \
  -e EDGE=1 \
  -e EDGE_ID=nat-device-001 \
  -e EDGE_KEY=portainer-edge-key \
  portainer/agent:lts
```

No special NAT configuration needed. The agent initiates the connection. Match the agent tag to your Portainer Server version. If your Portainer Server uses a self-signed certificate, add `-e EDGE_INSECURE_POLL=1`.

## Handling Strict Corporate Firewalls

Some corporate firewalls:
- Block all outbound except HTTP/HTTPS (ports 80/443)
- Inspect HTTPS traffic (SSL inspection)
- Block non-standard ports like 8000

### If Port 8000 is Blocked

Configure Portainer to use an allowed public port for the tunnel server. For example, if you want the tunnel server on port 443:

```bash
# On Portainer Server - publish HTTPS on 9443 and the Edge tunnel on 443
docker run -d \
  --name portainer \
  --restart always \
  -p 9443:9443 \
  -p 443:443 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:lts \
  --tunnel-port 443
```

If Portainer is behind a reverse proxy, publish the Edge tunnel on a hostname and port that the edge device can actually reach instead of trying to bind both the UI and the tunnel server to the same host port on the same address.

Then create the Edge Agent using the tunnel address that the device can reach. In Portainer Business Edition, this can be overridden in the Edge Agent wizard or in Edge Compute settings.

## Multi-Layer NAT

For devices behind multiple NAT layers (common in enterprise):

```text
Device → Office NAT → ISP NAT → Portainer
```

As long as outbound TCP to portainer.example.com:8000 (or your configured tunnel port) is allowed at each layer, the edge agent works transparently.

## Conclusion

The Edge Agent's outbound-connection model makes it inherently NAT-friendly. The most common issue in NAT environments isn't NAT itself but corporate firewalls blocking outbound port 8000. If the default tunnel port is blocked, move the tunnel server to an allowed port such as 443 and use the corresponding reachable tunnel address when creating the Edge Agent.
