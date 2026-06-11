# Validation Summary: How to Implement QUIC Protocol Configuration

## Status
validated

## Post Type
Tutorial / Guide (conceptual walkthrough of the QUIC protocol with Rust + `quiche` code examples covering handshake, streams, 0-RTT, connection migration, congestion control, and HTTP/3 integration).

## Technologies Covered
- QUIC transport protocol (RFCs 9000, 9001, 9002)
- HTTP/3 (RFC 9114)
- TLS 1.3
- Cloudflare's `quiche` Rust library (and its `quiche::h3` sub-module)
- UDP transport, congestion control algorithms (Reno, CUBIC, BBR2)
- QUIC connection migration / Connection IDs / path validation
- QUIC DATAGRAM extension

## Sources Consulted
- `quiche` API reference on docs.rs (https://docs.rs/quiche/latest/quiche/) — Config, Connection, ConnectionId, Header, Stats, PathStats, CongestionControlAlgorithm
- `quiche::h3` API reference (https://docs.rs/quiche/latest/quiche/h3/) — Config, Connection, Event, Error, Header
- RFC 9000 — QUIC Transport Protocol (stream IDs, connection migration, path challenge, anti-amplification)
- RFC 9001 — Using TLS to Secure QUIC (0-RTT semantics, session tickets)
- RFC 9114 — HTTP/3 (control stream as the first client unidirectional stream, stream ID semantics)

## Issues Found
Numerous calls into the `quiche` API in the original draft used method names that do not exist or have different signatures. All of these were corrected:

1. `Config::set_initial_max_early_data(16384)` — does not exist in `quiche`. Removed; the comment now notes that the early-data size is advertised via the TLS NewSessionTicket and `enable_early_data()` is sufficient.
2. `Config::set_ticket(&ticket)` — does not exist on `Config`. The resumption ticket is applied on the `Connection` via `set_session(&[u8])`. The `connect_with_zero_rtt` example was restructured to create the connection first and then call `conn.set_session(&ticket)`.
3. `Connection::is_early_data_ready()` and `Connection::is_early_data_accepted()` — do not exist. Replaced with `is_in_early_data()`, which is the real `quiche` method.
4. `Connection::client_random()` — does not exist. The replay-protection example was rewritten to take an application-supplied request identifier, which is how replay defence is typically implemented at the application layer.
5. `Connection::send_path_challenge(...)` — not a public API; `quiche` emits PATH_CHALLENGE/PATH_RESPONSE internally. Replaced with `Connection::probe_path(local, peer)` and the `path_event_next()` event loop, including `PathEvent::Validated`/`FailedValidation` matching.
6. `Connection::active_cids()` — does not exist. Replaced with `Connection::scids_left()`, which reports how many additional source CIDs may still be issued under the peer's `active_connection_id_limit`.
7. `Connection::new_connection_id(scid, reset_token: [u8;16], ...)` — does not exist. Replaced with `Connection::new_scid(scid, reset_token: u128, retire_if_needed: bool)`. The helper `generate_reset_token` was updated to return `u128`.
8. `Connection::retire_connection_id(cid: &[u8])` — does not exist. Replaced with `Connection::retire_dcid(seq: u64)`, which retires destination CIDs by sequence number rather than CID bytes.
9. `Connection::probe_path(new_path, local)` — argument order was wrong. Corrected to `probe_path(local, peer)` per the real signature.
10. `CongestionControlAlgorithm::BBR` — variant does not exist. Replaced with `Bbr2Gcongestion` (`quiche`'s BBR v2 variant). The "Available algorithms" comment was updated accordingly.
11. `Config::enable_migration(true)` — does not exist. Replaced with `Config::set_disable_active_migration(false)` (note the inverted semantics).
12. Duplicate `set_initial_max_data(10_000_000)` call labelled "Anti-amplification limit (3x before address validation)" in the server example — removed. The 3x amplification limit is enforced by the QUIC stack itself and is not exposed as a `Config` knob; the comment is now corrected to reflect that.
13. `Stats { cwnd, bytes_in_flight, rtt, rttvar, ... }` — `cwnd`, `bytes_in_flight`, `rtt` and `rttvar` are not fields on the connection-wide `Stats` struct in `quiche`; they live on `PathStats` and are reached via `Connection::path_stats()`. Both `log_congestion_stats` and `export_metrics` were updated to use `path_stats()` for these fields.
14. `h3::Event::Headers { list, has_body }` — the destructured field is `more_frames`, not `has_body`. Renamed in the pattern match.
15. `enable_dgram(true, 1000, 1000)` — second and third args are `usize`, not `u64`. Added explicit `usize` suffixes in the two call sites.

## Review Notes
- The Rust snippets remain illustrative rather than directly compilable — they reference undefined identifiers like `local_addr`, `peer_addr`, `SocketAddr`, `HttpRequest`, `Method`, and `AntiReplayCache`, plus omit several `use` statements. This is consistent with the rest of the post's tutorial style and has been preserved; only outright wrong API calls were corrected.
- The QUIC packet-structure ASCII diagram is a simplified bit-field overview rather than a byte-accurate layout (long-header packets also include DCID/SCID length bytes and, for Initial packets, a token field and length field). It is reasonable as an introduction and was left in place.
- Stream-ID semantics in the "Stream Multiplexing" table and diagram are correct: client-bidi (0,4,8,...), server-bidi (1,5,9,...), client-uni (2,6,10,...), server-uni (3,7,11,...). Stream 2 as the client control stream matches RFC 9114.
- The 1-RTT handshake diagram correctly shows the Initial/Handshake/Finished flights and the post-handshake application-data exchange.
- The `set_application_protos(&[b"h3"])` call relies on Rust's coercion of `&[&[u8; N]]` to `&[&[u8]]`; in stricter contexts this may need `&[b"h3".as_ref()]`. Left as-is because it does compile in typical usage.
- The conceptual claims about QUIC (head-of-line blocking elimination, 0-RTT replay risk, connection-migration via CIDs, BBR throughput benefits, anti-amplification 3x rule, TLS 1.3 mandatory) all match the relevant RFCs.
