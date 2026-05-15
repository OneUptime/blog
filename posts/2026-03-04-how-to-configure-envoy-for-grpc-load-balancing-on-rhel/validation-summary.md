# Validation Summary: How to Configure Envoy for gRPC Load Balancing on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux
- Envoy Proxy 1.28.0
- gRPC
- HTTP/2
- systemd
- grpcurl

## Sources Consulted
- Envoy gRPC architecture overview: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/other_protocols/grpc.html
- Envoy HTTP protocol options API: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/upstreams/http/v3/http_protocol_options.proto
- Envoy route components API: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/route/v3/route_components.proto.html
- Envoy health checking overview: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/upstream/health_checking.html
- Envoy command line options: https://www.envoyproxy.io/docs/envoy/latest/operations/cli
- Envoy v1.28.0 release: https://github.com/envoyproxy/envoy/releases/tag/v1.28.0
- gRPC Health Checking Protocol: https://github.com/grpc/grpc/blob/master/doc/health-checking.md
- grpcurl README: https://github.com/fullstorydev/grpcurl/blob/master/README.md
- systemd.exec User= documentation: https://www.freedesktop.org/software/systemd/man/systemd.exec.html

## Issues Found
- The opening explanation said traditional L4 load balancers cannot distribute requests across connections effectively. This was imprecise for gRPC over HTTP/2; L4 load balancers distribute connections, but they do not distribute individual RPC streams inside a persistent HTTP/2 connection. Updated the sentence to make that distinction accurate.
- The Envoy download command wrote directly to `/usr/local/bin/envoy` without elevated privileges. On RHEL this path normally requires root access, so the command would fail for a regular user. Updated it to use `sudo curl`.
- The systemd service used `User=envoy`, but the instructions did not create that user. systemd requires a statically existing user when `DynamicUser=` is not used, so the service could fail to start. Added an idempotent `useradd` command before creating the unit.

## Review Notes
- The Envoy YAML configuration was validated with `envoyproxy/envoy:v1.28.0` using `--mode validate`; Envoy reported the configuration as OK.
- The `grpcurl` examples assume the backend exposes server reflection for `list` and implements the standard gRPC health service for `grpc.health.v1.Health/Check`.
