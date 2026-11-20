# Validation Summary: Diagnose Fulcio OIDC Discovery Failures Behind Istio ServiceEntry Virtual IPs

## Status
validated

## Post Type
Technical troubleshooting guide with shell commands, a Mermaid diagram, and a Kubernetes YAML fragment.

## Technologies Covered
- Sigstore and Fulcio
- OpenID Connect (OIDC), discovery, and JWKS
- Istio DNS capture and ServiceEntry virtual IP allocation
- Kubernetes and kubectl
- Bash, curl, jq, and getent
- TLS, IPv4/IPv6, and CIDR destination policies
- Mermaid flowcharts

## Sources Consulted
- Istio DNS proxying, address allocation, and opt-out label: https://istio.io/latest/docs/ops/configuration/traffic-management/dns-proxy/
- Fulcio historical issue #2483: https://github.com/sigstore/fulcio/issues/2483
- Fulcio fix #2509: https://github.com/sigstore/fulcio/pull/2509
- Fulcio v1.10.0 release notes: https://github.com/sigstore/fulcio/releases/tag/v1.10.0
- Fulcio release listing: https://github.com/sigstore/fulcio/releases
- Fulcio configuration and safe dialer implementation: https://github.com/sigstore/fulcio/blob/main/pkg/config/config.go
- Fulcio v1.10.0 CLI source (retrieved directly): https://raw.githubusercontent.com/sigstore/fulcio/v1.10.0/cmd/app/serve.go
- Fulcio OIDC integration guide: https://github.com/sigstore/fulcio/blob/main/docs/oidc.md
- OpenID Connect Discovery 1.0, especially sections 3 and 4: https://openid.net/specs/openid-connect-discovery-1_0.html
- Kubernetes kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes container command and argument semantics: https://kubernetes.io/docs/tasks/inject-data-application/define-command-argument-container/
- Kubernetes ephemeral-container debugging: https://kubernetes.io/docs/tasks/debug/debug-application/debug-running-pod/#ephemeral-container
- curl option reference: https://curl.se/docs/manpage.html
- jq manual: https://jqlang.org/manual/
- Linux getent manual: https://man7.org/linux/man-pages/man1/getent.1.html
- Mermaid flowchart syntax: https://mermaid.js.org/syntax/flowchart.html

## Issues Found
1. **Commands did not reliably target the failing pod.** Deployment-based exec and logs can select a replica other than the affected one, and the Deployment template may differ from a running pod during rollout. Introduced an explicit affected-pod variable and used it consistently for configuration inspection, logs, and DNS checks.
2. **The image/args query was described as showing effective arguments.** Kubernetes specification fields do not show image-inherited defaults or expanded environment references. Changed the description to configured command and arguments, included the command field, and explained the limitation.
3. **The DNS example queried only IPv4 despite requiring both address families to be checked.** Added an ahostsv6 invocation alongside ahostsv4. The manual confirms these select AF_INET6 and AF_INET respectively; ahostsv6 can also return IPv4-mapped addresses.

## Review Notes
- Confirmed the historical rejection of the reserved IPv4 range and that static issuer configuration did not exempt it. The safe dialer checks resolved addresses before establishing the TCP connection.
- Confirmed v1.10.0 includes PR #2509. Its CLI exposes --oidc-allowed-cidrs and --oidc-blocked-cidrs; explicit blocks take precedence over exceptions. The post correctly avoids assuming every Helm chart exposes these flags.
- Confirmed Istio's documented allocation range and the exact opt-out label. The existing routing and mesh-only hostname caveats are valid; behavior must be checked against the deployed mesh version and mode.
- Confirmed the discovery URL construction and issuer equality requirement. Curl connectivity and TLS validation do not demonstrate acceptance by Fulcio's destination policy.
- The curl command does not enable redirect following. Its output is an inspection aid, not an automated assertion: --fail rejects HTTP errors starting at 400, and a shell pipeline without pipefail can mask curl's exit status. A zero pipeline exit status alone must not be treated as successful discovery.
- Reviewed Bash syntax, jq filters, kubectl options, the YAML fragment, and Mermaid syntax. Existing post links resolve to the intended upstream resources.
- No live cluster, deployed Fulcio instance, issuer, or test token was supplied. Network behavior, chart integration, certificate issuance, and the complete signing canary were not executed; those remain deployment-specific verification steps.
