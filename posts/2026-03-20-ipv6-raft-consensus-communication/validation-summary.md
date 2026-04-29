# Validation Summary: How to Handle IPv6 in Raft Consensus Communication

## Status
validated

## Post Type
Guide

## Technologies Covered
- Raft
- IPv6
- etcd
- Vault integrated storage
- Go (`hashicorp/raft`)
- CockroachDB
- TLS / X.509 SAN handling

## Sources Consulted
- RFC 3986 URI generic syntax: https://datatracker.ietf.org/doc/html/rfc3986/
- etcd configuration options: https://etcd.io/docs/v3.4/op-guide/configuration/
- etcd cluster status checks: https://etcd.io/docs/v3.5/tutorials/how-to-check-cluster-status/
- etcd transport security model: https://etcd.io/docs/v3.6/op-guide/security/
- Vault integrated storage configuration: https://developer.hashicorp.com/vault/docs/configuration/storage/raft
- Vault TCP listener configuration: https://developer.hashicorp.com/vault/docs/configuration/listener/tcp
- Vault general configuration parameters: https://developer.hashicorp.com/vault/docs/configuration
- Vault `operator raft` command reference: https://developer.hashicorp.com/vault/docs/commands/operator/raft
- Go package docs for `github.com/hashicorp/raft`: https://pkg.go.dev/github.com/hashicorp/raft
- Go package docs for `github.com/hashicorp/raft-boltdb/v2`: https://pkg.go.dev/github.com/hashicorp/raft-boltdb/v2
- CockroachDB `cockroach start`: https://www.cockroachlabs.com/docs/stable/cockroach-start.html
- CockroachDB commands overview: https://www.cockroachlabs.com/docs/stable/cockroach-commands
- CockroachDB `cockroach node`: https://www.cockroachlabs.com/docs/stable/cockroach-node
- CockroachDB `SHOW RANGES`: https://www.cockroachlabs.com/docs/stable/show-ranges
- CockroachDB monitoring and alerting: https://www.cockroachlabs.com/docs/stable/monitoring-and-alerting

## Issues Found
- The `etcd` startup snippet was not executable as written because it placed comment lines inside a backslash-continued shell command, and the multi-line `--initial-cluster` value risked introducing unwanted whitespace. I moved the comments outside the continued command and normalized the cluster value to a single valid argument.
- The Vault example did not actually configure the local node to listen on IPv6 for API and cluster traffic. I added the documented `listener "tcp"` IPv6 `address` and `cluster_address`, plus `api_addr`, so the node both binds and advertises IPv6 addresses correctly.
- The Go example was not self-contained and used an older `raft-boltdb` import path. I updated it to `github.com/hashicorp/raft-boltdb/v2`, added minimal `FSM` and `FSMSnapshot` implementations required by `raft.NewRaft`, corrected the transport comment to match `net.ResolveTCPAddr`, and handled the `BootstrapCluster()` future error instead of ignoring it.
- The CockroachDB examples referenced `cockroach debug raft-log` and `/_status/raft`, which do not match current documented user-facing guidance. I replaced them with documented commands: `cockroach sql ... SHOW RANGES ... WITH DETAILS` for range/leaseholder inspection and `cockroach node status ... --ranges` for node/range health.
- The etcd and Vault monitoring examples did not explicitly show the TLS CA configuration needed for HTTPS examples. I added `--cacert` for `etcdctl` and `VAULT_CACERT` for the Vault CLI example.
- The closing TLS wording was imprecise. I changed “IPv6 SANs” to the more accurate requirement that certificates include the IPv6 addresses in their IP SANs when connecting by literal IPv6 address.

## Review Notes
- The post is now technically sound, but the Go example still remains intentionally minimal. In production code, a stable `ServerID` that is not tied to the network address is often preferable, even though using the address as the ID is valid.
- The CockroachDB section correctly frames IPv6 as a node-level configuration concern because Raft is internal per range; there is no separate IPv6-specific Raft peer CLI to configure there.
