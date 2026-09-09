# Validation Summary: Why an etcd Learner Can Pass a Probe but Reject Client Requests

## Status

validated

## Post Type

Technical troubleshooting guide with HTTP probe and etcdctl command examples.

## Technologies Covered

- etcd v3.6.0 and v3.7.1 learner membership and promotion
- Raft replication and read consistency
- HTTP liveness and readiness probes
- gRPC unary and streaming RPC restrictions
- etcdctl and curl
- Mutual TLS and role-based access control (RBAC)

## Sources Consulted

- [etcd monitoring documentation](https://etcd.io/docs/v3.7/op-guide/monitoring/)
- [v3.6.0 HTTP health implementation](https://github.com/etcd-io/etcd/blob/v3.6.0/server/etcdserver/api/etcdhttp/health.go)
- [v3.7.1 HTTP health implementation](https://github.com/etcd-io/etcd/blob/v3.7.1/server/etcdserver/api/etcdhttp/health.go)
- [v3.6.0 learner RPC support](https://github.com/etcd-io/etcd/blob/v3.6.0/server/etcdserver/api/v3rpc/util.go)
- [v3.7.1 learner RPC support](https://github.com/etcd-io/etcd/blob/v3.7.1/server/etcdserver/api/v3rpc/util.go)
- [v3.6.0 RPC interceptors](https://github.com/etcd-io/etcd/blob/v3.6.0/server/etcdserver/api/v3rpc/interceptor.go)
- [v3.7.1 RPC interceptors](https://github.com/etcd-io/etcd/blob/v3.7.1/server/etcdserver/api/v3rpc/interceptor.go)
- [v3.7.1 etcdctl documentation](https://github.com/etcd-io/etcd/blob/v3.7.1/etcdctl/README.md)
- [v3.7.1 etcdctl global flags](https://github.com/etcd-io/etcd/blob/v3.7.1/etcdctl/ctlv3/ctl.go)
- [etcd runtime reconfiguration](https://etcd.io/docs/v3.7/op-guide/runtime-configuration/)
- [etcd RBAC documentation](https://etcd.io/docs/v3.7/op-guide/authentication/rbac/)
- [curl command-line manual](https://curl.se/docs/manpage.html)

## Issues Found

No technical issues found.

## Review Notes

- Both tagged health implementations register data_corruption, serializable_read, linearizable_read, and non_learner for full readiness. A learner fails non_learner; excluding it can permit success when the remaining checks pass. Individual subcheck routes and verbose output are implemented as described.
- Internal health reads call the server Range implementation with a root authorization context. They do not traverse the public gRPC learner interceptor, supporting the distinction between internal probe success and rejection of a client RPC.
- Both tagged unary interceptors permit status and serializable range requests on established learners, while rejecting linearizable ranges and puts. Streaming RPCs are rejected except for Maintenance/Snapshot. The post correctly avoids claiming that all maintenance operations or all gRPC requests fail.
- The liveness endpoint performs a serializable read. The older health endpoint checks alarms, leader availability when appropriate, and a range operation; it is not an alias for full readiness.
- Verified etcdctl endpoint status, table output, endpoint selection, command timeout, consistency values s and l, and TLS environment-variable names. Verified curl TLS options, silent/show-error behavior, and HTTP status formatting. Both Bash blocks passed bash -n syntax validation.
- Serializable reads can return stale state. The commands assume actual endpoint and certificate paths and an authorized identity; TLS credentials must map to an appropriate user when certificate-based RBAC authentication is used.
- Promotion safety and waiting for learner catch-up match the runtime reconfiguration documentation. Checking role, readiness, and application operations before routing is consistent with those constraints.
- The monitoring documentation's sample readiness output omits non_learner; the tagged source is the more precise reference for the versions reviewed. The article appropriately scopes its conclusions to those releases.
- Referenced technical resources resolved successfully. This was a documentation and source review, with shell syntax validation; no live etcd cluster, learner promotion, TLS connection, or before-and-after staging matrix was executed. README.md required no changes.
