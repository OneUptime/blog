# Validation Summary: How to Configure Flux CD Source Controllers with IPv6

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Flux CD
- Flux source-controller
- Kubernetes
- IPv6
- GitRepository
- HelmRepository
- OCIRepository
- Git over HTTPS and SSH
- TLS / X.509 certificates

## Sources Consulted
- Flux documentation, "Git Repositories": https://fluxcd.io/flux/components/source/gitrepositories/
- Flux documentation, "Helm Repositories": https://fluxcd.io/flux/components/source/helmrepositories/
- Flux documentation, "OCI Repositories": https://fluxcd.io/flux/components/source/ocirepositories/
- Flux documentation, "Source API reference v1": https://fluxcd.io/flux/components/source/api/v1/
- Flux CLI documentation, "flux get sources git": https://fluxcd.io/flux/cmd/flux_get_sources_git/
- Flux CLI documentation, "flux get sources all": https://fluxcd.io/flux/cmd/flux_get_sources_all/
- Flux CLI documentation, "flux install": https://fluxcd.io/flux/cmd/flux_install/
- Flux documentation, "Installation": https://fluxcd.io/flux/installation/
- Flux documentation, "Optional components": https://fluxcd.io/flux/installation/configuration/optional-components/
- Kubernetes documentation, "IPv4/IPv6 dual-stack": https://kubernetes.io/docs/concepts/services-networking/dual-stack/
- Kubernetes documentation, "Pull an Image from a Private Registry": https://kubernetes.io/docs/tasks/configure-pod-container/pull-image-private-registry/
- Kubernetes documentation, "kubectl exec": https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Go documentation, `crypto/x509`: https://pkg.go.dev/crypto/x509
- RFC 6125, "Representation and Verification of Domain-Based Application Service Identity within TLS": https://www.rfc-editor.org/rfc/rfc6125
- Flux source-controller Dockerfile: https://raw.githubusercontent.com/fluxcd/source-controller/main/Dockerfile

## Issues Found
- The post used invalid IPv6 literals such as `2001:db8::git`, `2001:db8::helm`, and `2001:db8::registry`, which are not syntactically valid IPv6 addresses. I replaced them with valid documentation-prefix IPv6 literals (`2001:db8::10`, `2001:db8::20`, `2001:db8::30`) throughout the examples.
- The `GitRepository` HTTPS example used `.spec.verify.provider: cosign`, but current Flux GitRepository verification uses PGP public keys via `.spec.verify.mode` and `.spec.verify.secretRef`, not a `provider` field. I removed the invalid verification stanza.
- The post used `flux get source git`, but the current Flux CLI documents `flux get sources git`. I updated both CLI examples to the current command form.
- The `HelmRepository` and `OCIRepository` manifests used `source.toolkit.fluxcd.io/v1beta2`. Current Flux documentation and the source-controller API list these resources under `source.toolkit.fluxcd.io/v1`, so I updated both manifests.
- The `HelmRepository` example placed TLS CA material in the authentication secret via `caFile`. Current Flux docs mark TLS material in `.spec.secretRef` as deprecated for HelmRepository and direct users to `.spec.certSecretRef`. I split the example into a basic-auth `secretRef` and a TLS `certSecretRef` using `ca.crt`.
- The `OCIRepository` credentials example used a plain `Opaque` secret with `username` and `password`, but Flux requires `.spec.secretRef` for OCIRepository to reference a registry secret in imagePullSecret / Docker config format. I replaced it with a `kubernetes.io/dockerconfigjson` example.
- The `OCIRepository` example also included a bare `verify.provider: cosign` stanza without the rest of the verification configuration needed to make that example reliable. I removed that block rather than leave a misleading example.
- The IPv6-only Flux section implied there are IPv6-specific Flux install flags and that dual-stack automatically means an IPv6 `ClusterIP` for `source-controller`. Current Flux install docs expose no IPv6-specific flag, and Kubernetes dual-stack service family assignment depends on service and cluster IP-family configuration. I rewrote that section to use standard `flux install` plus service-family inspection with `ipFamilies` and `clusterIPs`.
- The verification section suggested running `curl` and `ip` inside the `source-controller` container. The current source-controller Dockerfile builds a minimal image and only adds `ca-certificates`, so those utilities are not safe assumptions. I replaced those checks with source status, controller logs, and Kubernetes API IP reporting.
- The troubleshooting and conclusion sections overstated certificate requirements by implying every IPv6 HTTPS endpoint needs an IP SAN. I corrected that to the precise behavior: IP SANs are required when using IPv6 literals in URLs; hostname URLs instead need matching DNS SANs and AAAA records.
- The SSH `known_hosts` guidance was too specific about formatting. I corrected it to instruct readers to use the exact `ssh-keyscan` output for the IPv6 address or hostname in use.

## Review Notes
- Flux does not have a special IPv6 mode for source-controller. Successful IPv6 access depends on the Kubernetes cluster network, DNS resolution, and the remote Git / Helm / OCI endpoint being reachable over IPv6.
- The post now aligns with the current `source.toolkit.fluxcd.io/v1` APIs for `GitRepository`, `HelmRepository`, and `OCIRepository`.
- The OCI registry secret shown in the revised example is valid YAML for Kubernetes, but in practice many operators may prefer generating the same secret with `kubectl create secret docker-registry` or `flux create secret oci`.
