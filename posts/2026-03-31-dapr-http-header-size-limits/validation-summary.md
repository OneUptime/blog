# Validation Summary: How to Configure HTTP Header Size Limits in Dapr

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (sidecar architecture, HTTP configuration)
- fasthttp (Dapr's underlying HTTP library)
- Kubernetes (annotations, pod logs)
- Go net/http (referenced for defaults)
- Python (JWT decoding example)
- W3C Trace Context / B3 distributed tracing
- Zipkin

## Sources Consulted
- Dapr official docs: How-To: Handle large HTTP header size — https://docs.dapr.io/operations/configuration/increase-read-buffer-size/
- Dapr official docs: How-To: Handle larger body requests — https://docs.dapr.io/operations/configuration/increase-request-size/
- Dapr official docs: Kubernetes annotations — https://docs.dapr.io/operations/hosting/kubernetes/kubernetes-annotations/
- Dapr official docs: Configuration overview — https://docs.dapr.io/operations/configuration/configuration-overview/
- Dapr official docs: Zipkin tracing setup — https://docs.dapr.io/operations/observability/tracing/zipkin/
- Dapr GitHub issue #3408 (header size error discussion)
- Go standard library net/http documentation (DefaultMaxHeaderBytes)
- valyala/fasthttp library documentation (ReadBufferSize default)

## Issues Found
1. **Incorrect default header size claim**: The post stated "Dapr uses the Go `net/http` defaults" with "Maximum header size: 1 MB per header field." This was wrong in two ways: (a) Dapr uses fasthttp, not Go's standard net/http, so the default read buffer is 4 KB, not 1 MB; (b) Go's 1 MB limit applies to total headers, not per header field. Fixed to correctly state Dapr uses fasthttp with a 4 KB default read buffer.

2. **Incorrect claim about `--dapr-http-max-request-size`**: The post stated "Total request header size: configurable via `--dapr-http-max-request-size`." This flag controls request **body** size (default 4 MB), not header size. Fixed to clarify that header size is controlled by `--dapr-http-read-buffer-size` and added a note that `--dapr-http-max-request-size` is for body size.

3. **Incomplete error description**: The post only mentioned HTTP 431 status code for header size errors. Dapr's fasthttp-based sidecar more commonly surfaces this as a "Too big request header" error message. Updated to mention both the 431 status code and the fasthttp error message.

## Review Notes
- The annotation name `dapr.io/http-read-buffer-size`, CLI flag `--dapr-http-read-buffer-size`, units (KB), and tracing Configuration CRD YAML are all correct.
- The Python JWT decoding snippet is syntactically correct and functional, though `base64.urlsafe_b64decode` would be more robust for JWT payloads (which use URL-safe Base64). This is a minor style preference and was not changed.
- The `kubectl logs` and `curl` diagnostic commands are correct and useful.
