# How to Troubleshoot MongoDB Atlas Connectivity

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Atlas, Connectivity, VPC, Network, Troubleshooting

Description: Learn how to diagnose and fix MongoDB Atlas connection issues including IP allowlist, VPC peering, TLS, and DNS resolution problems.

---

## Common Atlas Connectivity Issues

Atlas connectivity failures usually fall into one of these categories:

1. IP address not in Atlas Access List
2. Incorrect connection string format
3. Wrong username or password
4. Network firewall or security group blocking port 27017/27016
5. TLS certificate validation failure
6. DNS resolution failure (SRV records)
7. VPC Peering or Private Endpoint misconfiguration

## Step 1: Check the Atlas IP Access List

The most common cause of connection failures is a missing IP allowlist entry:

```bash
# Test connectivity first
curl -s https://api.ipify.org  # get your current public IP

# In Atlas UI:
# Network Access > IP Access List
# Add your IP or 0.0.0.0/0 for testing (never in production)
```

```bash
# Atlas CLI - add your current IP
atlas accessLists create --currentIp --projectId <projectId>

# List current access list entries
atlas accessLists list --projectId <projectId>
```

## Step 2: Verify the Connection String

Atlas provides several connection string formats:

```bash
# Standard format
mongodb://username:password@cluster0-shard-00-00.abc12.mongodb.net:27017,.../?ssl=true&replicaSet=atlas-xyz&authSource=admin

# SRV format (recommended - automatic discovery)
mongodb+srv://username:password@cluster0.abc12.mongodb.net/mydb?retryWrites=true&w=majority

# Test with mongosh
mongosh "mongodb+srv://username:password@cluster0.abc12.mongodb.net/test"
```

## Step 3: Test TCP Connectivity

```bash
# Test if port 27017 is reachable
nc -zv cluster0-shard-00-00.abc12.mongodb.net 27017
# "Connection to cluster0... 27017 port [tcp/*] succeeded!"

# If using SRV, test port 27017 on each shard host
nslookup -type=SRV _mongodb._tcp.cluster0.abc12.mongodb.net
# Should return SRV records with host:port entries

# Test TLS handshake
openssl s_client -connect cluster0-shard-00-00.abc12.mongodb.net:27017
# Should show certificate chain
```

## Step 4: DNS Resolution Check

SRV connection strings rely on DNS SRV records:

```bash
# Check SRV records
dig _mongodb._tcp.cluster0.abc12.mongodb.net SRV
# Should return multiple entries like:
# cluster0-shard-00-00.abc12.mongodb.net.

# If DNS resolution fails, try the standard connection string format instead
# Or check if your DNS server can resolve .mongodb.net domains

# On corporate networks, internal DNS may block external SRV lookups
nslookup -type=SRV _mongodb._tcp.cluster0.abc12.mongodb.net 8.8.8.8
# Try with Google's DNS to bypass internal DNS issues
```

## Step 5: TLS Certificate Validation

Atlas uses TLS/SSL. Certificate validation errors are common in certain environments:

```bash
# Test TLS connection
openssl s_client -connect cluster0-shard-00-00.abc12.mongodb.net:27017 -showcerts

# If you see certificate validation errors:
# - Check system CA certificates are up to date
# - On Linux: update-ca-certificates
# - On macOS: Keychain Access > update
```

```javascript
// Node.js: explicitly allow self-signed or custom CA
const client = new MongoClient(uri, {
  tls: true,
  // tlsAllowInvalidCertificates: true  // only for debugging, never production
  // tlsCAFile: "/path/to/custom-ca.pem"  // for custom CA
})
```

## Step 6: VPC Peering Troubleshooting

For Atlas clusters with VPC Peering:

```bash
# Verify peering connection is active in Atlas UI
# Network Access > Peering > Status should be "Available"

# Check VPC route tables in AWS/GCP/Azure
# Atlas CIDR must be routable from your VPC

# AWS: check route table has route to VPC peering connection
aws ec2 describe-route-tables --filters "Name=vpc-id,Values=vpc-xxx"

# Verify security groups allow outbound on port 27017
aws ec2 describe-security-groups --group-ids sg-xxx
```

## Step 7: Private Endpoint Troubleshooting

For Atlas Private Endpoint connections:

```bash
# Check Private Endpoint status in Atlas UI
# Network Access > Private Endpoint > Status = "Available"

# Verify DNS for private endpoint (Atlas creates Private DNS zones)
# In AWS, check Route 53 hosted zones for *.mongodb.net entries

# Test connectivity to private endpoint
nslookup pl-0-us-east-1.abc12.mongodb.net
# Should resolve to a 10.x.x.x or RFC1918 address

# Check VPC endpoint DNS settings
aws ec2 describe-vpc-endpoints --vpc-endpoint-ids vpce-xxx
```

## Step 8: Diagnosing Intermittent Failures

For intermittent connectivity issues:

```javascript
// Enable connection monitoring
const client = new MongoClient(uri, {
  monitorCommands: true,
  serverMonitoringMode: "stream"
})

client.on("serverHeartbeatFailed", event => {
  console.error("Heartbeat failed:", event.connectionId, event.failure)
})

client.on("serverOpening", event => console.log("Server opening:", event))
client.on("serverClosed", event => console.log("Server closed:", event))
```

```bash
# Check Atlas real-time performance panel
# Atlas UI > Cluster > Metrics > Network

# Monitor connection attempts in Atlas logs
# Atlas UI > Cluster > Logs
```

## Quick Diagnostic Checklist

```text
[ ] My IP is in Atlas IP Access List (or 0.0.0.0/0 for testing)
[ ] Connection string copied correctly from Atlas UI
[ ] Username and password are URL-encoded (@ -> %40, # -> %23)
[ ] Port 27017 is open in local firewall / security group
[ ] DNS resolves *.mongodb.net (test with nslookup)
[ ] TLS not blocked by corporate proxy
[ ] VPC Peering/Private Endpoint status is "Available" (if applicable)
[ ] Driver version supports Atlas TLS requirements
```

## Summary

Atlas connectivity issues typically stem from IP access list restrictions, DNS resolution failures for SRV records, TLS certificate validation problems, or VPC/network configuration issues. Systematically verify your public IP is allowed, test TCP connectivity and DNS resolution, and check VPC peering or private endpoint status for private deployments. Enable driver-level connection monitoring for diagnosing intermittent failures.
