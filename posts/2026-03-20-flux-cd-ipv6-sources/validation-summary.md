# Validation Summary: How to Configure Flux CD Source Controllers with IPv6 - Sources

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Flux CD source-controller
- Flux `GitRepository`, `HelmRepository`, and `Kustomization` resources
- Kubernetes
- IPv6 URL syntax
- SSH and HTTPS authentication for Git sources

## Sources Consulted
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux HelmRepository documentation: https://fluxcd.io/flux/components/source/helmrepositories/
- Flux Source API v1 reference: https://fluxcd.io/flux/components/source/api/v1/
- Flux CLI docs for `flux get sources all`: https://fluxcd.io/flux/cmd/flux_get_sources_all/
- Flux CLI docs for `flux get sources git`: https://fluxcd.io/flux/cmd/flux_get_sources_git/
- Flux CLI docs for `flux reconcile source git`: https://fluxcd.io/flux/cmd/flux_reconcile_source_git/
- Flux source-controller Dockerfile: https://raw.githubusercontent.com/fluxcd/source-controller/main/Dockerfile
- RFC 3986 URI syntax: https://datatracker.ietf.org/doc/html/rfc3986
- BusyBox applet reference: https://busybox.net/downloads/BusyBox.html
- OpenSSH `ssh-keyscan` manual: https://man.openbsd.org/ssh-keyscan.1

## Issues Found
- The post used invalid placeholder IPv6 literals such as `[2001:db8::gitea]` and `[2001:db8::charts-server]`. I replaced them with valid documentation-prefix IPv6 addresses (`[2001:db8::10]` and `[2001:db8::20]`) because RFC 3986 requires bracketed IPv6 hosts to be actual IPv6 literals.
- The `HelmRepository` example used `source.toolkit.fluxcd.io/v1beta2`. I updated it to `source.toolkit.fluxcd.io/v1`, which is the current API version documented by Flux.
- The HTTPS Secret example showed `caFile` as a base64 value under `stringData`. I corrected this to `ca.crt` with PEM content because `stringData` expects plain string values, and current Flux docs use `ca.crt`.
- The SSH `known_hosts` example used an invalid pseudo-host and did not force IPv6 scanning. I updated it to `ssh-keyscan -6 -H 2001:db8::10` so the example matches valid IPv6 host-key collection.
- The troubleshooting commands assumed tools and flags that do not match the current source-controller container image. I changed `ip -6` to `ip -f inet6`, replaced `curl -6` with `wget`, and replaced `dig AAAA` with `nslookup` to better fit the Alpine/BusyBox-based image used by source-controller.
- The description said “Helm registries” while the post demonstrates `HelmRepository` resources. I corrected this to “Helm repositories.”

## Review Notes
- `flux get sources all` is currently documented by Flux as a preview command, so its interface may change in future releases even though the example is valid today.
- The IPv6 reachability check against `https://ipv6.icanhazip.com` assumes outbound internet access from the controller Pod. In clusters with restricted egress, testing against the actual Git or Helm endpoint is more representative.
