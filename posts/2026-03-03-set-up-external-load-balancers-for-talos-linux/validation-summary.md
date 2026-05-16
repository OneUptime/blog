# Validation Summary: How to Set Up External Load Balancers for Talos Linux

## Status
validated

## Post Type
Tutorial / infrastructure configuration guide

## Technologies Covered
- Talos Linux
- Kubernetes API server and Node objects
- HAProxy
- Nginx
- keepalived / VRRP
- kubectl
- Bash

## Sources Consulted
- Talos machine configuration reference: https://www.talos.dev/latest/reference/configuration/v1alpha1/config/
- Talos node labels and taints documentation: https://docs.siderolabs.com/kubernetes-guides/advanced-guides/node-labels
- Talos workers on control plane / external load balancer exclusion label documentation: https://docs.siderolabs.com/talos/v1.10/deploy-and-manage-workloads/workers-on-controlplane
- Kubernetes Nodes documentation: https://kubernetes.io/docs/concepts/architecture/nodes/
- Kubernetes well-known labels documentation: https://kubernetes.io/docs/reference/labels-annotations-taints/
- kubectl get command reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- HAProxy configuration manual: https://docs.haproxy.org/3.2/configuration.html
- HAProxy health checks documentation: https://www.haproxy.com/documentation/haproxy-configuration-tutorials/reliability/health-checks/
- Nginx stream upstream module documentation: https://nginx.org/en/docs/stream/ngx_stream_upstream_module.html
- Nginx stream proxy module documentation: https://nginx.org/en/docs/stream/ngx_stream_proxy_module.html
- Nginx HTTP upstream module documentation: https://nginx.org/en/docs/http/ngx_http_upstream_module.html
- Nginx HTTP proxy module documentation: https://nginx.org/en/docs/http/ngx_http_proxy_module.html
- keepalived configuration man page: https://www.keepalived.org/manpage.html

## Issues Found
- The backup keepalived configuration referenced `check_haproxy` in `track_script` but did not define the `vrrp_script` in the backup node's config. Added the same `vrrp_script check_haproxy` block to the backup example so the snippet is self-contained and valid.
- The dynamic backend discovery script selected `node-role.kubernetes.io/worker`, but Kubernetes role labels are optional and Talos documents that role labels such as `node-role.kubernetes.io/worker` must be applied by a cluster-admin account. Changed the selector to exclude nodes with Talos' default `node.kubernetes.io/exclude-from-external-load-balancers` label, which is more appropriate for Talos workload load-balancer backends.
- The dynamic backend discovery script built newline-separated HAProxy server lines using a literal `\n` inside a shell string and passed the result through `sed` replacement. Replaced this with `printf -v` newline accumulation and an `awk` substitution so the generated HAProxy backend block is written as separate lines.

## Review Notes
- The HAProxy and Nginx examples are syntactically consistent with current upstream documentation for TCP/HTTP upstreams, health checks, and proxying. The Nginx `stream` example assumes the stream module is installed/enabled by the distribution package.
- The application traffic examples use example NodePort and ingress ports. Operators still need to align ports, certificates, and health-check paths with their actual Services or ingress controller.
