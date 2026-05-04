# Validation Summary: How to Configure Ruby on Rails for IPv6 Support

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ruby on Rails (7.1+)
- Puma web server
- ActionDispatch (Rails middleware, including `ActionDispatch::RemoteIp`)
- Ruby `IPAddr` standard library
- ActiveRecord migrations
- NGINX (as a reverse proxy)
- IPv6 networking, including IPv4-mapped IPv6 addresses (`::ffff:`)

## Sources Consulted
- Puma configuration documentation: https://github.com/puma/puma/blob/master/docs/architecture.md and https://puma.io/puma/Puma/DSL.html (`bind` accepts URIs of the form `tcp://[::]:3000` with bracketed IPv6)
- Rails command-line documentation: https://guides.rubyonrails.org/command_line.html (`rails server` accepts `-b`/`--binding` and `-p`/`--port`)
- Rails API: `ActionDispatch::Request#remote_ip` and `ActionDispatch::RemoteIp` middleware (`config.action_dispatch.trusted_proxies`, `ActionDispatch::RemoteIp::TRUSTED_PROXIES` constant) - https://api.rubyonrails.org/classes/ActionDispatch/RemoteIp.html
- Ruby `IPAddr` documentation: https://docs.ruby-lang.org/en/master/IPAddr.html (`IPAddr::InvalidAddressError`, `#ipv6?`)
- NGINX `listen` directive: https://nginx.org/en/docs/http/ngx_http_core_module.html#listen (bracketed IPv6 syntax, `[::1]:3000` for upstream servers)
- RFC 4291 (IPv6 addressing) and RFC 5952 (IPv6 textual representation) for the 45-character maximum length of an IPv4-mapped IPv6 textual representation

## Issues Found
- **Regex anchoring bug** in the `Session` model validation. The original pattern `/\A(\d{1,3}\.){3}\d{1,3}|([0-9a-f:]+)\z/i` placed the `|` at top level, so `\A` only anchored the IPv4 branch and `\z` only anchored the IPv6 branch. Strings like `"1.2.3.4 garbage"` or `"ZZZZabcdef"` would have passed validation. Fixed by grouping the alternatives so both anchors apply: `/\A((\d{1,3}\.){3}\d{1,3}|[0-9a-f:]+)\z/i`.

## Review Notes
- The Puma `bind "tcp://[::]:3000"` form is correct. On Linux, by default `[::]` accepts both IPv4 (via IPv4-mapped IPv6) and IPv6 unless `IPV6_V6ONLY` is set; the post's explicit dual-bind (both `0.0.0.0` and `[::]`) is the most portable approach and is appropriate.
- `request.remote_ip` only honors `X-Forwarded-For` correctly when the immediate client is in `trusted_proxies`; the post correctly covers this in Step 3.
- The IPv6 detection in `ipv6_client?` returns `false` for IPv4-mapped IPv6 because `set_client_ip` strips the `::ffff:` prefix before the check. This is consistent with treating mapped addresses as IPv4 and is a reasonable design choice, though authors should be aware of the ordering.
- The 45-character `VARCHAR(45)` length is correct for the longest textual IPv6 representation including IPv4 dotted-quad notation (e.g. `0000:0000:0000:0000:0000:ffff:255.255.255.255`).
- `ss -lntp | grep :3000` will also match other ports containing `3000` as a substring (`:30000`, `:13000`, etc.); a stricter filter such as `grep ':3000\b'` or `ss -lntp '( sport = :3000 )'` would be more precise, but the existing form is the conventional shortcut and not technically wrong.
- The `ActionDispatch::RemoteIp::TRUSTED_PROXIES` constant exists and is the correct reference for the default trusted proxy list.
- Rails 7.1 (`ActiveRecord::Migration[7.1]`) is a real, current version family; the migration syntax shown is valid.
