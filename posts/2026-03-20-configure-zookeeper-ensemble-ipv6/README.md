# How to Configure ZooKeeper Ensemble with IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ZooKeeper, IPv6, Distributed Coordination, Ensemble, Kafka, Configuration

Description: Configure an Apache ZooKeeper ensemble to use IPv6 addresses for client connections and peer communication, supporting Kafka and other ZooKeeper-dependent services.

---

Apache ZooKeeper provides distributed coordination services. Configuring ZooKeeper for IPv6 requires setting IPv6 addresses in `zoo.cfg` and enabling IPv6 in the JVM. Many systems like Kafka depend on ZooKeeper, making its IPv6 configuration critical.

## ZooKeeper zoo.cfg for IPv6

```properties
# /etc/zookeeper/conf/zoo.cfg

# Tick time in milliseconds

tickTime=2000

# Data and log directories
dataDir=/var/lib/zookeeper/data
dataLogDir=/var/lib/zookeeper/log

# Client connection port
# For IPv6, set clientPortAddress to bind to IPv6
clientPort=2181
clientPortAddress=2001:db8::1

# Or to listen on ALL interfaces (including IPv6):
# clientPortAddress=::

# Init limit - how many ticks during initial sync
initLimit=10

# Sync limit - max ticks between requests and responses
syncLimit=5

# Ensemble members (IPv6 literals MUST be wrapped in brackets so the
# parser can separate the address from the peer/election ports)
server.1=[2001:db8::1]:2888:3888
server.2=[2001:db8::2]:2888:3888
server.3=[2001:db8::3]:2888:3888

# Whitelist 4-letter commands (disabled by default since 3.5.3)
4lw.commands.whitelist=stat,ruok,conf,isro,mntr,srvr

# Enable admin server on IPv6
admin.serverAddress=2001:db8::1
admin.serverPort=8080
```

## JVM Options for IPv6

```bash
# /etc/zookeeper/conf/java.env or the startup script
export JVMFLAGS="-Djava.net.preferIPv6Addresses=true \
  -Djava.net.preferIPv4Stack=false \
  -Xmx2g -Xms2g"

# For ZooKeeper 3.6+, set in zookeeper-env.sh:
JVMFLAGS="-Djava.net.preferIPv6Addresses=true"
```

## Setting ZooKeeper My ID

On each node, set the myid file:

```bash
# On node 1
echo "1" > /var/lib/zookeeper/data/myid

# On node 2
echo "2" > /var/lib/zookeeper/data/myid

# On node 3
echo "3" > /var/lib/zookeeper/data/myid
```

## Starting ZooKeeper with IPv6

```bash
# Start ZooKeeper on each node
sudo systemctl start zookeeper

# Verify listening on IPv6
ss -tlnp | grep :2181
# Expected: [2001:db8::1]:2181

# Check ZooKeeper logs
sudo journalctl -u zookeeper | grep -i "ipv6\|address\|bind"

# Or traditional log
sudo tail -50 /var/log/zookeeper/zookeeper.log
```

## Testing ZooKeeper over IPv6

```bash
# Connect with zkCli
zkCli.sh -server "[2001:db8::1]:2181"

# Or with multiple servers
zkCli.sh -server "[2001:db8::1]:2181,[2001:db8::2]:2181,[2001:db8::3]:2181"

# In zkCli session:
# ls /
# create /test "ipv6-test"
# get /test

# Test with netcat
echo ruok | nc -6 2001:db8::1 2181
# Should return: imok

# Check 4-letter commands
echo stat | nc -6 2001:db8::1 2181
echo mntr | nc -6 2001:db8::1 2181 | grep -i "zk_version\|zk_leader"
```

## Configuring Kafka to Use IPv6 ZooKeeper

```properties
# /etc/kafka/server.properties

# ZooKeeper connection with IPv6 addresses
zookeeper.connect=[2001:db8::1]:2181,[2001:db8::2]:2181,[2001:db8::3]:2181/kafka

# Kafka broker with IPv6
listeners=PLAINTEXT://[2001:db8::10]:9092
advertised.listeners=PLAINTEXT://[2001:db8::10]:9092
```

## ZooKeeper Admin Server IPv6

ZooKeeper 3.5+ includes an embedded admin server:

```properties
# zoo.cfg
admin.enableServer=true
admin.serverAddress=2001:db8::1
admin.serverPort=8080
```

```bash
# Access admin server
curl http://[2001:db8::1]:8080/commands/stat
curl http://[2001:db8::1]:8080/commands/mntr
```

## Firewall Rules for ZooKeeper IPv6

```bash
# Allow ZooKeeper ports for IPv6
sudo ip6tables -A INPUT -p tcp --dport 2181 -j ACCEPT  # Client
sudo ip6tables -A INPUT -p tcp --dport 2888 -j ACCEPT  # Follower-to-leader
sudo ip6tables -A INPUT -p tcp --dport 3888 -j ACCEPT  # Leader election
sudo ip6tables -A INPUT -p tcp --dport 8080 -j ACCEPT  # Admin server

sudo ip6tables-save > /etc/iptables/rules.v6
```

ZooKeeper ensemble configuration for IPv6 is straightforward with the `clientPortAddress` directive and JVM IPv6 preference flags, making it suitable as a coordination service for Kafka, HBase, and other IPv6-enabled distributed systems.
