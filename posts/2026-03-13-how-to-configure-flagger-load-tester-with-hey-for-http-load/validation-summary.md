# Validation Summary: How to Configure Flagger Load Tester with hey for HTTP Load

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flagger
- Flagger Canary resources
- Flagger load tester webhooks
- hey HTTP load generator
- Kubernetes
- YAML configuration
- Prometheus-backed canary metrics

## Sources Consulted
- Flagger official webhooks documentation: https://docs.flagger.app/usage/webhooks
- Flagger official Flux documentation for webhooks and load testing: https://fluxcd.io/flagger/usage/webhooks/
- hey upstream README and command-line options: https://github.com/rakyll/hey

## Issues Found
- The post described `-z` and `-n` as mutually exclusive. The hey documentation states that when `-z` is specified, `-n` is ignored. Updated both parameter descriptions to match the documented behavior.
- The `-t` timeout description omitted the documented default. Added that `-t` defaults to 20 seconds.
- The post stated that the Flagger load tester starts a new `hey` instance on each webhook call. Flagger's documentation says the load tester runs `hey` commands in the background if they are not already running. Updated the duration-based testing section accordingly.
- The post stated that multiple endpoint webhook commands run in parallel during each analysis step. Updated this to the documented behavior: the load tester runs the commands in the background if they are not already running.

## Review Notes
The Canary snippets use the current `flagger.app/v1beta1` API shape and the documented Flagger load tester webhook URL and `metadata.cmd` pattern. The hey examples use currently documented flags for duration, rate limiting, concurrency, methods, headers, bodies, and request timeouts.
