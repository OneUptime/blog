# Validation Summary: How to Use CoreDNS Etcd Plugin for Dynamic DNS Record Management in Kubernetes

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Kubernetes
- CoreDNS
- CoreDNS etcd plugin
- etcd v3.5
- etcdctl
- etcd v3 JSON gRPC gateway
- Go etcd client v3
- Kubernetes RBAC

## Sources Consulted
- CoreDNS etcd plugin documentation: https://coredns.io/plugins/etcd/
- etcd v3.5 API documentation: https://etcd.io/docs/v3.5/learning/api/
- etcd gRPC gateway documentation: https://etcd.io/docs/v3.6/dev-guide/api_grpc_gateway/
- Kubernetes kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes JSONPath documentation: https://kubernetes.io/docs/reference/kubectl/jsonpath/
- Go etcd client v3 documentation: https://pkg.go.dev/go.etcd.io/etcd/client/v3

## Issues Found
- The post claimed the CoreDNS etcd plugin supports all DNS record types. CoreDNS documents the plugin as a SkyDNS service discovery backend that is not a generic DNS zone data plugin and implements only a subset of DNS record types. Changed the claim to common SkyDNS record types such as A, AAAA, SRV, TXT, and reverse records.
- The post described watch-based automatic reloading as a CoreDNS etcd plugin advantage. The CoreDNS documentation describes etcd-backed lookups and SkyDNS behavior, not a watch-based reload mechanism. Changed this to runtime updates through etcd-backed lookups.
- The etcd keys used `/coredns/dynamic.local/...`, which does not match CoreDNS/SkyDNS reversed-label key layout. Updated examples to use keys such as `/coredns/local/dynamic/test` for `test.dynamic.local`.
- The SRV and TXT examples used incorrect key paths for the intended DNS names. Updated them to SkyDNS-compatible reversed-label paths.
- The Go example built keys as `prefix/zone/name`, which would write records to paths CoreDNS would not query. Added a `dnsKey` helper that reverses zone and name labels into SkyDNS-compatible etcd paths.
- The service registrar used the obsolete etcd v2 `/v2/keys` API while the post deploys etcd `v3.5.9`. Replaced it with the etcd v3 JSON gateway `/v3/kv/put` API and base64-encoded key/value payloads.
- The service registrar parsed `kubectl get svc --output-watch-events` output incorrectly and used Bash-specific `[[ ... ]]` while running the script with `sh`. Updated it to POSIX shell syntax and explicit custom-column output.
- The dynamic DNS test job also used the obsolete etcd v2 `/v2/keys` API. Updated create, update, and delete operations to use `/v3/kv/put` and `/v3/kv/deleterange` with base64-encoded keys and values.

## Review Notes
- The examples are now aligned with the CoreDNS etcd plugin's SkyDNS key layout and etcd v3 API behavior. In a production implementation, the registrar should also handle service deletion events and verify that the chosen container image includes all shell utilities used by the script.
