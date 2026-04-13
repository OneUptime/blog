# How to Fix MongoError: Network Timeout When Connecting to Atlas

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Atlas, Network Timeout, Connection, Troubleshooting

Description: Learn why network timeouts occur when connecting to MongoDB Atlas and how to fix them by configuring IP access lists, DNS, VPC peering, and connection settings.

---

## Understanding the Error

`MongoServerSelectionError: connection timed out` when connecting to MongoDB Atlas means the TCP connection to the Atlas cluster never completed. This is different from an authentication error - the network packet never reached (or returned from) Atlas:

```text
MongoServerSelectionError: connection <monitor> to cluster0-shard-00-00.abc123.mongodb.net:27017
  closed, reason: socket timed out (serverSelectionTimeoutMS: 30000)
```

## Step 1: Check the IP Access List

The most common cause is an IP not being in the Atlas Network Access allow list.

1. Log in to Atlas
2. Navigate to Network Access
3. Add your current IP with "Add Current IP Address"
4. For server deployments, add the server's public IP
5. For development, you can temporarily use `0.0.0.0/0` (allow all)

Test connectivity after adding the IP:

```bash
nc -zv cluster0-shard-00-00.abc123.mongodb.net 27017
```

## Step 2: Verify the Connection String

Atlas provides an SRV connection string. Make sure you are using the correct format:

```text
mongodb+srv://username:password@cluster0.abc123.mongodb.net/mydb?retryWrites=true&w=majority
```

Test the SRV DNS resolution:

```bash
nslookup -type=SRV _mongodb._tcp.cluster0.abc123.mongodb.net
```

If DNS resolution fails, check that your DNS server can resolve Atlas SRV records, or use the standard connection string with explicit hosts:

```text
mongodb://username:password@cluster0-shard-00-00.abc123.mongodb.net:27017,
cluster0-shard-00-01.abc123.mongodb.net:27017,
cluster0-shard-00-02.abc123.mongodb.net:27017/mydb?ssl=true&replicaSet=atlas-rs
```

## Step 3: Check Firewall and Proxy

Corporate firewalls, proxies, or cloud security groups may block outbound port 27017:

```bash
# Test direct connectivity
telnet cluster0-shard-00-00.abc123.mongodb.net 27017

# Check if port 27017 is open outbound
curl -v telnet://cluster0-shard-00-00.abc123.mongodb.net:27017
```

For cloud deployments (AWS, GCP, Azure), ensure security group or firewall rules allow outbound TCP on port 27017.

## Step 4: Use VPC Peering or Private Endpoints for Production

For production workloads, avoid public internet connections to Atlas. Use:

- **AWS**: VPC Peering or AWS PrivateLink
- **GCP**: VPC Peering
- **Azure**: Azure Private Link

This eliminates internet-routed latency and network reliability issues.

## Step 5: Tune Connection Timeouts

For high-latency networks or slow Atlas cluster startup:

```javascript
const client = new MongoClient(atlasUri, {
  serverSelectionTimeoutMS: 60000, // 60s to find a server
  connectTimeoutMS: 30000,         // 30s to establish TCP
  socketTimeoutMS: 45000,          // 45s per socket operation
  maxPoolSize: 10,
  minPoolSize: 2
});
```

## Step 6: Test With mongosh

Isolate whether the issue is application-specific or environmental:

```bash
mongosh "mongodb+srv://username:password@cluster0.abc123.mongodb.net/test" \
  --tls --tlsAllowInvalidCertificates
```

If `mongosh` connects but your application does not, compare driver versions and TLS configuration.

## Step 7: Atlas Cluster Status

Verify the Atlas cluster is running and not in maintenance mode:

1. Check Atlas Dashboard - cluster status should be green
2. Check Atlas Status page at status.cloud.mongodb.com
3. Review Atlas alerts for any ongoing incidents

## Summary

Atlas network timeouts are caused by IP not being in the access list, DNS resolution failures, firewall blocking port 27017, or cluster issues. Start by confirming the IP access list, test DNS SRV resolution, check outbound firewall rules, use private endpoints for production, and tune `serverSelectionTimeoutMS` for slow networks.
