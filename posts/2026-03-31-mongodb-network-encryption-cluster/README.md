# How to Implement Network Encryption Between MongoDB Cluster Members

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, TLS, Security, Replica Set, Encryption

Description: Learn how to enable TLS encryption for internal MongoDB cluster communications between replica set members and shards to prevent eavesdropping on intra-cluster traffic.

---

By default, MongoDB replica set members and shard nodes communicate over unencrypted TCP connections. Enabling TLS for intra-cluster traffic protects data in transit between nodes, which is especially important in shared or multi-tenant environments.

## Generate Certificates for Each Node

Each cluster member needs a certificate. In production, use certificates from your internal CA. For testing, use a self-signed CA:

```bash
# Create a CA
openssl req -x509 -newkey rsa:4096 -days 3650 -nodes \
  -keyout ca.key -out ca.crt \
  -subj "/CN=MongoDB Internal CA"

# Create a CSR for a cluster member
openssl req -newkey rsa:2048 -nodes \
  -keyout node1.key -out node1.csr \
  -subj "/O=MongoDB Cluster/OU=Internal/CN=node1.example.com"

# Sign the certificate with the CA
openssl x509 -req -in node1.csr -CA ca.crt -CAkey ca.key \
  -CAcreateserial -out node1.crt -days 365

# Combine key and certificate into a PEM file (required by MongoDB)
cat node1.key node1.crt > node1.pem
```

Repeat for each cluster member.

## Configure TLS on Each mongod Node

Update `/etc/mongod.conf` on each node:

```yaml
net:
  port: 27017
  bindIp: 0.0.0.0
  tls:
    mode: requireTLS
    certificateKeyFile: /etc/ssl/mongodb/node1.pem
    CAFile: /etc/ssl/mongodb/ca.crt
```

Set file permissions:

```bash
chmod 400 /etc/ssl/mongodb/node1.pem
chmod 444 /etc/ssl/mongodb/ca.crt
chown mongod:mongod /etc/ssl/mongodb/node1.pem
```

Restart `mongod` on each node:

```bash
systemctl restart mongod
```

## Configure Cluster Internal Authentication with x.509

For replica sets and sharded clusters, use x.509 certificates for member authentication instead of keyfiles. Set the `clusterAuthMode` and update the replica set config:

```yaml
security:
  clusterAuthMode: x509

net:
  tls:
    mode: requireTLS
    certificateKeyFile: /etc/ssl/mongodb/node1.pem
    CAFile: /etc/ssl/mongodb/ca.crt
    allowInvalidHostnames: false
```

The Subject (or SAN) in each node's certificate must match the member hostname.

## Update the Replica Set Members

If transitioning an existing replica set from no-TLS to TLS, do a rolling upgrade:

```bash
# Step 1: Switch to allowTLS mode on each node (accepts both TLS and non-TLS)
# net.tls.mode: allowTLS

# Step 2: Switch to preferTLS mode on each node
# net.tls.mode: preferTLS

# Step 3: Switch to requireTLS mode on each node
# net.tls.mode: requireTLS
```

This avoids downtime by allowing the cluster to maintain connectivity during the transition.

## Connect a Client with TLS

Once `requireTLS` is set, all client connections must use TLS:

```bash
mongosh \
  --host node1.example.com:27017 \
  --tls \
  --tlsCAFile /etc/ssl/mongodb/ca.crt \
  --tlsCertificateKeyFile /etc/ssl/mongodb/client.pem
```

Or via connection string:

```text
mongodb://node1.example.com:27017/?tls=true&tlsCAFile=/etc/ssl/mongodb/ca.crt
```

## Verify TLS is Active

Check the current TLS mode:

```javascript
db.adminCommand({ getParameter: 1, tlsMode: 1 })
```

Check authenticated user (confirms x.509 authentication is working):

```javascript
db.runCommand({ connectionStatus: 1 })
```

## Summary

Enabling TLS between MongoDB cluster members protects intra-cluster traffic from eavesdropping. Deploy certificates signed by an internal CA, configure `net.tls.mode: requireTLS` on each node, and use x.509 for cluster member authentication. Perform a rolling upgrade from `allowTLS` to `requireTLS` to avoid downtime on existing clusters.
