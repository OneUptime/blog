# Validation Summary: 'Couldn't Get Current Server API Group List': Clear Stale Discovery and Find Broken APIService Registrations

## Status

validated

## Post Type

Technical troubleshooting guide with Kubernetes CLI and shell examples.

## Technologies Covered

- Kubernetes API discovery, kube-apiserver, and API aggregation
- kubectl and client-go discovery caches
- APIService registrations and Metrics API
- Services, EndpointSlices, kubeadm networking, and NetworkPolicy
- TLS certificates, CA trust, aggregation authentication, and RBAC
- Bash, curl, jq, base64, and OpenSSL
- Helm and controller-managed configuration

## Sources Consulted

- Kubernetes discovery API: https://kubernetes.io/docs/concepts/overview/kubernetes-api/#discovery-api
- Kubernetes API aggregation and discovery latency: https://kubernetes.io/docs/concepts/extend-kubernetes/api-extension/apiserver-aggregation/
- Aggregation routing, authentication, and authorization: https://kubernetes.io/docs/tasks/extend-kubernetes/configure-aggregation-layer/
- APIService fields and defaults: https://kubernetes.io/docs/reference/kubernetes-api/apiregistration/api-service-v1/ (the post's cluster-resources URL redirects here)
- Metrics API v1 reference: https://kubernetes.io/docs/reference/external-api/metrics.v1/
- kubectl global options: https://kubernetes.io/docs/reference/kubectl/kubectl/
- kubectl api-resources: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_api-resources/
- kubectl proxy: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_proxy/
- kubectl JSONPath: https://kubernetes.io/docs/reference/kubectl/jsonpath/
- kubectl discovery invalidation implementation: https://raw.githubusercontent.com/kubernetes/kubectl/master/pkg/cmd/apiresources/apiresources.go
- client-go disk and memory cache documentation: https://pkg.go.dev/k8s.io/client-go/discovery/cached/disk and https://pkg.go.dev/k8s.io/client-go/discovery/cached/memory
- client-go kubeconfig redaction implementation: https://raw.githubusercontent.com/kubernetes/client-go/master/tools/clientcmd/api/helpers.go
- Aggregated discovery v2 fields and freshness values: https://raw.githubusercontent.com/kubernetes/api/master/apidiscovery/v2/types.go
- Aggregator TLS transport implementation: https://raw.githubusercontent.com/kubernetes/kube-aggregator/master/pkg/apiserver/handler_proxy.go
- API health endpoints: https://kubernetes.io/docs/reference/using-api/health-checks/
- EndpointSlices: https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/
- kubeadm implementation details: https://kubernetes.io/docs/reference/setup-tools/kubeadm/implementation-details/
- Helm release upgrades: https://helm.sh/docs/intro/using_helm/
- OpenSSL x509 command: https://docs.openssl.org/master/man1/openssl-x509/
- jq manual: https://jqlang.org/manual/
- curl manual: https://curl.se/docs/manpage.html
- Local kubectl v1.34.1 help for api-resources, config view, get, and wait; local Bash syntax parsing and mktemp permission check.

## Issues Found

1. **Overstated kubeconfig redaction.** The introduction to `config view --raw=false` promised no credential exposure. Clarified that exec-plugin arguments, environment values, and URLs can still contain secrets and require sanitization before sharing.
2. **Misleading cache diagnosis.** `api-resources` invalidates discovery by default. Added this fact and explained that a separate directory isolates filesystem state and permissions. Required repeatable results and consideration of intermittent server failures before attributing a difference to the cache. Narrowed the claim about a fresh-cache failure to stale local discovery data rather than all possible cache problems.
3. **Unspecified discovery version prerequisite.** Identified Kubernetes 1.30 as the start of stable aggregated discovery support for the v2 representation used by the example.
4. **Unprotected temporary output.** The fixed `/tmp/apis-discovery.json` path did not implement the text's protected-storage guidance. Replaced it with a `mktemp` file and used the same quoted variable in curl and jq.
5. **Readiness hidden by the chosen output.** EndpointSlice wide output does not show per-endpoint readiness conditions. Changed that command to YAML so readers can inspect the conditions as instructed.
6. **Incorrect mandatory CA bundle claim.** Explained that `caBundle` is optional when system trust roots suffice, supports validation of the serving certificate chain, and is base64-encoded when represented in API JSON/YAML.
7. **Certificate inspection overstated.** The pipeline reads the configured CA, not the live server certificate. Clarified that it requires a populated bundle and displays its first certificate. Kept live certificate inspection separate and explicitly called for chain verification.
8. **Helm reconciliation overstated.** Helm alone does not continuously revert edits. Distinguished controller reconciliation from changes that a subsequent Helm upgrade may overwrite.
9. **Ambiguous HA verification.** Clarified that requests must pass through each replica. Running kubectl on each control-plane host with a load-balanced kubeconfig does not ensure this.
10. **Discovery documentation fragment.** Updated the link fragment from `#api-discovery` to the current `#discovery-api` section.

## Review Notes

- Checked all 14 Bash code blocks with `bash -n`; all passed. Tested the jq expression with Current and Stale fixture versions; only the stale version was emitted. Confirmed local `mktemp` creates a file with mode 0600.
- Verified command flags and output expressions against official references and local CLI help. No live cluster was queried, no proxy was started, and no cluster resources or existing kubeconfig caches were changed. End-to-end networking, credentials, certificates, and availability remain deployment-specific.
- The discovery media type, freshness fields, five-second extension discovery requirement, Service port 443 default, local APIService semantics, Service DNS identity, and aggregation trust/RBAC guidance are supported by the consulted sources.
- The official Metrics v1 reference exists and documents `metrics.k8s.io/v1`; this does not establish that every installed metrics server serves it. The post correctly directs readers to the actual APIService group and version.
- Older clusters may require legacy discovery. Example metrics-server names, labels, versions, and ports must match the installation. Non-resource health endpoints and APIService inspection require suitable access permissions.
- Reviewed all links in the post, including the author profile. The APIService reference redirects to its current documentation location; the discovery section fragment was corrected.
- Changes were limited to technical corrections within existing sections. Validation date: 2026-09-05.
