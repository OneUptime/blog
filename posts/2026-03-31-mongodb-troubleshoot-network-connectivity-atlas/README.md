# How to Troubleshoot Network Connectivity to MongoDB Atlas

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Atlas, Networking, Troubleshooting, Debugging

Description: Systematically diagnose and fix network connectivity issues to MongoDB Atlas, covering DNS, firewall, TLS, and IP access list problems.

---

## Common Connectivity Error Patterns

Network issues with MongoDB Atlas typically manifest as one of these errors:

```text
MongoServerSelectionError: connection timed out
MongoNetworkError: failed to connect to server
MongoServerError: bad auth: authentication failed
SSL handshake failed
```

Understanding which layer is failing guides your troubleshooting approach.

## Step 1: Verify DNS Resolution

First confirm that the Atlas hostname resolves to an IP address:

```bash
dig _mongodb._tcp.cluster0.abcde.mongodb.net SRV +short
nslookup cluster0-shard-00-00.abcde.mongodb.net
```

If DNS resolution fails:
- Check if you are behind a DNS firewall that blocks external queries
- For private endpoints, verify your private DNS zone configuration
- Confirm the cluster hostname from the Atlas UI under **Connect**

## Step 2: Test TCP Connectivity on Port 27017

```bash
nc -zv cluster0-shard-00-00.abcde.mongodb.net 27017
```

Or use `telnet`:

```bash
telnet cluster0-shard-00-00.abcde.mongodb.net 27017
```

If the connection times out, the problem is a firewall or security group rule blocking port 27017.

## Step 3: Check the Atlas IP Access List

Verify your current public IP is allowed:

```bash
curl https://ipinfo.io/ip
```

Then check the Atlas access list via API:

```bash
curl --user "PUBLIC_KEY:PRIVATE_KEY" --digest \
  --header "Accept: application/vnd.atlas.2023-02-01+json" \
  "https://cloud.mongodb.com/api/atlas/v2/groups/{groupId}/accessList"
```

Add your IP if missing:

```bash
curl --user "PUBLIC_KEY:PRIVATE_KEY" --digest \
  --header "Content-Type: application/json" \
  --header "Accept: application/vnd.atlas.2023-02-01+json" \
  --request POST \
  "https://cloud.mongodb.com/api/atlas/v2/groups/{groupId}/accessList" \
  --data '[{"ipAddress": "YOUR_IP", "comment": "debug"}]'
```

## Step 4: Test TLS Handshake

Atlas requires TLS 1.2 or higher. Test the TLS handshake:

```bash
openssl s_client -connect cluster0-shard-00-00.abcde.mongodb.net:27017 \
  -tls1_2 -servername cluster0-shard-00-00.abcde.mongodb.net
```

If TLS fails, check:
- System CA certificates are up to date
- No TLS-intercepting proxy between you and Atlas
- Application is not disabling TLS (`ssl=false` or `tls=false` in connection string)

## Step 5: Test Authentication

Use mongosh to isolate authentication from network issues:

```bash
mongosh "mongodb+srv://cluster0.abcde.mongodb.net/test" \
  --username myUser --password myPassword \
  --authenticationDatabase admin
```

If you see `Authentication failed`, the network is working but credentials are wrong or the user lacks access to the target database.

## Step 6: Check Driver-Specific Connection Options

Some drivers have additional connection timeout settings that can mask network issues:

```javascript
const client = new MongoClient(uri, {
  serverSelectionTimeoutMS: 10000,
  connectTimeoutMS: 30000,
  socketTimeoutMS: 45000,
});
```

Increase these values during debugging to allow more time for connection attempts.

## Step 7: Use the Atlas Connectivity Checker

Atlas provides a built-in connectivity test in the cluster overview page. Navigate to **Metrics** > **Real-Time** and look for connection activity. Also check **Monitoring** > **Connections** for connection spikes or drops.

## Summary

Troubleshooting MongoDB Atlas network connectivity follows a layered approach: verify DNS resolution, test TCP port 27017 reachability, confirm the client IP is in the Atlas access list, validate TLS handshake success, and test authentication separately. Most connectivity issues are caused by missing IP access list entries, firewall rules blocking port 27017, or TLS configuration mismatches. Isolating each layer systematically leads to faster resolution.
