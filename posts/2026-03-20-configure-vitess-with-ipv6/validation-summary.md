# Validation Summary: How to Configure Vitess with IPv6

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- Vitess (vtctld, vttablet, vtgate, vtctlclient)
- IPv6 networking
- MySQL
- etcd (topology backend)
- Kubernetes (Deployment manifest)

## Sources Consulted
- [Vitess vtctld reference (v22.0)](https://vitess.io/docs/22.0/reference/programs/vtctld/)
- [Vitess vttablet reference (v22.0)](https://vitess.io/docs/22.0/reference/programs/vttablet/)
- [Vitess vtgate reference (v22.0)](https://vitess.io/docs/22.0/reference/programs/vtgate/)
- [Vitess vtctl/vtctlclient concepts (v23.0)](https://vitess.io/docs/23.0/concepts/vtctl/)
- [Vitess Unsharded Keyspace docs (v22.0)](https://vitess.io/docs/22.0/user-guides/vschema-guide/unsharded/)
- RFC 5952 (IPv6 textual representation) — hex digits are 0-9 and a-f only

## Issues Found
- **Invalid IPv6 literal `[2001:db8::etcd]:2379`** used three times as the etcd topology server address (in the `vtctld`, `vttablet`, and `vtgate` examples). The substring `etcd` contains the character `t`, which is not a valid hexadecimal digit, so this is not a parseable IPv6 address. Replaced with `[2001:db8::3]:2379` (a syntactically valid IPv6 address) to keep the example working as a literal address. The Kubernetes example was already using the hostname form `etcd:2379` correctly and was left unchanged.

## Review Notes
- The other IPv6 placeholder `2001:db8::db` is technically valid IPv6 (both `d` and `b` are hex digits), so it was left as-is.
- The Vitess flags used (`--topo_implementation`, `--topo_global_server_address`, `--topo_global_root`, `--cell`, `--service_map`, `--backup_storage_implementation`, `--file_backup_storage_root`, `--port`, `--grpc_port`, `--pid_file`, `--tablet-path`, `--tablet_hostname`, `--init_keyspace`, `--init_shard`, `--init_tablet_type`, `--health_check_interval`, `--db_host`, `--db_port`, `--db_app_user`, `--db_app_password`, `--cells_to_watch`, `--tablet_types_to_wait`, `--mysql_server_port`, `--mysql_server_bind_address`) are all documented in the official Vitess CLI reference.
- `--init_shard -` is the conventional name for the single shard of an unsharded keyspace in Vitess; `0` is also accepted in some examples.
- The `grpc-vtctl` service in the `--service_map` is legacy; modern Vitess deployments increasingly rely on `grpc-vtctld` (used together here, which is fine for backwards compatibility with `vtctlclient`). Future readers should be aware that `vtctlclient` has been superseded by `vtctldclient` in newer Vitess versions.
- On Linux, binding `--mysql_server_bind_address=::` typically accepts both IPv6 and IPv4-mapped connections unless `IPV6_V6ONLY` is set. The post's note that vtgate "listens on `[::]:3306` (all IPv6 interfaces)" is reasonable phrasing.
- The `vtctlclient --server "[2001:db8::1]:15999"` examples use the standard `[ipv6]:port` bracket syntax, which Go's `net.Dial` (used by Vitess) parses correctly.
