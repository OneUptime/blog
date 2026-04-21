# Validation Summary: How to Test GitOps Pipelines in IPv6-Only Environments

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- IPv6-only Kubernetes networking
- kind
- K3s
- Kubernetes Services and dual-stack fields
- Flux CD
- Argo CD
- GitHub Actions
- Python `http.server`
- Python `ipaddress`

## Sources Consulted
- kind configuration documentation: https://kind.sigs.k8s.io/docs/user/configuration/
- Kubernetes IPv4/IPv6 dual-stack documentation: https://kubernetes.io/docs/concepts/services-networking/dual-stack/
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- K3s basic network options: https://docs.k3s.io/networking/basic-network-options
- Flux CLI documentation: https://fluxcd.io/flux/cmd/
- Flux GitHub Action documentation: https://fluxcd.io/flux/flux-gh-action/
- Flux `create source git` CLI documentation: https://fluxcd.io/flux/cmd/flux_create_source_git/
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Argo CD installation documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/installation/
- Argo CD getting started documentation: https://argo-cd.readthedocs.io/en/stable/getting_started/
- Python `http.server` documentation: https://docs.python.org/3.12/library/http.server.html
- Python `ipaddress` documentation: https://docs.python.org/3.12/library/ipaddress.html
- GitHub Actions runner image software list: https://raw.githubusercontent.com/actions/runner-images/main/images/ubuntu/Ubuntu2404-Readme.md
- RFC 4291, IP Version 6 Addressing Architecture: https://www.rfc-editor.org/rfc/rfc4291.html
- RFC 3986, URI Generic Syntax: https://datatracker.ietf.org/doc/html/rfc3986/

## Issues Found
- The kind pod and service subnet examples used invalid IPv6 text (`fd00:pods::/64` and `fd00:svcs::/112`). I changed them to valid IPv6 ULA CIDRs aligned with kind's documented IPv6 defaults: `fd00:10:244::/56` for pods and `fd00:10:96::/112` for services.
- The `disableDefaultCNI: false` comment incorrectly described that field as disabling IPv4. I changed the comment to say it keeps kind's default CNI enabled.
- The Flux Git SSH URL used an invalid IPv6 literal (`2001:db8::git`). I changed it to a syntactically valid documentation IPv6 address and added a note to replace it with the user's Git server IPv6 address.
- Several expected-output comments still referred to the invalid `fd00:pods::` and `fd00:svcs::` ranges. I updated them to the corrected ranges.
- The Argo CD port-forward comment claimed the command port-forwarded "over IPv6". `kubectl port-forward` creates a local API-server tunnel and `localhost` may resolve to IPv4 or IPv6, so I changed the wording to local port-forward testing.
- The Argo CD install command used plain `kubectl apply`. Current Argo CD getting started documentation uses server-side apply with `--force-conflicts` for the stable install manifest, so I updated the command accordingly.
- The sample workload used `nginx:alpine` with a `LISTEN_ADDR` environment variable, but the standard nginx image does not use that variable to configure its listener. I changed the example to `python:3.12-alpine` running `python -m http.server 8080 --bind ::`, which explicitly binds to IPv6.
- The Python validation tests only required at least one IPv6 address, which could allow dual-stack resources to pass. I changed the node, service, and pod checks to reject non-IPv6 InternalIPs, ClusterIPs, and Pod IPs.
- The Python helper returned an `ERROR:` string on command failures, which would later fail as invalid JSON rather than reporting the failed command clearly. I changed it to assert on the command return code.
- The GitHub Actions example used `flux install` without installing the Flux CLI. The current Ubuntu runner image includes kind and kubectl, but not Flux, so I added the official `fluxcd/flux2/action@main` setup step.
- The conclusion said K3s IPv6-only clusters only require `--cluster-cidr`. K3s documents single-stack IPv6 with both `--cluster-cidr` and `--service-cidr`, so I corrected that sentence.

## Review Notes
The local environment does not have `kind`, `kubectl`, `flux`, or `argocd` installed, so cluster execution was not performed locally. I validated syntax with the available local Python/PyYAML tooling and checked the commands and configuration against official documentation. In a real CI environment, IPv6-only GitOps tests also need reachable IPv6 or NAT64 access for upstream Git servers and image registries.
