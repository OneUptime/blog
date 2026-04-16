# Validation Summary: How to Use HAProxy with ClickHouse for Load Balancing

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- HAProxy (load balancer)
- ClickHouse (HTTP interface on port 8123, native TCP on port 9000)
- HTTP health checks
- TCP load balancing
- ACL-based routing

## Sources Consulted
- HAProxy 3.0 official configuration manual (https://docs.haproxy.org/3.0/configuration.html), section 7.3.6 — Fetching HTTP samples (Layer 7), specifically the `path`, `pathq`, `url`, and `urlp`/`url_param` fetches.
- HAProxy server options reference (`check`, `inter`, `fall`, `rise`).
- HAProxy `option httpchk`, `http-check expect`, and `option tcp-check` directives.
- ClickHouse HTTP interface documentation (default port 8123).
- ClickHouse native TCP interface documentation (default port 9000).

## Issues Found
- **ACL using `path_beg` would never match.** In the "Read vs. Write Separation" section, the original ACL was:
  ```
  acl is_insert path_beg -i /?query=INSERT
  ```
  HAProxy's `path` sample fetch returns only the URL path (everything between the first `/` and the `?`), explicitly excluding the query string. For a request like `GET /?query=INSERT+...`, the path is just `/`, so `path_beg /?query=INSERT` cannot match. Changed to `url_beg -i /?query=INSERT`, which uses the `url` fetch that includes the query string and is the correct way to express the author's intent.

## Review Notes
- The remaining configuration is syntactically and semantically correct: `frontend`/`backend` blocks, `bind`, `mode tcp`, `balance roundrobin`/`leastconn`, `option httpchk`, `http-check expect status 200`, `option tcp-check`, `server ... check inter 5s fall 3 rise 2`, `listen stats` block, and the `defaults` `timeout` block all match HAProxy reference syntax.
- ClickHouse port numbers (8123 HTTP, 9000 native TCP) are correct.
- The `curl` health check verification command is valid; URL-encoded `+` correctly represents a space for ClickHouse's HTTP interface.
- Caveat for future readers (not corrected because it is a real-world limitation and the post does not make a misleading claim): the read/write split via ACL only catches `INSERT` queries sent via the URL `query` parameter. Most production ClickHouse INSERTs use POST with the SQL in the request body (or use the native TCP protocol), and would not be matched by any URL-based ACL. The pattern is reasonable as illustrated, but is not a complete write-isolation mechanism.
- ClickHouse replication (ReplicatedMergeTree) is leaderless — any replica can accept writes — so the "primary"/"replicas" terminology in the post reflects the operator's deployment convention rather than a ClickHouse-imposed role distinction. This is a stylistic framing, not a technical error.
