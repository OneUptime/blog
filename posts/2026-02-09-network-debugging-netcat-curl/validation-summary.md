# Validation Summary: How to Implement Network Debugging with netcat and curl in Kubernetes Pods

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Pods and Services
- kubectl
- netcat / nc
- curl
- DNS utilities: host and dig
- OpenSSL
- Service mesh HTTP headers
- Basic shell scripting

## Sources Consulted
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes Pod API reference: https://kubernetes.io/docs/reference/kubernetes-api/core/pod-v1/
- Kubernetes DNS for Services and Pods: https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/
- Kubernetes authentication reference: https://kubernetes.io/docs/reference/access-authn-authz/authentication/
- curl man page: https://curl.se/docs/manpage.html
- OpenBSD nc manual page: https://man.openbsd.org/nc.1
- Local nicolaka/netshoot:latest runtime checks for bundled tools and netcat implementation

## Issues Found
- The quick `kubectl run` example omitted `--command`, so `/bin/bash` could be treated as container args rather than explicitly replacing the image command. Changed it to `kubectl run netdebug --image=nicolaka/netshoot -it --rm --command -- /bin/bash`.
- The UDP netcat example described a "connection", but UDP has no connection handshake and `nc -zuv` is best-effort reachability testing. Updated the comment to avoid implying TCP-like connection semantics.
- The `nc -l 8080 -k` example was labeled as an echo server, but OpenBSD netcat's `-k` keeps listening for additional connections; it does not echo received data by itself. Updated the label to "Persistent listener".
- The Kubernetes API curl example did not mention RBAC. A service account token can authenticate, but listing pods succeeds only if the service account is authorized. Added an RBAC caveat to the comment.
- The curl TLS examples used `--tlsv1.2` and `--tlsv1.3` as "specific TLS version" tests. Current curl treats these as minimum TLS versions; added `--tls-max` to make the examples test exact versions.

## Review Notes
- The post uses `nicolaka/netshoot:latest`, which works for a disposable debug pod but is not pinned. For reproducible production runbooks, pinning an image tag or digest would be better.
- The service account token example is technically valid for in-cluster API access, but practical results depend on the mounted token configuration and Kubernetes RBAC permissions.
- Netcat behavior varies across implementations. The article's examples align with OpenBSD netcat as bundled in the checked `nicolaka/netshoot:latest` image.
