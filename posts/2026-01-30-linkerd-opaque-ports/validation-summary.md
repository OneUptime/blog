# Validation Summary: How to Create Linkerd Opaque Ports

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Linkerd
- Kubernetes
- Linkerd proxy protocol detection
- Linkerd opaque ports
- Linkerd policy `Server` resources
- PostgreSQL on Kubernetes
- Linkerd CLI and Linkerd Viz CLI

## Sources Consulted
- Linkerd TCP Proxying and Protocol Detection: https://linkerd.io/2-edge/features/protocol-detection/
- Linkerd Proxy Configuration reference: https://linkerd.io/2-edge/reference/proxy-configuration/
- Linkerd Authorization Policy reference: https://linkerd.io/2-edge/reference/authorization-policy/
- Linkerd diagnostics CLI reference: https://linkerd.io/2-edge/reference/cli/diagnostics/
- Linkerd Tap / Viz access documentation: https://linkerd.io/2-edge/tasks/securing-linkerd-tap/
- Linkerd Troubleshooting checks for opaque ports: https://linkerd.io/2-edge/tasks/troubleshooting/
- Kubernetes Service application protocol documentation: https://kubernetes.io/docs/concepts/services-networking/service/#application-protocol

## Issues Found
- The intro implied Linkerd simply interprets traffic as HTTP/HTTP2 by default. Updated it to say Linkerd uses protocol detection for HTTP, HTTP/2, and gRPC.
- The custom protocol section incorrectly mentioned "gRPC with custom codecs" as an opaque-port use case. gRPC is HTTP/2-based and is detected by Linkerd, so that example was removed.
- The configuration section did not mention the current preferred Service `appProtocol: linkerd.io/opaque` mechanism. Added this and updated Service examples to include `appProtocol`.
- The namespace annotation section omitted Linkerd's important replacement behavior for `config.linkerd.io/opaque-ports`. Added that values replace, rather than augment, Linkerd's default opaque ports.
- The `Server` example used `policy.linkerd.io/v1beta2` and did not warn that `Server` resources can deny traffic by default. Updated it to the documented `v1beta1` example version and added `accessPolicy: audit` to avoid an unintentionally blocking example.
- The application example incorrectly suggested adding `config.linkerd.io/opaque-ports` to the client pod for outbound database connections. Removed that annotation and clarified that destination pods and Services should be configured consistently.
- The latency diagram gave unverified timing values for protocol detection and port checks. Removed the specific timing claims.
- The verification commands mixed a PostgreSQL StatefulSet with Deployment resource names and used the legacy `linkerd tap` command. Updated commands to use `sts/postgres`, `statefulset/postgres`, and `linkerd viz stat`, and clarified that opaque traffic is observed through TCP metrics rather than HTTP/gRPC tap output.
- The best-practices and conclusion sections incorrectly recommended annotating both client and server pods. Updated them to recommend consistent Service and destination pod configuration.

## Review Notes
The YAML snippets are illustrative and still assume supporting resources such as the `database` namespace and `postgres-secret` exist. The post now reflects current Linkerd guidance, including `appProtocol` for normal Service traffic and `config.linkerd.io/opaque-ports` for cases where `appProtocol` is not sufficient.
