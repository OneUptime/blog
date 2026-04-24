# How to Debug Agent Connectivity with Telnet and Curl - Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Troubleshooting, Agent, Networking, Debugging

Description: Use telnet, curl, and netcat to systematically debug Portainer Agent connectivity issues from the network level up to the API level.

## Introduction

When the Portainer UI shows an agent as offline or unreachable, low-level network tools can quickly identify exactly where the connectivity breaks down. This guide teaches you to use `telnet`, `curl`, `nc` (netcat), and `openssl` to debug agent connectivity at each layer of the stack.

## Layer 1: Network Reachability (ICMP)

```bash
# Test basic IP connectivity to the agent host

ping -c 4 agent-host

# Expected: 0% packet loss, RTT < 50ms for LAN, < 200ms for WAN
# If ping fails:
# - Check routing: ip route show / route -n
# - Check if ICMP is blocked: some firewalls block ping but allow TCP
```

## Layer 2: TCP Port Connectivity (Netcat / Telnet)

```bash
# Test if the agent port is open and accepting connections
# Method 1: netcat (most reliable)
nc -zv agent-host 9001
# -z = scan only (don't send data)
# -v = verbose output

# Expected output:
# "Connection to agent-host 9001 port [tcp/*] succeeded!"

# Method 2: telnet
telnet agent-host 9001
# If connected: you'll see a blank screen or garbled data
# Type Ctrl+] then "quit" to exit

# Method 3: /dev/tcp (no tools required)
timeout 3 bash -c "cat < /dev/null > /dev/tcp/agent-host/9001" && echo "Open" || echo "Closed"
```

### Interpreting Results

| Result | Meaning |
|--------|---------|
| `Connection succeeded` | Port is open, agent is listening |
| `Connection refused` | Port is not open, agent not running |
| `No route to host` | Routing issue or host unreachable |
| `Connection timed out` | Firewall is blocking (silently dropping packets) |

## Layer 3: HTTPS Protocol Test (Curl)

Once TCP connectivity is confirmed, test the agent's HTTPS endpoint:

```bash
# Test the public agent ping endpoint
curl -vk https://agent-host:9001/ping

# Expected response: HTTP 204 No Content
# "Connection refused" = TCP level issue
# Certificate warnings are expected unless you use -k / --insecure

# Test with timeout
curl -vk --connect-timeout 5 --max-time 10 https://agent-host:9001/ping

# Test with response headers shown
curl -skD - https://agent-host:9001/ping -o /dev/null
```

## Layer 4: TLS Verification (OpenSSL)

Standard (non-Edge) Portainer agents use TLS by default:

```bash
# Test TLS handshake
openssl s_client -connect agent-host:9001 -servername agent-host </dev/null

# Check certificate details
openssl s_client -connect agent-host:9001 -servername agent-host </dev/null 2>/dev/null | \
  sed -ne '/-BEGIN CERTIFICATE-/,/-END CERTIFICATE-/p' | \
  openssl x509 -noout -subject -issuer -enddate

# Test with specific TLS version
openssl s_client -tls1_2 -connect agent-host:9001 -servername agent-host </dev/null

# If TLS handshake fails:
# - Certificate is expired
# - CN/SAN doesn't match the hostname
# - TLS version mismatch
```

## Layer 5: Agent API Test

```bash
# The documented public endpoint is /ping and it should return 204
curl -sk -o /dev/null -w "HTTP Status: %{http_code}\n" https://agent-host:9001/ping

# Most other agent and proxied Docker API endpoints require Portainer-signed headers
# Plain curl requests without X-PortainerAgent-PublicKey and X-PortainerAgent-Signature return 403
curl -skD - https://agent-host:9001/agents -o /dev/null

# If you need to inspect the public endpoint in more detail
curl -skv https://agent-host:9001/ping
```

## Debug from Inside the Portainer Container

```bash
# If your Portainer image includes a shell and network tools, you can test from inside it
docker exec -it portainer sh

# Inside the container, if the tools are available:
# Test DNS resolution of the agent
nslookup agent-host

# Test HTTPS connectivity to the public ping endpoint
wget --spider --server-response --no-check-certificate https://agent-host:9001/ping
# or
curl -sk -o /dev/null -w "HTTP Status: %{http_code}\n" https://agent-host:9001/ping

# Test if the agent host is reachable from Portainer's network
ping agent-host

exit
```

## Debug Firewall Rules with tcpdump

```bash
# On the Portainer server, capture traffic to/from the agent
sudo tcpdump -i any host agent-host and port 9001 -n

# In another terminal, trigger an action in Portainer that contacts the agent
# Then observe the tcpdump output:
# SYN sent, SYN-ACK received = connection establishing
# SYN sent, RST received = port refused
# SYN sent, no response = firewalled/dropped

# On the agent host, capture to see if packets arrive
sudo tcpdump -i any port 9001 -n
```

## Trace the Full Path with Traceroute

```bash
# Find where packets are being dropped
traceroute agent-host

# For more detail with TCP instead of UDP
sudo traceroute -T -p 9001 agent-host

# For ICMP traceroute
sudo traceroute -I agent-host
```

## Quick Debug Script

```bash
#!/bin/bash
# portainer-agent-debug.sh
AGENT_HOST="${1:-agent-host}"
AGENT_PORT="${2:-9001}"

echo "=== Layer 1: ICMP Ping ==="
ping -c 3 "$AGENT_HOST" 2>&1 | tail -3

echo "=== Layer 2: TCP Connectivity ==="
nc -zv "$AGENT_HOST" "$AGENT_PORT" 2>&1

echo "=== Layer 3: HTTPS Response ==="
curl -sk --connect-timeout 5 --max-time 10 "https://$AGENT_HOST:$AGENT_PORT/ping" \
  -o /dev/null -w "HTTP Status: %{http_code}\n"

echo "=== Agent Container Status (if local) ==="
docker ps | grep portainer-agent 2>/dev/null || echo "Agent not local"

echo "Done"
```

Run with:
```bash
chmod +x portainer-agent-debug.sh
./portainer-agent-debug.sh my-agent-host 9001
```

## Conclusion

Debugging Portainer Agent connectivity is a structured process: start at the network layer with ping to verify routing, then confirm the TCP port is open with `nc -zv`, then test the agent's HTTPS `/ping` endpoint with `curl -vk`. If all of those work but Portainer still can't connect, the issue is likely agent authentication or association rather than basic network reachability. Use `openssl s_client` to debug TLS and check the `AGENT_SECRET` configuration on both the Portainer Server instance and the Agent if you are using that feature.
