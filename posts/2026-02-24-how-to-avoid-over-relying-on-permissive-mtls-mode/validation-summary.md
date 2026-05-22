# Validation Summary: How to Avoid Over-Relying on Permissive mTLS Mode

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- Istio mutual TLS
- Istio `PeerAuthentication`
- Istio sidecar injection
- Kubernetes
- Kubernetes probes
- `kubectl`
- Prometheus metrics

## Sources Consulted
- Istio `PeerAuthentication` reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio mutual TLS migration task: https://istio.io/latest/docs/tasks/security/authentication/mtls-migration/
- Istio authentication policy task: https://istio.io/latest/docs/tasks/security/authentication/authn-policy/
- Istio security best practices: https://istio.io/latest/docs/ops/best-practices/security/
- Istio TLS configuration guide: https://istio.io/latest/docs/ops/configuration/traffic-management/tls-configuration/
- Istio app health checking and probe rewrite documentation: https://istio.io/latest/docs/ops/configuration/mesh/app-health-check/
- Istio sidecar injection documentation: https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/
- Kubernetes `kubectl run` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes `kubectl rollout restart` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/

## Issues Found
- Updated the namespace injection command to include `--overwrite`, matching Istio's documented pattern and avoiding a failure when the namespace already has an injection label.
- Updated the outside-the-mesh test command to use `kubectl run --attach --rm`. Without attaching, `kubectl run` can return after creating the pod, so `echo $?` would reflect pod creation rather than the curl command's failure. With `--attach` and `--restart=Never`, Kubernetes documents that the container process exit code is returned. Removed the separate `kubectl delete pod no-sidecar` line because `--rm` deletes the pod after the attached command exits.

## Review Notes
The `PeerAuthentication` API version, `mtls.mode` values, `portLevelMtls` usage, sidecar injection label, probe rewrite annotation, and STRICT/PERMISSIVE migration guidance are consistent with current Istio documentation. The post is written for Istio sidecar mode; ambient mode has different enforcement mechanics and is not covered by this article.
