# Validation Summary: Troubleshooting Docker DNS: Why Container Names Don't Resolve

## Status
validated

## Post Type
Troubleshooting guide / tutorial

## Technologies Covered
- Docker (embedded DNS, bridge and user-defined networks)
- Docker Compose (dns, dns_search, dns_opt, links, network aliases)
- Docker daemon configuration (`/etc/docker/daemon.json`)
- Alpine Linux container tooling (bind-tools, netcat-openbsd, busybox-extras, iputils)
- DNS debugging tools: nslookup, dig, getent
- HashiCorp Consul (service discovery)

## Sources Consulted
- Docker container run CLI reference — https://docs.docker.com/reference/cli/docker/container/run/ (DNS-related flags: `--dns`, `--dns-option`, `--dns-search`, `--hostname`)
- Docker networking / embedded DNS docs — embedded DNS at `127.0.0.11` is only provided on user-defined networks; default bridge containers rely on the host's DNS configuration
- moby/moby PR #28186 — added `--dns-option` to `docker run`/`create` and hid the legacy `--dns-opt` alias (https://github.com/moby/moby/pull/28186)
- Docker daemon configuration reference — daemon.json keys `dns`, `dns-search`, `dns-opts`

## Issues Found
1. **Incorrect resolv.conf claim for the default bridge (Problem 2 diagnose block).** The comment stated `docker run --rm alpine cat /etc/resolv.conf` "Should show 127.0.0.11 for Docker's embedded DNS". That command runs on the default bridge network (no `--network` flag), where the container uses the host's DNS servers, not `127.0.0.11`. The embedded DNS at `127.0.0.11` only appears on user-defined networks. Updated the comment to explain both cases. (The later `docker exec api cat /etc/resolv.conf` on `mynet` correctly notes `127.0.0.11` and was left unchanged.)
2. **Legacy `--dns-opt` flag (Container-Level DNS section).** The post used `docker run --dns-opt ...`. This is a hidden legacy alias; the current documented flag is `--dns-option`. Changed to `--dns-option`.
3. **Mislabeled "custom DNS options" command (Quick Reference).** The command `docker network create --driver bridge --opt "com.docker.network.bridge.host_binding_ipv4"="0.0.0.0" mynet` was commented as "Create network with custom DNS options". The `host_binding_ipv4` driver option controls the default host IP for port bindings and has nothing to do with DNS. Corrected the comment to describe it as a custom bridge driver option (default host binding IP).

## Review Notes
- `--dns-opt` still functions as a hidden alias, so the original would not error; the change aligns the post with the current, documented `--dns-option` flag.
- daemon.json key `dns-opts` (plural), compose key `dns_opt` (singular), and CLI flag `--dns-option` are all distinct but each correct as used — verified, no change needed.
- The Consul image reference `hashicorp/consul:latest` is the current correct namespace (the old `consul` Docker Hub image is deprecated). Correct as written.
- Network alias example correctly notes the service is reachable via its service name (`db`) plus the declared aliases.
- The `netstat`/`ss` and `ping` examples assume those tools exist in the target image (e.g. `postgres:16` may not ship `netstat`/`ss`); these are illustrative diagnostic commands rather than guaranteed-present binaries, which is acceptable in context.
- Core technical claims (embedded DNS at `127.0.0.11`, user-defined vs default bridge name resolution, network aliases, compose/daemon DNS config) are accurate.
