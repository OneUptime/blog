# Validation Summary: How to Configure Flagger Load Tester with ghz for gRPC Load

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flagger
- Flagger load tester
- ghz
- gRPC
- Kubernetes
- Prometheus metrics
- Canary deployments

## Sources Consulted
- Flagger webhooks and load testing documentation: https://docs.flagger.app/main/usage/webhooks
- Flux/Flagger webhooks documentation, including ghz load tester examples: https://fluxcd.io/flagger/usage/webhooks/
- Flagger canary service documentation: https://docs.flagger.app/usage/how-it-works
- Flagger metrics analysis documentation: https://docs.flagger.app/main/usage/metrics
- ghz usage documentation: https://ghz.sh/docs/usage
- ghz options reference: https://ghz.sh/docs/options
- ghz examples, including server reflection and streaming examples: https://ghz.sh/docs/examples
- Istio standard metrics reference for `grpc_response_status`: https://istio.io/latest/docs/reference/config/metrics/

## Issues Found
- The first `ghz` command used both `--total 1000` and `--duration 1m`, while the surrounding text said the command runs for one minute at 50 RPS. The ghz documentation states that when `--duration` is specified, `--total` is ignored. I removed `--total 1000` from the example so the command matches the stated behavior.
- The `--total` parameter description said it was mutually exclusive with `--duration`. Updated it to state that `ghz` ignores `--total` when `--duration` is specified, matching current ghz documentation.

## Review Notes
- The Flagger webhook structure, `metadata.type: cmd`, load tester URL pattern, and ghz usage are consistent with Flagger documentation.
- The `ghz` flags used in the examples (`--insecure`, `--call`, `--duration`, `--rps`, `--concurrency`, `--connections`, `--proto`, `--protoset`, `-d`, `-D`, and `-m`) are current and documented.
- The post correctly describes ghz server reflection behavior: ghz attempts reflection when neither `--proto` nor `--protoset` is supplied.
- gRPC metric availability depends on the service mesh or application instrumentation exporting those metrics to Prometheus.
