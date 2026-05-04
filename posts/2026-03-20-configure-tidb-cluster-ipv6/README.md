# How to Configure TiDB Cluster with IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: TiDB, IPv6, Distributed Database, MySQL-compatible, Tikv, PD, Cluster

Description: Configure a TiDB distributed database cluster with IPv6 addresses for PD, TiKV, and TiDB components, enabling MySQL-compatible distributed SQL over IPv6 networks.

---

TiDB is a distributed, MySQL-compatible database. Its cluster has three main components: PD (Placement Driver), TiKV (key-value store), and TiDB (SQL layer). Each can be configured for IPv6 communication.

## TiDB Cluster Components with IPv6

```text
TiDB (SQL)          TiKV (Storage)      PD (Metadata)
[2001:db8::1]:4000  [2001:db8::2]:20160 [2001:db8::3]:2379
MySQL-compatible    Raft consensus      Cluster metadata
```

## Installing TiDB with TiUP

```bash
# Install TiUP (TiDB deployment tool)

curl --proto '=https' --tlsv1.2 -sSf https://tiup-mirrors.pingcap.com/install.sh | sh
source ~/.bashrc

tiup --version
```

## TiUP Topology Configuration for IPv6

```yaml
# topology-ipv6.yaml
global:
  user: "tidb"
  data_dir: "/data/tidb"
  log_dir: "/data/logs"

pd_servers:
  - host: 2001:db8::1
    # PD listens on IPv6
    client_port: 2379
    peer_port: 2380

tikv_servers:
  - host: 2001:db8::2
    port: 20160
    status_port: 20180
    config:
      server.addr: "[2001:db8::2]:20160"
      server.advertise-addr: "[2001:db8::2]:20160"

  - host: 2001:db8::3
    port: 20160
    status_port: 20180

tidb_servers:
  - host: 2001:db8::1
    port: 4000
    status_port: 10080
    config:
      # TiDB configuration
```

```bash
# Deploy the cluster with IPv6 topology
tiup cluster deploy tidb-ipv6-cluster v7.5.0 \
  ./topology-ipv6.yaml \
  --yes

# Start the cluster
tiup cluster start tidb-ipv6-cluster

# Check status
tiup cluster display tidb-ipv6-cluster
```

## Manual PD Configuration for IPv6

```toml
# /etc/pd/pd.toml

name = "pd1"
data-dir = "/data/pd"

# Client URLs - where clients (TiDB, TiKV) connect to PD
client-urls = "http://[2001:db8::1]:2379"
# Advertised client URL
advertise-client-urls = "http://[2001:db8::1]:2379"

# Peer URLs - for PD cluster peer communication
peer-urls = "http://[2001:db8::1]:2380"
advertise-peer-urls = "http://[2001:db8::1]:2380"

# Initial cluster
initial-cluster = "pd1=http://[2001:db8::1]:2380,pd2=http://[2001:db8::2]:2380"
initial-cluster-state = "new"
```

## TiKV Configuration for IPv6

```toml
# /etc/tikv/tikv.toml

[server]
# Listen on IPv6
addr = "[2001:db8::2]:20160"
advertise-addr = "[2001:db8::2]:20160"
status-addr = "[2001:db8::2]:20180"

[pd]
# PD endpoints
endpoints = ["[2001:db8::1]:2379", "[2001:db8::2]:2379"]
```

## TiDB Server Configuration for IPv6

```toml
# /etc/tidb/tidb.toml

# Host to listen on
host = "::"
# Port for MySQL connections
port = 4000
# Storage type and PD endpoints (comma-separated for multiple PDs)
store = "tikv"
path = "[2001:db8::1]:2379"

[status]
# Status port
status-port = 10080
```

## Connecting to TiDB over IPv6

```bash
# Connect using MySQL client
mysql -h 2001:db8::1 -P 4000 -u root

# Test in MySQL client
SELECT version();
SHOW DATABASES;

# Connection string for Python
# mysql+pymysql://root@[2001:db8::1]:4000/test
```

## Verifying TiDB Cluster Status

```bash
# Check PD status
curl http://[2001:db8::1]:2379/pd/api/v1/health

# Check TiKV stores
curl http://[2001:db8::1]:2379/pd/api/v1/stores

# Check TiDB status
curl http://[2001:db8::1]:10080/status

# Check all stores (should show IPv6 addresses)
curl http://[2001:db8::1]:2379/pd/api/v1/stores | \
  python3 -m json.tool | grep "address"
```

## Firewall Rules for TiDB IPv6

```bash
# Open all TiDB cluster ports for IPv6
sudo ip6tables -A INPUT -p tcp --dport 2379 -j ACCEPT  # PD client
sudo ip6tables -A INPUT -p tcp --dport 2380 -j ACCEPT  # PD peer
sudo ip6tables -A INPUT -p tcp --dport 4000 -j ACCEPT  # TiDB SQL
sudo ip6tables -A INPUT -p tcp --dport 10080 -j ACCEPT # TiDB status
sudo ip6tables -A INPUT -p tcp --dport 20160 -j ACCEPT # TiKV
sudo ip6tables -A INPUT -p tcp --dport 20180 -j ACCEPT # TiKV status

sudo ip6tables-save > /etc/ip6tables/rules.v6
```

TiDB's support for IPv6 in all its components - PD, TiKV, and TiDB server - enables deploying a fully distributed, MySQL-compatible database cluster on modern IPv6 infrastructure.
