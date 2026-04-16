# Validation Summary: How to Use Raft Consensus in ClickHouse Keeper

## Status
validated

## Post Type
Technical Guide / Tutorial

## Technologies Covered
- ClickHouse Keeper
- Raft consensus algorithm (NuRaft library)
- ZooKeeper-compatible protocol (four-letter words, Zxid)
- XML coordination_settings configuration
- ClickHouse `system.events` and `system.metrics` tables
- Linux operational tooling (`journalctl`, `nc`)

## Sources Consulted
- ClickHouse Keeper official guide: https://clickhouse.com/docs/guides/sre/keeper/clickhouse-keeper
- ClickHouse docs source repo: https://github.com/ClickHouse/clickhouse-docs (coordination_settings reference, default ports, four-letter word whitelist, `stat` output format)
- NuRaft library: https://github.com/eBay/NuRaft (underlying Raft implementation)
- Raft paper / consensus quorum math: https://raft.github.io/

## Issues Found

1. **Incorrect description of `auto_forwarding` behavior with respect to reads.**
   - The original text said: *"Reads can be served by any node when `auto_forwarding` is enabled, but reads from followers may be slightly behind the leader."*
   - `auto_forwarding` only governs whether followers transparently forward **write** requests to the leader. Reads are served by any connected Keeper node regardless of this setting (standard ZooKeeper-protocol behavior).
   - Fixed: rewrote the sentence to *"Reads can be served by any connected node (followers serve reads independently of the leader), but reads from followers may be slightly behind the leader."* and clarified the "Auto Forwarding" section to specify that the forwarding applies to write requests.

2. **Wrong default Raft inter-server port (9444 vs. 9234).**
   - The original `nc -zv` connectivity check probed port 9444. The documented ClickHouse Keeper default for `<raft_configuration>` inter-server traffic is **9234**. 9444 appears in some third-party (Altinity) examples but is not the upstream default.
   - Fixed: changed both the comment and the `nc` command in the "Diagnosing Split Brain" section to use port 9234, with a clarifying note that this is the default.

## Review Notes

- All `coordination_settings` parameter names used in the post (`heart_beat_interval_ms`, `election_timeout_lower_bound_ms`, `election_timeout_upper_bound_ms`, `operation_timeout_ms`, `startup_timeout`, `shutdown_timeout`, `raft_logs_level`, `auto_forwarding`) are valid against the official Keeper documentation, and the cited defaults (500 / 1000 / 2000 / 10000 / 30000 / 5000) match upstream.
- Quorum math for cluster sizes (1/2/3/4/5 nodes) is correct.
- Four-letter words `stat` and `cons` are part of the default `four_letter_word_white_list`. The fields referenced in `stat` output (`Mode`, `Received`, `Sent`, `Connections`, `Zxid`) are present in the documented `stat` response.
- Sample NuRaft log lines (`Become candidate`, `Become leader`, `Raft leader is N`) reflect the general shape of NuRaft state-transition messages but exact wording can drift across versions; treat them as illustrative.
- The rule of thumb for election timeout vs. heartbeat interval (10× / 5× RTT) is a reasonable operational guideline, consistent with the Raft paper's recommendation that election timeout ≫ broadcast time.
- The claim that Raft log writes are on the synchronous critical path and benefit from fast SSDs is accurate for NuRaft / ClickHouse Keeper.
