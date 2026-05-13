# Validation Summary: How to Fix TLS handshake timeout Error in Flux

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Flux CD
- Kubernetes
- GitOps Toolkit source-controller and helm-controller
- TLS/HTTPS
- HTTP proxies
- Calico
- Linux networking and MTU diagnostics
- OpenSSL

## Sources Consulted
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux source API v1 reference: https://fluxcd.io/flux/components/source/api/v1/
- Flux proxy settings documentation: https://fluxcd.io/flux/installation/configuration/proxy-setting/
- Flux CLI reference for `flux reconcile source git`: https://fluxcd.io/flux/cmd/flux_reconcile_source_git/
- Flux CLI reference for `flux create secret git`: https://fluxcd.io/flux/cmd/flux_create_secret_git/
- Kubernetes `kubectl run` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Calico FelixConfiguration reference: https://docs.tigera.io/calico/latest/reference/resources/felixconfig/
- Calico MTU configuration documentation: https://docs.tigera.io/calico/latest/networking/configuring/mtu/
- Go `net/http` Transport documentation: https://pkg.go.dev/net/http
- RFC 8446, The Transport Layer Security Protocol Version 1.3: https://www.rfc-editor.org/rfc/rfc8446
- iputils `ping(8)` manual: https://man7.org/linux/man-pages/man8/ping.8.html
- BusyBox command reference: https://busybox.net/downloads/BusyBox.html

## Issues Found
- The MTU diagnostic command used the `busybox` image with `ping -M do`. The `-M do` path-MTU-discovery option is from iputils `ping`, while BusyBox `ping` does not reliably support that option. Changed the command to use an Alpine pod, install `iputils`, and then run the same `ping -M do` test.
- The proxy configuration snippet was an incomplete `apps/v1` Deployment object and would not be directly valid if applied as a Deployment manifest because required fields such as `spec.selector` were missing. Changed it to a Kustomize patch format aligned with Flux proxy configuration guidance and added the documented `.cluster.local.` entry to `NO_PROXY`.

## Review Notes
- The GitRepository SSH example uses the current `source.toolkit.fluxcd.io/v1` API and valid `ssh://` URL form. Flux documentation requires SSH secrets to include `identity` and `known_hosts`; the included `identity.pub` entry is acceptable but not required.
- The Calico MTU patch uses current FelixConfiguration fields, but MTU values are environment-specific and should be selected after testing the actual network path.
