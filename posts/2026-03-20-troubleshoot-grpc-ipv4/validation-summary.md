# Validation Summary: How to Troubleshoot gRPC IPv4 Connection Failures

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- gRPC
- grpcurl
- Python grpcio
- Go grpc-go logging
- Protocol Buffers code generation
- OpenSSL
- Linux networking tools (`tcpdump`, `ss`, Bash `/dev/tcp`)
- Kubernetes `kubectl`
- iptables

## Sources Consulted
- gRPC status codes and generated-library error mappings: https://grpc.github.io/grpc/core/md_doc_statuscodes
- gRPC error handling guide: https://grpc.io/docs/guides/error/
- gRPC C-core environment variables: https://grpc.github.io/grpc/cpp/md_doc_environment_variables.html
- gRPC C-core troubleshooting guide: https://chromium.googlesource.com/external/github.com/grpc/grpc.git/+/81f8f76c5d495654c14740a0a0707c6543213246/TROUBLESHOOTING.md
- gRPC trace flags reference: https://chromium.googlesource.com/external/github.com/grpc/grpc/+/HEAD/doc/trace_flags.md
- gRPC Python API reference: https://grpc.github.io/grpc/python/_modules/grpc.html
- gRPC Python quick start and code generation command: https://grpc.io/docs/languages/python/quickstart/
- grpcurl README and CLI flag definitions: https://github.com/fullstorydev/grpcurl
- grpcurl command source flag definitions: https://raw.githubusercontent.com/fullstorydev/grpcurl/master/cmd/grpcurl/grpcurl.go
- grpc-go `grpclog` package documentation: https://pkg.go.dev/google.golang.org/grpc/grpclog
- OpenSSL `s_client` documentation: https://docs.openssl.org/3.6/man1/openssl-s_client/
- Kubernetes kubectl reference: https://kubernetes.io/docs/reference/kubectl/kubectl-cmds/

## Issues Found
- The status-code table described `UNAUTHENTICATED` as a TLS/certificate failure caused by a wrong CA or expired cert. gRPC defines `UNAUTHENTICATED` as missing or invalid authentication credentials, while TLS handshake and certificate trust failures commonly surface as transport/connectivity failures such as `UNAVAILABLE`. Updated the table and Python advice to separate auth credentials from TLS settings.
- The `INTERNAL` row described the common cause as a server handler bug. gRPC library documentation maps unhandled server exceptions to `UNKNOWN`; `INTERNAL` is reserved for internal invariant/protocol/parsing errors or explicit application status returns. Updated the row to avoid that misleading mapping.
- The grpcurl method-call example did not note that invoking by service/method still needs reflection unless proto source or a protoset is supplied. Added that caveat to the command comment.
- The Python logging example used `GRPC_TRACE=all`; current gRPC trace-flag docs describe named tracers and glob patterns, with `*` as the all-traces pattern. Replaced it with targeted tracers relevant to connection troubleshooting and added a short caveat that `GRPC_VERBOSITY` is deprecated and should be limited to local debugging.
- The Python error example printed trailing metadata under a `Debug` label. The gRPC Python API exposes that value as trailing metadata, not debug output. Renamed the label and guarded against missing metadata.
- The OpenSSL TLS probe did not advertise HTTP/2 ALPN and did not request verification failure on certificate problems. Added `-alpn h2`, `-verify_ip`, and `-verify_return_error` so the command better matches a gRPC-over-TLS IPv4 check.
- The conclusion claimed most `UNAVAILABLE` errors come from a short list of causes. Official docs describe `UNAVAILABLE` more broadly as service unavailable or broken connectivity. Changed the wording to "Common" to avoid an unsupported quantitative claim.

## Review Notes
The remaining commands are representative troubleshooting commands and may require local privileges or environment-specific adjustments: `iptables` generally requires root and may not be the active firewall frontend on nftables/firewalld systems; `ss -p` may need elevated privileges to show process names; `tcpdump` usually requires packet-capture privileges; and Kubernetes commands may need a namespace flag depending on the cluster context.
