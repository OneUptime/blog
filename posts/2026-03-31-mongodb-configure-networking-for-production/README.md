# How to Configure MongoDB Networking for Production

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Networking, Production, Security, TLS

Description: Learn how to configure MongoDB networking for production including TLS/SSL, IP binding, firewall rules, and VPC peering for secure connectivity.

---

## Network Security Principles for MongoDB

Production MongoDB deployments should follow these networking principles:
- Never expose MongoDB directly to the public internet
- Bind to private IP addresses only
- Encrypt all client-server and intra-cluster communication with TLS
- Use VPC/subnet isolation to limit which services can reach MongoDB
- Restrict access to port 27017 at the firewall level

## Step 1: Bind to Private IPs Only

Configure MongoDB to listen only on internal network interfaces:

```yaml
# /etc/mongod.conf
net:
  port: 27017
  bindIp: 127.0.0.1,10.0.1.10  # localhost + private IP
  # Never use bindIp: 0.0.0.0 in production
  compression:
    compressors: zstd,snappy
```

Verify the binding:

```bash
ss -tlnp | grep 27017
# Should show 10.0.1.10:27017, NOT 0.0.0.0:27017
```

## Step 2: Enable TLS/SSL

Generate or obtain TLS certificates and enable TLS:

```bash
# Create self-signed CA and server cert (use CA-signed certs in production)
openssl req -newkey rsa:2048 -new -x509 -days 365 -nodes \
  -out /etc/mongodb/ca.pem \
  -keyout /etc/mongodb/ca-key.pem \
  -subj "/CN=MongoDB-CA"

openssl req -newkey rsa:2048 -nodes \
  -keyout /etc/mongodb/server-key.pem \
  -out /etc/mongodb/server.csr \
  -subj "/CN=mongo1.internal.example.com"

openssl x509 -req -in /etc/mongodb/server.csr \
  -CA /etc/mongodb/ca.pem \
  -CAkey /etc/mongodb/ca-key.pem \
  -CAcreateserial \
  -out /etc/mongodb/server-cert.pem \
  -days 365

cat /etc/mongodb/server-cert.pem /etc/mongodb/server-key.pem \
  > /etc/mongodb/server-combined.pem
```

Configure TLS in `mongod.conf`:

```yaml
net:
  port: 27017
  bindIp: 10.0.1.10
  tls:
    mode: requireTLS
    certificateKeyFile: /etc/mongodb/server-combined.pem
    CAFile: /etc/mongodb/ca.pem
    allowConnectionsWithoutCertificates: true
```

## Step 3: Configure Firewall Rules

Allow only application servers to reach MongoDB:

```bash
# UFW example - allow only app servers on port 27017
sudo ufw allow from 10.0.2.0/24 to any port 27017  # App subnet
sudo ufw deny 27017  # Deny all other access

# Verify rules
sudo ufw status numbered
```

For AWS Security Groups:

```json
{
  "IpPermissions": [{
    "IpProtocol": "tcp",
    "FromPort": 27017,
    "ToPort": 27017,
    "IpRanges": [
      { "CidrIp": "10.0.2.0/24", "Description": "App servers" },
      { "CidrIp": "10.0.1.0/24", "Description": "MongoDB replica members" }
    ]
  }]
}
```

## Step 4: Configure Internal Replica Set Communication

Replica set members authenticate with each other using a keyfile:

```bash
# Generate keyfile
openssl rand -base64 756 > /etc/mongodb/keyfile
chmod 400 /etc/mongodb/keyfile
chown mongod:mongod /etc/mongodb/keyfile
```

```yaml
# mongod.conf - replica set authentication
security:
  keyFile: /etc/mongodb/keyfile
  authorization: enabled
```

## Step 5: Set Up MongoDB Atlas VPC Peering

For Atlas deployments, configure VPC peering to avoid public internet routing:

```bash
# Create VPC peering via Atlas Admin API
curl -u "PUBLIC_KEY:PRIVATE_KEY" \
  --digest \
  -X POST \
  "https://cloud.mongodb.com/api/atlas/v1.0/groups/{groupId}/peers" \
  -H "Content-Type: application/json" \
  -d '{
    "containerId": "{containerId}",
    "accepterRegionName": "us-east-1",
    "awsAccountId": "123456789012",
    "routeTableCidrBlock": "10.0.0.0/16",
    "vpcId": "vpc-0abc123def456"
  }'
```

After creating the peer, accept it in your AWS console, then add routes in your route tables.

## Step 6: Restrict Connection String Exposure

Use environment variables for connection strings. Never hardcode credentials:

```bash
# In application environment
MONGODB_URI="mongodb://appuser:${MONGO_PASSWORD}@10.0.1.10:27017,10.0.1.11:27017,10.0.1.12:27017/myapp?replicaSet=rs0&tls=true&tlsCAFile=/etc/mongodb/ca.pem&authSource=myapp"
```

In Kubernetes, store as a Secret:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: mongodb-credentials
type: Opaque
stringData:
  uri: "mongodb://appuser:password@mongo-svc:27017/myapp?replicaSet=rs0&tls=true"
```

## Step 7: Test Network Connectivity

Validate connectivity from application servers:

```bash
# Test TCP connectivity
nc -zv mongo1.internal.example.com 27017

# Test with TLS
mongosh "mongodb://mongo1.internal.example.com:27017" \
  --tls \
  --tlsCAFile /etc/mongodb/ca.pem \
  --eval "db.adminCommand({ ping: 1 })"
```

## Summary

Configuring MongoDB networking for production requires binding to private IP addresses only, enabling TLS with properly managed certificates, restricting port 27017 via firewall rules to only trusted CIDR ranges, securing intra-replica set communication with keyfiles, and using VPC peering for Atlas deployments to keep traffic off the public internet. Never expose MongoDB on 0.0.0.0 or without TLS in any production environment.
