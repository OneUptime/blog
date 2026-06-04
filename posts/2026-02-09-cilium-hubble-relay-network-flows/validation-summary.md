# Validation Summary: How to Configure Cilium Hubble Relay for Cross-Node Network Flow Aggregation

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Cilium
- Hubble Relay
- Hubble CLI
- Kubernetes
- Helm
- cert-manager
- Prometheus Operator ServiceMonitor
- Go gRPC clients
- Elasticsearch Go client

## Sources Consulted
- Cilium Hubble setup documentation: https://docs.cilium.io/en/stable/gettingstarted/hubble_setup/
- Cilium Hubble internals documentation: https://docs.cilium.io/en/stable/internals/hubble/
- Cilium Hubble TLS documentation: https://docs.cilium.io/en/latest/observability/hubble/configuration/tls/
- Cilium Helm values reference: https://docs.cilium.io/en/stable/helm-values/
- Cilium v1.14.5 Helm chart templates and values: https://github.com/cilium/cilium/tree/v1.14.5/install/kubernetes/cilium
- Cilium v1.14.5 Hubble Relay command source: https://github.com/cilium/cilium/blob/v1.14.5/hubble-relay/cmd/serve/serve.go
- Cilium Go API package documentation: https://pkg.go.dev/github.com/cilium/cilium/api/v1/observer and https://pkg.go.dev/github.com/cilium/cilium/api/v1/flow

## Issues Found
- The Relay config used `tls-hubble-server-ca-files: /var/lib/hubble-relay/tls/ca.crt`, but the Cilium chart mounts the Hubble server CA as `hubble-server-ca.crt`. Updated the path.
- The Relay config enabled server TLS while the CLI examples used plaintext. Changed the base config to `disable-server-tls: true` and added a separate TLS-enabled CLI example.
- The pprof config used `pprof-address: "localhost:6060"`, but Hubble Relay uses separate `pprof-address` and `pprof-port` settings. Updated it to `localhost` and `6062`.
- The metrics check used port `9965`, which is Hubble metrics, not Hubble Relay metrics. Updated Relay metrics checks to port `9966`.
- The buffer settings used very large values even though Relay treats the sort buffer as per request and upstream guidance recommends moderate values. Changed examples to `100` and `1s`.
- The TLS secret name and certificate SANs did not match Cilium's Hubble Relay server TLS chart behavior. Updated the secret to `hubble-relay-server-certs` and used the expected Hubble Relay server name pattern.
- The optimization example passed `--config=/etc/hubble-relay/config.yaml`, but Hubble Relay v1.14.5 does not expose a `--config` flag; it reads that path by default. Removed the invalid flag.
- The multi-cluster example used an unsupported `clusters:` configuration key. Replaced it with a valid Relay config and clarified that multi-cluster visibility is provided through Cilium ClusterMesh peer discovery.
- The Go aggregation example used deprecated/insecure gRPC setup, did not handle non-flow responses, and attempted to read a port from the endpoint object. Updated it to use `insecure.NewCredentials()`, ignore non-flow responses, handle EOF, and read destination ports from L4 TCP/UDP/SCTP fields.
- The Elasticsearch export example omitted the `bytes` import and used incorrect flow types/accessors for destination port and protocol. Updated it to use `flowpb.Flow` and helper functions for L4 protocol and destination port extraction.

## Review Notes
The post still uses Cilium `1.14.5`, which is version-specific and older than the current stable Cilium documentation checked during review. The corrected examples are aligned with the v1.14.5 chart/source where the post explicitly references that version.
