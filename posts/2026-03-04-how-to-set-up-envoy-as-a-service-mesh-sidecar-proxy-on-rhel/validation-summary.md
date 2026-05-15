# Validation Summary: How to Set Up Envoy as a Service Mesh Sidecar Proxy on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- RHEL
- Envoy Proxy
- Service mesh sidecar proxy pattern
- systemd
- YAML configuration
- Prometheus metrics endpoint

## Sources Consulted
- Envoy installation documentation: https://www.envoyproxy.io/docs/envoy/latest/start/install.html
- Envoy admin interface documentation: https://www.envoyproxy.io/docs/envoy/latest/operations/admin.html
- Envoy quick start admin documentation: https://www.envoyproxy.io/docs/envoy/latest/start/quick-start/admin.html
- Envoy release process and supported stable release schedule: https://github.com/envoyproxy/envoy/blob/main/RELEASES.md
- Envoy GitHub releases: https://github.com/envoyproxy/envoy/releases

## Issues Found
- The installation section used the retired GetEnvoy/Bintray RPM repository. I removed those commands because the Bintray URL no longer works reliably and is not part of the current Envoy installation documentation.
- The post pinned Envoy 1.28.0, which reached end of life on 2024-10-19 according to Envoy's release schedule. I updated the example to Envoy 1.38.0, the current stable release as of 2026-05-15.
- The direct binary download wrote to `/usr/local/bin/envoy` without `sudo`, which would fail for a normal user on RHEL. I changed the command to download to `/tmp/envoy` and install it with `sudo install -m 0755`.
- The post instructed readers to save `/etc/envoy/envoy.yaml` before creating `/etc/envoy`. I added `sudo mkdir -p /etc/envoy` before the configuration file step.

## Review Notes
Validated the Envoy YAML with `envoy --mode validate -c` using the Envoy 1.38.0 Linux x86_64 binary. The admin interface is bound to `127.0.0.1`, which matches Envoy's guidance to limit access because the admin endpoint can expose private data and perform administrative actions. For Prometheus scraping, Envoy supports `/stats/prometheus` or `/stats?format=prometheus`; the post's `/stats` command remains valid for local debugging.
