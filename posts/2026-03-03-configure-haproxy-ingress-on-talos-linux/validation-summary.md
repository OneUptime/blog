# Validation Summary: How to Configure HAProxy Ingress on Talos Linux

## Status
validated

## Post Type
Tutorial / Step-by-step guide

## Technologies Covered
- Talos Linux
- HAProxy Kubernetes Ingress Controller (haproxytech/kubernetes-ingress)
- Helm 3
- Kubernetes (Ingress, Service, Deployment, ConfigMap)
- kubectl, talosctl

## Sources Consulted
- HAProxy Helm chart values & helpers: https://github.com/haproxytech/helm-charts/tree/main/kubernetes-ingress
- HAProxy Kubernetes Ingress annotations reference: https://github.com/haproxytech/kubernetes-ingress/blob/master/documentation/annotations.md
- HAProxy Kubernetes Ingress ConfigMap reference: https://www.haproxy.com/documentation/kubernetes-ingress/community/configuration-reference/configmap/
- HAProxy Kubernetes Ingress TCP tutorial: https://www.haproxy.com/documentation/kubernetes-ingress/ingress-tutorials/load-balance-tcp/
- Talos CLI reference: https://docs.siderolabs.com/talos/v1.12/reference/cli
- Talos machine config (sysctls): https://docs.siderolabs.com/talos/v1.10/reference/configuration/v1alpha1/config/

## Issues Found

1. **Invalid `stats-auth` ConfigMap key.** The post placed `stats-auth: "admin:password123"` under `controller.config`. This key is not part of the haproxytech kubernetes-ingress ConfigMap reference. Replaced with `stats-config-snippet` carrying a raw `stats auth admin:password123` HAProxy directive, which is the documented way to add basic auth to the stats listener.
2. **Incomplete TCP load-balancing instructions.** The post implied that creating a ConfigMap named `haproxy-ingress-tcp` was sufficient. The controller actually requires a `--configmap-tcp-services=<ns>/<name>` startup flag pointing at that ConfigMap. Added a short snippet showing how to pass it via `controller.extraArgs` in Helm values.
3. **Wrong stats page URL path.** The post referenced `http://<NODE_IP>:31024/stats`. The stats listener in this controller binds the entire port; the stats page is served at `/`, not `/stats`. Corrected the curl example.
4. **Wrong service name in port-forward.** The post used `svc/haproxy-ingress`, but the chart's fullname template is `{release}-{chart}`, so installing release `haproxy-ingress` of chart `kubernetes-ingress` produces `haproxy-ingress-kubernetes-ingress`. Updated the `kubectl port-forward` command accordingly.
5. **Deprecated `whitelist` annotation.** `haproxy.org/whitelist` still works but has been renamed to `haproxy.org/allow-list` in current versions. Updated the example annotation and its comment.

## Review Notes

- The `node-role.kubernetes.io/worker: ""` nodeSelector assumes the user has manually labeled their worker nodes; Talos worker nodes do not carry this label out of the box. Left as-is since it is a common convention, but readers may need to label nodes (`kubectl label node <name> node-role.kubernetes.io/worker=`) for the selector to actually match.
- The Helm-installed service is named `haproxy-ingress-kubernetes-ingress` only when no `fullnameOverride` is set. The body of the post otherwise references the service generically (`kubectl get svc -n haproxy-ingress`), which is fine.
- The TCP services ConfigMap and the newer TCP Custom Resources are mutually exclusive on the same address/port — worth keeping in mind if combining approaches in the future.
- All other listed `haproxy.org/` annotations (`check`, `check-interval`, `rate-limit-requests`, `rate-limit-period`, `timeout-server`, `timeout-client`, `timeout-connect`, `load-balance`, `ssl-redirect`) are valid and current.
- `talosctl apply-config --nodes <NODE_IP> --file machine-config.yaml` and the two sysctls (`net.core.somaxconn`, `net.ipv4.ip_local_port_range`) are valid.
