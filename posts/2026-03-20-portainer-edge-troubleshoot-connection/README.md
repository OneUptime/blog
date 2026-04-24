# How to Troubleshoot Edge Agent Connection Issues

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Edge Agent, Troubleshooting, Connectivity, Debugging

Description: Diagnose and fix common Edge Agent connectivity failures in Portainer including tunnel server issues, edge key problems, and network errors.

## Introduction

Edge Agent connections fail for different reasons than standard agent connections. Since edge agents initiate outbound connections, the issues often involve outbound firewall rules, the edge key validity, or tunnel server accessibility rather than inbound port availability.

## Step 1: Check Agent Logs

```bash
# View recent logs

docker logs portainer_edge_agent --tail 50

# Common log messages to look for:
# "edge key loaded from options"
# "edge key loaded from the filesystem"
# "creating reverse tunnel client"
# "unable to retrieve Edge key"
# "poll request failure"
# "unable to create tunnel"
```

## Step 2: Verify the Edge Key

The edge key contains the Portainer API URL, tunnel server address, tunnel fingerprint, and endpoint ID. Decode it:

```bash
# Edge key is base64-encoded without padding
EDGE_KEY="your-edge-key-here"
python3 - <<'PY' "$EDGE_KEY"
import base64, sys
edge_key = sys.argv[1]
decoded = base64.b64decode(edge_key + "=" * (-len(edge_key) % 4)).decode()
print(decoded)
PY

# Expected format:
# https://portainer.example.com:9443|portainer.example.com:8000|<fingerprint>|<endpoint-id>
```

Verify:
- the first field is the correct Portainer API URL
- the second field is the correct tunnel server address
- the third field is the Portainer tunnel server fingerprint
- the fourth field is the expected environment ID

## Step 3: Test Tunnel Server Connectivity

```bash
# Use the host and ports from the decoded edge key
# Test connectivity to the Portainer API URL (default HTTPS port 9443)
nc -zv portainer.example.com 9443

# Test connectivity to the tunnel server (default port 8000)
nc -zv portainer.example.com 8000
```

If either port 9443 or 8000 is blocked, the Edge Agent will not connect correctly.

## Step 4: Check Outbound Firewall Rules

```bash
# On the agent host
# Check iptables for outbound blocks
sudo iptables -L OUTPUT -n | grep -E "9443|8000"

# Check if DNS resolves
nslookup portainer.example.com
```

## Step 5: Verify HTTPS Access to Portainer

```bash
# Use the Portainer API URL from the decoded edge key
curl -v https://portainer.example.com:9443/api/system/status
# Should return status information

# If this fails, the agent won't be able to poll Portainer on its API URL
```

## Step 6: Retrieve the Current Edge ID and Edge Key

If the edge key was copied incorrectly or you need to redeploy the agent:

```bash
TOKEN=$(curl -s -X POST \
  https://portainer.example.com/api/auth \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"adminpassword"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['jwt'])")

# Get edge environments
curl -s -H "Authorization: Bearer $TOKEN" \
  https://portainer.example.com/api/endpoints \
  | python3 -c "
import sys, json
for e in json.load(sys.stdin):
    if e.get('Type') in [4, 7]:
        print(f'Edge Env ID={e[\"Id\"]} Name={e[\"Name\"]} EdgeID={e.get(\"EdgeID\",\"\")} Key={e.get(\"EdgeKey\",\"\")}')
"
```

Update the agent with the retrieved values:
```bash
docker stop portainer_edge_agent
docker rm portainer_edge_agent

# Match the agent image tag to your Portainer Server version/support channel
docker pull portainer/agent:lts

docker run -d \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v /var/lib/docker/volumes:/var/lib/docker/volumes \
  -v /:/host \
  -v portainer_agent_data:/data \
  --restart always \
  --name portainer_edge_agent \
  -e EDGE=1 \
  -e EDGE_ID=retrieved-edge-id \
  -e EDGE_KEY=retrieved-edge-key \
  portainer/agent:lts

# Add -e EDGE_INSECURE_POLL=1 if the Portainer API URL uses a self-signed certificate
# If Portainer Server uses a custom AGENT_SECRET, add -e AGENT_SECRET=yoursecret
```

## Common Error Table

| Error | Cause | Fix |
|-------|-------|-----|
| `connection refused :8000` | Port 8000 blocked or tunnel server not reachable | Open outbound port 8000 and verify the tunnel server address |
| `invalid key format` | Key truncated, corrupted, or copied incorrectly | Retrieve the current Edge key again |
| `x509: certificate signed by unknown authority` | Self-signed or untrusted certificate | Trust the CA or add `EDGE_INSECURE_POLL=1` |
| `Connection reset by peer` | Network or firewall issue on the Portainer API URL | Verify outbound access to the API URL and tunnel port 8000 |
| Environment shows "Down" | Agent not checking in | Check the agent is running and can reach the Portainer API URL and tunnel server |

## Conclusion

Edge Agent connectivity issues almost always involve reachability to the Portainer API URL (usually port 9443), reachability to the tunnel server on port 8000, the edge key contents, or TLS certificate trust. The diagnostic path: check logs → decode and verify the edge key → test outbound access to the API URL and tunnel server → verify HTTPS access → retrieve the current Edge ID and Edge key and redeploy if needed. Start with the simplest checks before investigating complex network routing issues.
