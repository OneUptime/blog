# Validation Summary: How to Build Distributed Systems with Elixir

## Status
validated

## Post Type
Tutorial / Technical guide

## Technologies Covered
- Elixir / Erlang / BEAM VM
- OTP (GenServer, Supervisor)
- Erlang distribution protocol (Node module, EPMD)
- `:global` module for cluster-wide registration
- `:pg` (process groups) module
- ETS (Erlang Term Storage)
- libcluster (Cluster.Strategy.Kubernetes.DNS, Cluster.Strategy.Gossip)
- Elixir releases (RELEASE_DISTRIBUTION, RELEASE_NODE, ERL_DIST_PORT)
- `:net_kernel.monitor_nodes/2`
- CRDTs (G-Counter)
- Kubernetes (headless services)

## Sources Consulted
- Elixir `Node` module docs: https://hexdocs.pm/elixir/Node.html
- Elixir `GenServer` docs: https://hexdocs.pm/elixir/GenServer.html
- Erlang `:global` module: https://www.erlang.org/doc/man/global.html
- Erlang `:pg` module: https://www.erlang.org/doc/man/pg.html
- Erlang `:net_kernel` docs: https://www.erlang.org/doc/man/net_kernel.html
- Erlang `:ets` match specs: https://www.erlang.org/doc/man/ets.html
- libcluster docs: https://libcluster.hexdocs.pm/
- libcluster `Cluster.Strategy.Kubernetes.DNS` source: https://github.com/bitwalker/libcluster/blob/main/lib/strategy/kubernetes_dns.ex
- libcluster `Cluster.Strategy.Gossip` source: https://github.com/bitwalker/libcluster/blob/main/lib/strategy/gossip.ex
- libcluster `Cluster.Supervisor` source: https://github.com/bitwalker/libcluster/blob/main/lib/supervisor.ex
- Elixir releases / Mix.Tasks.Release docs: https://hexdocs.pm/mix/Mix.Tasks.Release.html
- Erlang `erl` runtime flags / ERL_DIST_PORT: https://www.erlang.org/doc/man/erl.html

## Issues Found

1. **Invalid `namespace` option in `Cluster.Strategy.Kubernetes.DNS` config.** The DNS-based Kubernetes strategy in libcluster only accepts `:service`, `:application_name`, `:resolver`, and `:polling_interval`. The `:namespace` option is silently ignored — namespace is resolved via the pod's DNS search domain (it belongs to the API-based `Cluster.Strategy.Kubernetes`, not the DNS variant). Removed the `namespace` line and added a comment clarifying how namespace resolution works.

2. **Invalid `broadcast_period` option in `Cluster.Strategy.Gossip` config.** The Gossip strategy does not accept a `broadcast_period` option — heartbeat timing is internally hardcoded via `Process.send_after(self(), :heartbeat, :rand.uniform(5_000))`. Valid options are `port`, `if_addr`, `multicast_if`, `multicast_addr`, `multicast_ttl`, `secret`, and `broadcast_only`. Replaced `broadcast_period: 1_000` with the valid `multicast_ttl: 1` option and adjusted the multicast address comment.

3. **Misleading `ERL_DIST_PORT=4369` and redundant EPMD flags.** Port 4369 is the well-known EPMD port — using it for `ERL_DIST_PORT` is confusing and would conflict with a co-running EPMD. Additionally, when `ERL_DIST_PORT` is set (OTP 23.1+), EPMD is automatically neither started nor contacted, making `-start_epmd false -erl_epmd_port 4369` redundant. Changed the example to use a non-conflicting port (9100) and removed the redundant `ERL_FLAGS` line.

## Review Notes

- The `:pg` API used (`:pg.join/2`, `:pg.get_members/1`, `:pg.get_local_members/1`, `:pg.leave/2`) targets the default `:pg` scope and is correct for OTP 23+. Note that `:pg` was reworked in OTP 23 — the old `:pg2` module used in older Elixir tutorials is deprecated/removed. The post correctly uses the modern API.
- `Logger.warning/1` (used in `PartitionDetector`) is the correct API for Elixir 1.11+; the older `Logger.warn/1` was deprecated.
- `:net_kernel.monitor_nodes(true, [node_type: :visible])` is correct Erlang syntax; valid `node_type` values include `:visible`, `:hidden`, and `:all`.
- The `:ets.select_delete/2` match spec uses `:"/="` for "not equal", which is valid in Erlang match-spec guards.
- The `DistributedCounter.handle_info(:sync, ...)` callback sends an unhandled `{:do_sync}` message to itself and never invokes the actual sync logic — the periodic sync loop is essentially a no-op in this snippet. Not corrected because the CRDT educational point (G-Counter merge semantics) is correct, and rewiring the message flow would require restructuring beyond a small fix. Readers should treat this snippet as a CRDT primer, not a production-ready sync implementation.
- The `DistributedCache` uses simple modular hashing (`:erlang.phash2(key, node_count)`) rather than true consistent hashing, despite the docstring saying "consistent hashing". With this scheme, every node change reshuffles roughly all keys — true consistent hashing (e.g., ring-based) avoids that. The comment in the code does qualify it as "Simple hash-based sharding", but the surrounding prose calls it consistent hashing. Acceptable for an introductory example; readers building production sharded caches should reach for a real consistent-hashing implementation.
- The `:ets.new(:cache, [:set, :protected])` table uses `:protected` access, which is fine because only the owning process writes; lookups from other processes can still read. This is correct.
- `ERL_DIST_PORT` was introduced in OTP 23.1 — the post should be safe for any modern Elixir/OTP install but is not backward compatible with older versions.
