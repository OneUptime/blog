# Validation Summary: How to Use consul-template for Dynamic Configuration on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- consul-template (HashiCorp)
- HashiCorp Consul (KV store, service catalog, health checks)
- HashiCorp Vault (KV v2 secrets)
- Go `text/template` syntax
- HCL configuration
- nginx, HAProxy, Prometheus, Filebeat (templated outputs)
- systemd service units
- Ubuntu 20.04 / 22.04

## Sources Consulted
- consul-template templating language docs: https://github.com/hashicorp/consul-template/blob/main/docs/templating-language.md
- consul-template configuration docs: https://github.com/hashicorp/consul-template/blob/main/docs/configuration.md
- HashiCorp releases page: https://releases.hashicorp.com/consul-template/
- consul-template README and command-line flag reference

## Issues Found
1. **Outdated version.** The post pinned `CTMPL_VERSION="0.39.0"`. The current stable release on `releases.hashicorp.com` is `0.42.0`. Updated the variable so readers download a current build.
2. **Incorrect use of `range node`.** The `node` template function returns a single `*CatalogNode` struct, not a list — `range node` will not iterate. Replaced with `{{ with node }} ... {{ end }}`, which is the pattern documented by HashiCorp.
3. **Misleading comment on `error_on_missing_key`.** The original code annotated `error_on_missing_key = true` with `# Only run command if the file actually changed`. `error_on_missing_key` controls template rendering behaviour (it makes a missing Consul key error out instead of rendering `<no value>`); it has nothing to do with command execution. Moved the "only invoked when the rendered content changes" note up to the `command` block (which is consul-template's actual default behaviour) and replaced the `error_on_missing_key` comment with an accurate description.
4. **Misleading comment about command retries.** In the "Handling Template Errors" section, `command = "/usr/local/bin/app reload"` was annotated `# Retry the command if it fails`. consul-template does not provide a retry mechanism for per-template commands — if the command exits non-zero it is simply logged. Replaced with an accurate comment describing the command and its timeout.

## Review Notes
- The `contains` pipe form (`{{ .Tags | contains "canary" }}`) is correct: the function signature is `contains(needle, haystack)`, and Go template piping passes the piped value as the final argument, so the piped `.Tags` becomes the haystack.
- The Vault example uses the KV v2 path layout (`secret/data/...` with `.Data.data.<field>`), which is correct for a default KV v2 mount.
- The HAProxy `option httpchk GET /health HTTP/1.1\r\nHost:\ localhost` syntax is the legacy form. It still works in modern HAProxy but the recommended idiom in HAProxy 2.2+ is `http-check send meth GET uri /health ver HTTP/1.1 hdr Host localhost`. Left as-is because it remains functional.
- The systemd unit's `ExecStartPre=/bin/sh -c 'until consul info ...; do sleep 1; done'` can block indefinitely if the local Consul agent never comes up; a `TimeoutStartSec=` would be safer in production but is not strictly wrong.
- `consul-template -config ... -template ... -once` will render *both* the templates from the config file and the one passed on the CLI. For a true isolated test, run with only `-template` (no `-config`). Left as-is — the example is still functional.
