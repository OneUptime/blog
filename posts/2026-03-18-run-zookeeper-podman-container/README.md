# How to Run Zookeeper in a Podman Container

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, ZooKeeper, Coordination, Distributed System

Description: Learn how to run Apache Zookeeper in a Podman container for distributed coordination, configuration management, and service discovery.

---

> Zookeeper in Podman provides a reliable distributed coordination service in a lightweight container that can run rootless for your cluster infrastructure.

Apache Zookeeper is a centralized service for maintaining configuration information, naming, providing distributed synchronization, and providing group services. It is used by many distributed systems including older versions of Kafka, HBase, and Solr. Running it in a Podman container simplifies setup and keeps your coordination service isolated and portable.

---

## Pulling the Zookeeper Image

Download the official Zookeeper image.

```bash
# Pull the Zookeeper 3.9 image

podman pull docker.io/library/zookeeper:3.9

# Verify the image
podman images | grep zookeeper
```

## Running a Basic Zookeeper Container

Start a single Zookeeper node.

```bash
# Run Zookeeper in detached mode
podman run -d \
  --name my-zookeeper \
  -p 2181:2181 \
  -p 2888:2888 \
  -p 3888:3888 \
  -p 8080:8080 \
  -e ZOO_4LW_COMMANDS_WHITELIST=ruok,stat,conf,isro,mntr,srvr \
  docker.io/library/zookeeper:3.9

# Confirm the container is running
podman ps

# Check Zookeeper status using the four-letter command
echo "ruok" | nc localhost 2181
# Should return: imok

# Get server status
echo "stat" | nc localhost 2181
```

## Persistent Data Storage

Preserve Zookeeper data and transaction logs across restarts.

```bash
# Create volumes for Zookeeper data and logs
podman volume create zk-data
podman volume create zk-datalog

# Run Zookeeper with persistent storage
podman run -d \
  --name zk-persistent \
  -p 2182:2181 \
  -v zk-data:/data:Z \
  -v zk-datalog:/datalog:Z \
  docker.io/library/zookeeper:3.9

# Verify volumes are attached
podman inspect zk-persistent --format '{{range .Mounts}}{{.Name}} {{end}}'
```

## Custom Zookeeper Configuration

Mount a custom configuration for advanced settings.

```bash
# Create a config directory
mkdir -p ~/zk-config
podman volume create zk-custom-data
podman volume create zk-custom-datalog

# Write a custom zoo.cfg
cat > ~/zk-config/zoo.cfg <<'EOF'
# The number of milliseconds of each tick
tickTime=2000

# The number of ticks for initial synchronization phase
initLimit=10

# The number of ticks for sending a request and getting an acknowledgement
syncLimit=5

# The directory where the snapshot is stored
dataDir=/data

# The directory where the transaction log is stored
dataLogDir=/datalog

# The port at which the clients will connect
clientPort=2181

# Maximum number of client connections
maxClientCnxns=60

# Autopurge settings to clean old snapshots
autopurge.snapRetainCount=3
autopurge.purgeInterval=1

# Admin server port
admin.serverPort=8080
admin.enableServer=true

# Four-letter word commands whitelist
4lw.commands.whitelist=stat,ruok,conf,isro,mntr,srvr
EOF

# Run Zookeeper with custom config
podman run -d \
  --name zk-custom \
  -p 2183:2181 \
  -p 8081:8080 \
  -v ~/zk-config/zoo.cfg:/conf/zoo.cfg:Z \
  -v zk-custom-data:/data:Z \
  -v zk-custom-datalog:/datalog:Z \
  docker.io/library/zookeeper:3.9
```

## Working with Zookeeper Data

Use the Zookeeper CLI to create and manage znodes.

```bash
# Run Zookeeper CLI commands
podman exec -i my-zookeeper zkCli.sh -server localhost:2181 <<'EOF'
ls /
create /myapp "application-config"
create /myapp/database "host=db.example.com,port=5432"
get /myapp/database
set /myapp/database "host=new-db.example.com,port=5432"
ls /myapp
create -e /myapp/leader "node-1"
create -s /myapp/worker- "worker-data"
stat /myapp
quit
EOF
```

## Monitoring Zookeeper

Use four-letter commands and the admin server to monitor health.

```bash
# Check if the server is running (should return "imok")
echo "ruok" | nc localhost 2181

# Get server configuration
echo "conf" | nc localhost 2181

# Check if the server is in read-only mode
echo "isro" | nc localhost 2181

# Get detailed monitoring stats
echo "mntr" | nc localhost 2181

# Get server details
echo "srvr" | nc localhost 2181

# Use the admin server REST API (port 8080)
curl -s http://localhost:8080/commands/stat | python3 -m json.tool | head -20
```

## Managing the Container

Common management commands.

```bash
# View Zookeeper logs
podman logs my-zookeeper

# Stop and start
podman stop my-zookeeper
podman start my-zookeeper

# Remove containers and volumes
podman rm -f my-zookeeper zk-persistent zk-custom
podman volume rm zk-data zk-datalog zk-custom-data zk-custom-datalog
```

## Summary

Running Zookeeper in a Podman container provides a self-contained coordination service that is easy to configure and monitor. Separate volumes for data and transaction logs ensure durability, while custom configuration files let you tune tick times, connection limits, and autopurge settings. The four-letter commands and admin server REST API give you visibility into cluster health. Podman can run containers rootlessly to keep Zookeeper isolated, making this setup ideal for development environments and supporting distributed applications that depend on Zookeeper for coordination.
