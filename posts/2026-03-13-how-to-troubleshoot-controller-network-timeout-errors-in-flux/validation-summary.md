# Validation Summary: How to Troubleshoot Controller Network Timeout Errors in Flux

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Flux controllers and Flux CLI
- Kubernetes and kubectl
- Kubernetes NetworkPolicy
- CoreDNS
- HTTP/HTTPS proxy configuration
- TLS custom CA trust
- SSH Git repository access
- HelmRepository and GitRepository source APIs

## Sources Consulted
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux HelmRepository documentation: https://fluxcd.io/flux/components/source/helmrepositories/
- Flux proxy settings documentation: https://fluxcd.io/flux/installation/configuration/proxy-setting/
- Flux CLI documentation for `flux get sources all`: https://fluxcd.io/flux/cmd/flux_get_sources_all/
- Flux CLI documentation for `flux get helmreleases`: https://fluxcd.io/flux/cmd/flux_get_helmreleases/
- Flux CLI documentation for `flux reconcile source helm`: https://fluxcd.io/flux/cmd/flux_reconcile_source_helm/
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes generated kubectl reference for `kubectl run`: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes generated kubectl command reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands

## Issues Found
- The DNS verification command executed `nslookup` inside the `source-controller` Deployment. Flux controller images should not be assumed to contain network debugging tools, so the command now runs from the previously created `netdebug` pod in the same namespace.
- The proxy environment inspection command piped plain `jsonpath` output to `python3 -m json.tool`. Updated it to use `jsonpath-as-json`, which is the kubectl output format intended for JSONPath output that should remain valid JSON.
- The NetworkPolicy example used `to: []` for the outbound HTTP/HTTPS/SSH rule. Kubernetes NetworkPolicy examples use omitted `to` to mean all destinations; an empty destination list is not the correct way to express that intent. Removed the empty `to` field.
- The SSH connectivity command executed `ssh` inside the `source-controller` Deployment. Updated it to use the `netdebug` pod for the same reason as the DNS check.
- The known-hosts check assumed the Secret was always named `flux-system`. Flux GitRepository SSH credentials are provided through the GitRepository's referenced Secret, so the snippet now shows retrieving the Secret name from `.spec.secretRef.name` before reading `known_hosts`.

## Review Notes
The remaining Flux API snippets use current `source.toolkit.fluxcd.io/v1` fields for GitRepository and HelmRepository timeouts. The HelmRepository timeout field is not applicable to OCI HelmRepository objects, but the post's example is an HTTP/S Helm repository, so it is valid.
