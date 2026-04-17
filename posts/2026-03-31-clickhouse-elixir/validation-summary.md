# Validation Summary: How to Use ClickHouse with Elixir

## Status
validated

## Post Type
Tutorial / integration guide

## Technologies Covered
- ClickHouse (HTTP interface, JSONEachRow format, SQL)
- Elixir
- Req (HTTP client)
- Jason (JSON library)
- Phoenix (web framework)
- Cachex (caching library)

## Sources Consulted
- ClickHouse HTTP interface docs: https://clickhouse.com/docs/en/interfaces/http
- ClickHouse formats (JSONEachRow): https://clickhouse.com/docs/en/interfaces/formats
- ClickHouse Date/Interval: https://clickhouse.com/docs/en/sql-reference/data-types/date
- Req Hex package: https://hex.pm/packages/req and https://hexdocs.pm/req/Req.html
- Cachex Hex package: https://hex.pm/packages/cachex and https://hexdocs.pm/cachex/Cachex.html
- Jason: https://hex.pm/packages/jason

## Issues Found
- **Cachex caching example (Caching with Cachex section)**: The original code passed `ttl: :timer.seconds(30)` as a direct option to `Cachex.fetch/4`, but `:ttl` is not a valid option for `fetch/4`. In current Cachex (3.6+, including 4.x), TTL must be supplied via the three-tuple commit form `{:commit, value, expire: ms}`, and the option key is `:expire`, not `:ttl`. Additionally, the fallback callback in modern Cachex receives the key as its single argument, so the arity-0 `fn -> ... end` was updated to `fn _key -> ... end`. Replaced the example with a `{:commit, result, expire: :timer.seconds(30)}` form that is correct on current Cachex.

## Review Notes
- Port 8123, `X-ClickHouse-User` / `X-ClickHouse-Key` headers, and `JSONEachRow` are all verified correct per official ClickHouse docs.
- `Req.post!(url, params: [...], body: ..., headers: [...])` matches the current Req 0.5.x API and is not deprecated.
- `INTERVAL N DAY` is the idiomatic ClickHouse syntax; the example using `today() - 7` also works because `Date` is stored as days since epoch, but readers may prefer `today() - INTERVAL 7 DAY` for clarity.
- The Phoenix controller interpolates a user-supplied `days` into the SQL string. The code calls `String.to_integer/1` first (raising on non-integers), so injection is mitigated in this specific path, but readers should be aware that SQL string interpolation is generally unsafe — parameterized queries via ClickHouse HTTP `param_<name>` + `{name:Type}` placeholders are preferable for untrusted inputs. This is a design note, not a correctness bug.
- The post mentions `HTTPoison` as an alternative but only shows `Req` examples — fine, since `Req` is clearly marked as recommended.
- Req version constraint `~> 0.4` is older than current 0.5.x but remains a valid pin; not changed because it is a deliberate version choice, not a correctness error.
