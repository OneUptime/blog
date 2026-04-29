# How to Configure MongoDB Replica Set on IPv4

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Replica Set, IPv4, High Availability, Replication, Database

Description: Set up a MongoDB replica set across IPv4 nodes for high availability and automatic failover, configure replica set members, and initiate replication.

## Introduction

A MongoDB replica set provides redundancy and automatic failover. A minimum of 3 nodes is recommended (2 data-bearing members + 1 arbiter, or 3 data-bearing members). All members communicate using their configured IPv4 addresses.

## Configuration (All Nodes)

```yaml
# /etc/mongod.conf - apply to each node, adjust bindIp per node

net:
  port: 27017
  bindIp: 127.0.0.1,10.0.0.1    # Node-specific IP
  ipv6: false

security:
  authorization: enabled
  keyFile: /etc/mongodb/keyfile   # For inter-node auth

replication:
  replSetName: "rs0"             # Same name on all nodes

storage:
  dbPath: /var/lib/mongodb
```

## Generate Keyfile for Replica Set Auth

```bash
# Generate keyfile (same content on all nodes)

openssl rand -base64 756 | sudo tee /etc/mongodb/keyfile > /dev/null
sudo chmod 400 /etc/mongodb/keyfile
sudo chown mongodb:mongodb /etc/mongodb/keyfile

# Copy to all nodes
for node in 10.0.0.2 10.0.0.3; do
  sudo scp /etc/mongodb/keyfile $node:/etc/mongodb/keyfile
  ssh $node "sudo chmod 400 /etc/mongodb/keyfile && sudo chown mongodb:mongodb /etc/mongodb/keyfile"
done
```

## Starting Nodes and Initiating the Replica Set

```bash
# Start mongod on all nodes
sudo systemctl start mongod   # On each node

# Connect to Node 1 and initiate replica set:
mongosh

rs.initiate({
  _id: "rs0",
  members: [
    { _id: 0, host: "10.0.0.1:27017", priority: 2 },   // Preferred primary
    { _id: 1, host: "10.0.0.2:27017", priority: 1 },
    { _id: 2, host: "10.0.0.3:27017", priority: 1 }
  ]
})
```

## Firewall Rules for Replica Set

```bash
# All replica set members must reach each other on port 27017
RS_MEMBERS="10.0.0.1 10.0.0.2 10.0.0.3"

for member in $RS_MEMBERS; do
  sudo iptables -A INPUT -p tcp --dport 27017 -s $member -j ACCEPT
done

# App servers:
sudo iptables -A INPUT -p tcp --dport 27017 -s 10.0.0.0/24 -j ACCEPT

# Block everything else
sudo iptables -A INPUT -p tcp --dport 27017 -j DROP
```

## Verifying the Replica Set

```bash
# Check replica set status
mongosh "mongodb://admin:AdminPass@10.0.0.1:27017/admin"
rs.status()
# Shows: PRIMARY, SECONDARY nodes

# Check who is primary
rs.isMaster()
# Shows: ismaster, primary, hosts

# Check replication lag
rs.printReplicationInfo()
rs.printSecondaryReplicationInfo()   # rs.printSlaveReplicationInfo() was removed in MongoDB 5.0
```

## Application Connection String

```bash
# Connect to replica set (all members listed, driver picks primary)
mongosh "mongodb://appuser:pass@10.0.0.1:27017,10.0.0.2:27017,10.0.0.3:27017/appdb?replicaSet=rs0"

# With read preference (read from secondaries):
mongosh "mongodb://appuser:pass@10.0.0.1:27017,10.0.0.2:27017,10.0.0.3:27017/appdb?replicaSet=rs0&readPreference=secondaryPreferred"
```

## Conclusion

MongoDB replica sets require identical `replSetName` in all nodes' config, a shared keyfile for authentication, and open ports between all members. Initiate the set from any node with `rs.initiate()` specifying all member hostnames. Applications connect with a replica set URI listing all members-the driver handles primary discovery and failover automatically.
