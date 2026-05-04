# Validation Summary: How to Configure Puma for IPv6 in Rails

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Puma (Ruby web server)
- Ruby on Rails
- IPv6 networking (RFC 3986 bracket notation)
- systemd
- NGINX (reverse proxy)
- Capistrano / capistrano3-puma
- pumactl (control CLI)
- curl (verification)

## Sources Consulted
- Puma DSL documentation: https://puma.io/puma/Puma/DSL.html (bind, workers, threads, preload_app!, on_worker_boot, stdout_redirect, state_path, activate_control_app)
- Puma CLI reference: https://github.com/puma/puma/blob/master/docs/deployment.md and `puma --help` (-b/--bind, -w/--workers, -C/--config, -S/--state)
- pumactl reference (phased-restart, status, stats commands)
- Rails server CLI: https://guides.rubyonrails.org/command_line.html (`--binding`, `--port`)
- NGINX listen directive: https://nginx.org/en/docs/http/ngx_http_core_module.html#listen (IPv6 bracket syntax, ssl, http2)
- NGINX upstream module: https://nginx.org/en/docs/http/ngx_http_upstream_module.html (server with IPv6 brackets, unix sockets)
- systemd.service: https://www.freedesktop.org/software/systemd/man/systemd.service.html
- Capistrano flow / hooks: https://capistranorb.com/documentation/getting-started/flow/ (`deploy:published`)
- capistrano3-puma tasks: https://github.com/seuros/capistrano-puma (`puma:phased_restart`)
- RFC 3513 / 4291 (IPv6 addressing — valid hex characters 0-9, a-f)
- RFC 3986 §3.2.2 (bracket notation for IPv6 in URIs)

## Issues Found
- **Invalid IPv6 address in Capistrano example.** The post used `server "2001:db8::deploy"`, but `deploy` contains the characters `p`, `l`, `o`, `y`, which are not valid hexadecimal digits. Per RFC 4291, IPv6 addresses use only `0-9` and `a-f`. Replaced with the documentation-range address `2001:db8::1` (RFC 3849) so the example parses as a valid IPv6 literal.

## Review Notes
- The `listen [::]:443 ssl http2;` directive is technically deprecated in NGINX 1.25.1+ in favor of a separate `http2 on;` directive, but the legacy form still works and is widely used in production. Not a correctness issue.
- The `bind "tcp://[::]:3000"` works as dual-stack on most Linux systems by default (`net.ipv6.bindv6only=0`) but on systems where `bindv6only=1` (e.g., OpenBSD) you need explicit IPv4 + IPv6 bind lines. The post acknowledges this with "(dual-stack on most OSes)".
- `preload_app!` together with `on_worker_boot { ActiveRecord::Base.establish_connection }` is the correct pattern in Puma cluster mode to avoid sharing the parent's DB connection across forked workers.
- The `pumactl -S <state>` (uppercase `-S`) flag specifies the state file path and is correct, distinct from `-s` (lowercase, control URL).
- The `stdout_redirect path, path, append=true` three-argument form is the correct DSL signature.
