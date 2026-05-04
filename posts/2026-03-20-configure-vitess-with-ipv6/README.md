# How to Configure Vitess with IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Vitess, IPv6, MySQL, Sharding, Kubernetes, Distributed Database

Description: Configure Vitess database clustering middleware to operate over IPv6, covering vtctld, vttablet, and vtgate component addressing for IPv6 network environments.

---

Vitess is a database clustering system for MySQL horizontal scaling, widely used in Kubernetes environments. Configuring it for IPv6 involves specifying IPv6 addresses for its interconnected components.

## Vitess Component Overview

```text
vtgate (Query Router)    vtctld (Control)    vttablet (MySQL proxy)
[2001:db8::1]:15001     [2001:db8::1]:15000  [2001:db8::2]:15100
Client-facing           Management          Per-MySQL-instance
```

## Configuring vtctld for IPv6

vtctld is the Vitess control plane service:

```bash
# Start vtctld with IPv6 addresses

vtctld \
  --topo_implementation etcd2 \
  --topo_global_server_address "[2001:db8::3]:2379" \
  --topo_global_root /vitess/global \
  --cell global \
  --workflow_manager_init \
  --workflow_manager_use_election \
  --service_map 'grpc-vtctl,grpc-vtctld' \
  --backup_storage_implementation file \
  --file_backup_storage_root /backups/vitess \
  --port 15000 \
  --grpc_port 15999 \
  --pid_file /run/vitess/vtctld.pid \
  2>&1 | tee /var/log/vitess/vtctld.log &
```

## Configuring vttablet for IPv6

```bash
# Start vttablet with IPv6
vttablet \
  --topo_implementation etcd2 \
  --topo_global_server_address "[2001:db8::3]:2379" \
  --topo_global_root /vitess/global \
  --cell zone1 \
  --tablet-path zone1-0000000100 \
  --tablet_hostname 2001:db8::2 \
  --init_keyspace commerce \
  --init_shard - \
  --init_tablet_type replica \
  --health_check_interval 5s \
  --port 15100 \
  --grpc_port 16100 \
  --db_host 2001:db8::db \
  --db_port 3306 \
  --db_app_user vitess_app \
  --db_app_password vitess_password \
  2>&1 | tee /var/log/vitess/vttablet.log &
```

## Configuring vtgate for IPv6

vtgate is the query router - the entry point for application connections:

```bash
# Start vtgate with IPv6
vtgate \
  --topo_implementation etcd2 \
  --topo_global_server_address "[2001:db8::3]:2379" \
  --topo_global_root /vitess/global \
  --cell zone1 \
  --cells_to_watch zone1 \
  --tablet_types_to_wait PRIMARY,REPLICA \
  --service_map 'grpc-vtgateservice' \
  --mysql_server_port 3306 \
  --mysql_server_bind_address '::' \
  --port 15001 \
  --grpc_port 15991 \
  --pid_file /run/vitess/vtgate.pid \
  2>&1 | tee /var/log/vitess/vtgate.log &

# vtgate MySQL port listens on [::]:3306 (all IPv6 interfaces)
```

## Connecting to Vitess via MySQL Client over IPv6

```bash
# Connect to vtgate MySQL port using IPv6
mysql -h 2001:db8::1 -P 3306 -u user -p

# Connection string for Python
# mysql+pymysql://user:password@[2001:db8::1]:3306/commerce

# Test with vtctlclient
vtctlclient \
  --server "[2001:db8::1]:15999" \
  GetTablets
```

## Vitess on Kubernetes with IPv6

```yaml
# vtgate-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: vtgate
  namespace: vitess
spec:
  replicas: 2
  selector:
    matchLabels:
      app: vtgate
  template:
    metadata:
      labels:
        app: vtgate
    spec:
      containers:
        - name: vtgate
          image: vitess/base:latest
          command:
            - vtgate
            - --topo_implementation=etcd2
            - --topo_global_server_address=etcd:2379
            - --topo_global_root=/vitess/global
            - --mysql_server_bind_address=::
            - --mysql_server_port=3306
          ports:
            - containerPort: 3306   # MySQL
            - containerPort: 15001  # HTTP
```

## Verifying Vitess IPv6 Operation

```bash
# Check vtgate is listening on IPv6
ss -tlnp | grep "3306\|15001"

# Test MySQL connection over IPv6
mysql -h 2001:db8::1 -P 3306 -u user -p \
  -e "SHOW DATABASES;"

# Check topology via vtctlclient
vtctlclient --server "[2001:db8::1]:15999" \
  GetCellInfoNames

# View tablet status
vtctlclient --server "[2001:db8::1]:15999" \
  ListTablets zone1
```

Vitess's configurable bind addresses for each component enable full IPv6 support, making it suitable for modern Kubernetes-based MySQL scaling deployments in IPv6-native environments.
