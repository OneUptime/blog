# Validation Summary: How to Implement Caching in Phoenix

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Elixir
- Phoenix Framework
- Erlang Term Storage (ETS)
- Cachex (v3.6)
- Redix (v1.2+) / Redis
- GenServer
- Ecto (in examples)

## Sources Consulted
- Cachex hexdocs: https://cachex.hexdocs.pm/Cachex.html
- Cachex 3.6.0 `fetch/4` documentation: https://cachex.hexdocs.pm/3.6.0/Cachex.html#fetch/4
- Cachex 3.6 source on GitHub: https://github.com/whitfin/cachex/blob/v3.6.0/lib/cachex.ex
- Erlang `:ets` documentation (built-in module) for table creation options (`:set`, `:public`, `:named_table`, `:read_concurrency`, `:write_concurrency`) and `foldl/3`
- Elixir `DateTime` documentation for `DateTime.add/3` (`:second` unit, available since Elixir 1.10) and `DateTime.compare/2` return values (`:lt | :eq | :gt`)
- Redix hexdocs for the `Redix.command/2` API and supervisor child_spec format
- Redis command reference for `SETEX key seconds value` argument order

## Issues Found
No technical issues found.

Verified specifically:
- The ETS table options (`:set, :public, :named_table, read_concurrency: true, write_concurrency: true`) are valid for `:ets.new/2`.
- `DateTime.add(DateTime.utc_now(), ttl_seconds, :second)` is valid Elixir API (since 1.10).
- The `DateTime.compare/2` logic in `get/1` and `cleanup_expired_entries/0` correctly identifies expired entries.
- `def fetch(key, ttl_seconds \\ 300, fun)` with a default in the middle of the signature is legal Elixir — the compiler generates the appropriate function heads, and call sites in the post pass all three arguments.
- The Cachex 3.6 child spec form `{Cachex, name: :app_cache, expiration: expiration_config()}` is valid (Elixir's trailing keyword-list sugar makes this equivalent to passing a keyword list).
- `Cachex.Spec.expiration(default: ..., interval: ..., lazy: true)` uses valid options for the expiration record in Cachex 3.x.
- The `Cachex.fetch/3` fallback function with arity 0 (`fn -> ... end`) is supported in Cachex 3.6 (arities 0, 1, and 2 are all accepted).
- The `{:commit, value, ttl: ...}` return form is valid in Cachex 3.6 — `:ttl` is the correct option name for that version (it was renamed to `:expire` only in Cachex 4.x).
- `Cachex.del/2` is the correct Cachex 3.x deletion API.
- The Redis `SETEX key seconds value` argument order in `["SETEX", key, ttl_seconds, encoded]` is correct.
- `:erlang.term_to_binary/1` and `:erlang.binary_to_term/1` are appropriate for serializing arbitrary Erlang terms for Redis storage (caveat noted below).

## Review Notes
- Cachex 4.x has been released and renames the TTL option from `:ttl` to `:expire`, among other API adjustments. The post pins `~> 3.6` so the code is correct as written, but readers upgrading to Cachex 4.x will need to migrate the option name.
- The custom ETS `MyApp.Cache` GenServer example does not show adding the module to the application supervision tree. This is an example omission (not a technical error) — readers will need to add `MyApp.Cache` to their children list for the cache to start.
- `cleanup_expired_entries/0` uses `:ets.foldl/3` and deletes entries during the fold. This is safe for `:set` tables but `:ets.select_delete/2` with a match spec would be more idiomatic and more efficient. Not incorrect, just a future improvement.
- Using `:erlang.binary_to_term/1` on data fetched from Redis is safe only when the cache is fully trusted; if untrusted data could ever be written to the cache, `:erlang.binary_to_term(binary, [:safe])` should be used to avoid atom-table exhaustion or arbitrary code paths. Not a correctness issue in this single-app scenario, but worth highlighting for production.
- The `handle_cachex_result/1` helper does not pattern-match `{:error, reason}` returns from `Cachex.fetch/3`. Errors would raise a FunctionClauseError. Not technically wrong (errors propagate as crashes by design in some Elixir codebases), but a defensive `{:error, _}` clause could be added.
