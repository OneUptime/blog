# How to Configure ZooKeeper with IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, ZooKeeper, Apache ZooKeeper, Distributed Coordination, Kafka

Description: Learn how to configure Apache ZooKeeper to listen on IPv6 addresses for client connections and cluster (quorum) communication, enabling IPv6-native coordination services.

## ZooKeeper Configuration File

```properties
# /etc/zookeeper/conf/zoo.cfg (or /opt/zookeeper/conf/zoo.cfg)

# Data directory

dataDir=/var/lib/zookeeper

# Client port - ZooKeeper 3.5+ supports binding to specific address
# Bind to IPv6 address for client connections
clientPort=2181
clientPortAddress=2001:db8::10

# Or listen on all interfaces (default behavior):
# clientPortAddress=::

# Tick time
tickTime=2000
initLimit=10
syncLimit=5

# Cluster members (quorum) - use IPv6 addresses
# IPv6 addresses must be enclosed in brackets so the parser
# can distinguish address colons from port separators.
# server.ID=[host]:quorum_port:election_port
server.1=[2001:db8::10]:2888:3888
server.2=[2001:db8::11]:2888:3888
server.3=[2001:db8::12]:2888:3888
```

## ZooKeeper 3.5+ Multi-Address Configuration

```properties
# ZooKeeper 3.5+ - bind to specific IPv6 address
# Use secureClientPort for TLS
secureClientPort=2281
secureClientPortAddress=2001:db8::10

# Admin server (HTTP)
admin.serverPort=8080
admin.serverAddress=2001:db8::10

# For clusters: specify addresses per server
# server.ID=[address]:quorum_port:election_port;[client_address]:client_port
server.1=[2001:db8::10]:2888:3888;[2001:db8::10]:2181
server.2=[2001:db8::11]:2888:3888;[2001:db8::11]:2181
server.3=[2001:db8::12]:2888:3888;[2001:db8::12]:2181
```

## JVM IPv6 Configuration

```bash
# /etc/zookeeper/conf/java.env (or equivalent)

export SERVER_JVMFLAGS="-Djava.net.preferIPv6Addresses=true $SERVER_JVMFLAGS"

# Or to disable the IPv4 stack (forces IPv6 in dual-stack JVMs)
export SERVER_JVMFLAGS="-Djava.net.preferIPv4Stack=false -Djava.net.preferIPv6Addresses=true $SERVER_JVMFLAGS"
```

## Verify and Test

```bash
# Restart ZooKeeper
systemctl restart zookeeper

# Check listening ports
ss -6 -tlnp | grep java | grep 2181

# Test ZooKeeper connection with zkCli
zkCli.sh -server [2001:db8::10]:2181

# Check ZooKeeper status
echo "stat" | nc -6 2001:db8::10 2181

# Check four-letter commands
echo "mntr" | nc -6 2001:db8::10 2181
echo "ruok" | nc -6 2001:db8::10 2181
# Expected: imok
```

## ZooKeeper Operations over IPv6

```bash
# Connect with zkCli
zkCli.sh -server [2001:db8::10]:2181

# Inside zkCli:
# Create a znode
create /myapp "Hello IPv6"

# Read a znode
get /myapp

# List children
ls /

# Delete a znode
delete /myapp

# Exit
quit
```

## Python Kazoo Client over IPv6

```python
from kazoo.client import KazooClient

# Connect to ZooKeeper via IPv6
zk = KazooClient(hosts='[2001:db8::10]:2181,[2001:db8::11]:2181,[2001:db8::12]:2181')
zk.start()

# Ensure a path exists
zk.ensure_path("/myapp/config")

# Set a value
zk.set("/myapp/config", b"version=1")

# Get a value
data, stat = zk.get("/myapp/config")
print(f"Config: {data.decode()}, Version: {stat.version}")

# Watch for changes
@zk.DataWatch("/myapp/config")
def watch_node(data, stat, event):
    print(f"Data changed: {data}")

# Stop when done
zk.stop()
```

## Kafka ZooKeeper with IPv6

```properties
# Kafka server.properties - ZooKeeper connection over IPv6
zookeeper.connect=[2001:db8::10]:2181,[2001:db8::11]:2181,[2001:db8::12]:2181/kafka

# ZooKeeper connection timeout
zookeeper.connection.timeout.ms=18000
zookeeper.session.timeout.ms=18000
```

## Summary

Configure ZooKeeper for IPv6 with `clientPortAddress=2001:db8::10` in `zoo.cfg`. For ZooKeeper 3.5+, use `server.ID=[2001:db8::10]:2888:3888;[2001:db8::10]:2181` syntax. Add `-Djava.net.preferIPv6Addresses=true` to `SERVER_JVMFLAGS`. Test with `echo "ruok" | nc -6 2001:db8::10 2181` (should return `imok`). Connect clients using `[2001:db8::10]:2181` bracket notation. For Kafka, set `zookeeper.connect=[2001:db8::10]:2181`.
