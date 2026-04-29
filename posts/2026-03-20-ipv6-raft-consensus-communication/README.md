# How to Handle IPv6 in Raft Consensus Communication

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Raft, IPv6, Distributed System, Consensus, etcd, Vault, CockroachDB

Description: Configure Raft consensus protocol communication over IPv6 in distributed systems like etcd, Vault, and CockroachDB, including peer address formats and network configuration.

---

Raft is the consensus algorithm used by etcd, Vault, CockroachDB, and many other distributed systems. Its peer communication relies on direct node-to-node connections, making correct IPv6 address formatting essential for cluster formation and leader election.

## Raft IPv6 Address Requirements

```text
Raft peer communication needs:
1. Leader election: Each node advertises its IPv6 address for voting
2. Log replication: Leader connects to followers over IPv6
3. Snapshot transfer: Uses same IPv6 peer connections
4. Heartbeats: Regular IPv6 connections to prevent election timeouts
```

## etcd Raft with IPv6

etcd uses Raft internally. The peer URLs must use IPv6 bracket notation:

```bash
# Start etcd with IPv6 Raft peers
# Peer URLs are where other Raft members connect to this node.
# Client URLs are where clients connect to this node.

etcd \
  --name=node1 \
  --listen-peer-urls="https://[2001:db8::1]:2380" \
  --initial-advertise-peer-urls="https://[2001:db8::1]:2380" \
  --listen-client-urls="https://[2001:db8::1]:2379" \
  --advertise-client-urls="https://[2001:db8::1]:2379" \
  --initial-cluster="node1=https://[2001:db8::1]:2380,node2=https://[2001:db8::2]:2380,node3=https://[2001:db8::3]:2380" \
  --initial-cluster-state=new \
  --cert-file=/etc/etcd/server.crt \
  --key-file=/etc/etcd/server.key \
  --peer-cert-file=/etc/etcd/peer.crt \
  --peer-key-file=/etc/etcd/peer.key \
  --trusted-ca-file=/etc/etcd/ca.crt \
  --peer-trusted-ca-file=/etc/etcd/ca.crt
```

## Vault Raft with IPv6

Vault uses integrated Raft for its HA storage:

```hcl
# /etc/vault.d/vault.hcl

storage "raft" {
  path    = "/var/lib/vault/data"
  node_id = "vault-1"

  # Peer addresses for retry_join use IPv6 API addresses
  retry_join {
    leader_api_addr = "https://[2001:db8::2]:8200"
    leader_ca_cert_file = "/etc/vault.d/certs/ca.crt"
    leader_client_cert_file = "/etc/vault.d/certs/client.crt"
    leader_client_key_file  = "/etc/vault.d/certs/client.key"
  }
}

listener "tcp" {
  address         = "[2001:db8::1]:8200"
  cluster_address = "[2001:db8::1]:8201"
  tls_cert_file   = "/etc/vault.d/certs/server.crt"
  tls_key_file    = "/etc/vault.d/certs/server.key"
}

api_addr     = "https://[2001:db8::1]:8200"
cluster_addr = "https://[2001:db8::1]:8201"
```

## Implementing Raft in Go with IPv6

Example of a simple Raft implementation using `hashicorp/raft`:

```go
package main

import (
    "fmt"
    "io"
    "net"
    "time"

    "github.com/hashicorp/raft"
    raftboltdb "github.com/hashicorp/raft-boltdb/v2"
)

type fsm struct{}

func (f *fsm) Apply(*raft.Log) interface{} { return nil }

func (f *fsm) Snapshot() (raft.FSMSnapshot, error) {
    return &fsmSnapshot{}, nil
}

func (f *fsm) Restore(snapshot io.ReadCloser) error {
    defer snapshot.Close()
    return nil
}

type fsmSnapshot struct{}

func (s *fsmSnapshot) Persist(sink raft.SnapshotSink) error {
    return sink.Close()
}

func (s *fsmSnapshot) Release() {}

func setupRaftNode(nodeAddr string, peers []string) (*raft.Raft, error) {
    // Configuration
    config := raft.DefaultConfig()
    config.LocalID = raft.ServerID(nodeAddr)
    config.HeartbeatTimeout = 500 * time.Millisecond
    config.ElectionTimeout = 500 * time.Millisecond

    // ResolveTCPAddr handles bracketed IPv6 host:port values correctly.
    addr, err := net.ResolveTCPAddr("tcp6", nodeAddr)
    if err != nil {
        return nil, fmt.Errorf("failed to resolve %s: %w", nodeAddr, err)
    }

    transport, err := raft.NewTCPTransport(
        addr.String(),
        addr,
        3,
        10*time.Second,
        nil,
    )
    if err != nil {
        return nil, fmt.Errorf("failed to create transport: %w", err)
    }

    // Create stable store and log store
    boltDB, err := raftboltdb.NewBoltStore("/var/lib/myapp/raft.db")
    if err != nil {
        return nil, err
    }

    snapshots, err := raft.NewFileSnapshotStore("/var/lib/myapp/snapshots", 2, nil)
    if err != nil {
        return nil, err
    }

    // Create Raft node
    r, err := raft.NewRaft(config, &fsm{}, boltDB, boltDB, snapshots, transport)
    if err != nil {
        return nil, err
    }

    // Bootstrap new nodes with the full voter configuration.
    configuration := raft.Configuration{
        Servers: make([]raft.Server, len(peers)),
    }
    for i, peer := range peers {
        configuration.Servers[i] = raft.Server{
            ID:      raft.ServerID(peer),
            Address: raft.ServerAddress(peer),
        }
    }
    if err := r.BootstrapCluster(configuration).Error(); err != nil && err != raft.ErrCantBootstrap {
        return nil, err
    }

    return r, nil
}

// Usage:
// node, _ := setupRaftNode("[2001:db8::1]:7000",
//   []string{"[2001:db8::1]:7000", "[2001:db8::2]:7000", "[2001:db8::3]:7000"})
```

## CockroachDB Raft with IPv6

CockroachDB uses Raft per-range internally:

```bash
# CockroachDB uses Raft internally - the IPv6 config is at the node level
cockroach start \
  --advertise-addr=[2001:db8::1]:26257 \
  --listen-addr=[2001:db8::1]:26257 \
  --join=[2001:db8::1]:26257,[2001:db8::2]:26257,[2001:db8::3]:26257

# Inspect range replicas and leaseholders
cockroach sql \
  --host=[2001:db8::1]:26257 \
  --insecure \
  --execute="SHOW RANGES FROM DATABASE system WITH DETAILS;"
```

## Monitoring Raft Health over IPv6

```bash
# etcd Raft status
etcdctl --endpoints="https://[2001:db8::1]:2379" \
  --cacert=/etc/etcd/ca.crt \
  endpoint status --write-out=table

# Check endpoint health
etcdctl --endpoints="https://[2001:db8::1]:2379" \
  --cacert=/etc/etcd/ca.crt \
  endpoint health

# Vault Raft status
VAULT_ADDR="https://[2001:db8::1]:8200" \
VAULT_CACERT="/etc/vault.d/certs/ca.crt" \
vault operator raft list-peers

# CockroachDB node and range status
cockroach node status 1 \
  --host=[2001:db8::1]:26257 \
  --insecure \
  --ranges
```

Raft consensus communication over IPv6 is fully supported by major distributed systems; the key requirement is using bracket notation for IPv6 addresses in peer URLs and ensuring TLS certificates include the IPv6 addresses in their IP SANs for encrypted peer communication.
