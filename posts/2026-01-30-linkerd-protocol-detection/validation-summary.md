# Validation Summary: How to Implement Linkerd Protocol Detection

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Linkerd
- Kubernetes Services and Deployments
- Linkerd Viz CLI
- Helm
- Prometheus metrics
- HTTP, HTTP/2, gRPC, TCP, and TLS behavior

## Sources Consulted
- Linkerd TCP Proxying and Protocol Detection: https://linkerd.io/2-edge/features/protocol-detection/
- Linkerd Proxy Configuration reference: https://linkerd.io/2-edge/reference/proxy-configuration/
- Linkerd Protocol Detection Errors: https://linkerd.io/2-edge/common-errors/protocol-detection/
- Linkerd HTTP, HTTP/2, and gRPC Proxying: https://linkerd.io/2-edge/features/http-grpc/
- Linkerd Viz CLI reference: https://linkerd.io/2-edge/reference/cli/viz/
- Linkerd Proxy Metrics reference: https://linkerd.io/2-edge/reference/proxy-metrics/
- Linkerd Helm chart values: https://github.com/linkerd/linkerd2/blob/main/charts/linkerd-control-plane/values.yaml
- Kubernetes Service appProtocol documentation: https://kubernetes.io/docs/concepts/services-networking/service/#application-protocol

## Issues Found
- The detection flow incorrectly showed Linkerd terminating application TLS and peeking after TLS. Linkerd cannot decrypt application-initiated TLS traffic for L7 protocol detection, so this was changed to treat application TLS as opaque TCP.
- The protocol signature table incorrectly listed TLS as a protocol that Linkerd detects for termination. This was corrected to explain that application TLS is opaque unless terminated before Linkerd sees the traffic.
- The timeout configuration examples used unsupported `protocolDetectTimeout`, `proxy.protocolDetectTimeout`, and `config.linkerd.io/protocol-detect-timeout` settings. These were replaced with supported `appProtocol` declarations and Helm `proxy.opaquePorts` configuration.
- Opaque-port examples used Service or Pod annotations where current Linkerd guidance prefers Service `appProtocol` for ordinary Service ports. These examples were updated to use `appProtocol: linkerd.io/opaque`.
- The gRPC and HTTP/2 examples did not declare cleartext HTTP/2 when skipping detection. They now use `appProtocol: kubernetes.io/h2c` where appropriate.
- The troubleshooting section used a nonexistent `config.linkerd.io/proxy-protocol` annotation to force HTTP/2. This was replaced with `appProtocol: kubernetes.io/h2c`.
- Troubleshooting commands suggested increasing the detection timeout through unsupported annotations. These were replaced with log checks for protocol detection timeouts and Service `appProtocol` patches.
- The best-practices section claimed ordinary request latency output measured protocol detection latency. This was corrected to recommend monitoring proxy logs for protocol detection timeout messages.

## Review Notes
The post is now aligned with current Linkerd documentation. In future revisions, the author may want to mention the caveat that `config.linkerd.io/opaque-ports` is still required for cases such as unmeshed clients, headless-service/direct pod traffic, or egress resources, while `appProtocol` is the preferred declaration for normal Service ports.
