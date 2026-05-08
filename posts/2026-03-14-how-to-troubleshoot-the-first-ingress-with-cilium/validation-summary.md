# Validation Summary: Troubleshooting Your First Ingress with Cilium

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- Cilium Ingress Controller
- Kubernetes Ingress
- Kubernetes Services
- Kubernetes TLS Secrets
- Envoy proxy
- Helm
- kubectl
- curl

## Sources Consulted
- Cilium Kubernetes Ingress Support: https://docs.cilium.io/en/stable/network/servicemesh/ingress/
- Cilium Helm Reference: https://docs.cilium.io/en/stable/helm-reference/
- Cilium Troubleshooting, Connectivity Troubleshooting: https://docs.cilium.io/en/stable/operations/troubleshooting/
- Cilium Envoy documentation: https://docs.cilium.io/en/stable/security/network/proxy/envoy/
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- Kubernetes kubectl create secret tls reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_tls/

## Issues Found
- The prerequisites omitted Cilium's kube-proxy replacement and L7 proxy requirements for Ingress. Added those prerequisites based on the Cilium Ingress documentation.
- The post described the common Envoy problem as the proxy not being enabled. Updated this to "not running correctly" because enabling the Cilium Ingress controller automatically enables the required Envoy config, while runtime or deployment-mode issues can still break traffic.
- The post used `cilium status | grep -i ingress` to check whether Ingress was enabled. Replaced it with checks for the Cilium config map's `enable-ingress-controller` value and the `cilium` IngressClass.
- The Helm upgrade examples did not restart the Cilium operator and Cilium DaemonSet after changing Ingress-related values. Added the rollout restart commands used in the official Cilium Ingress installation instructions.
- The Envoy pod check assumed the standalone `cilium-envoy` DaemonSet is always present. Updated the command to check regular Cilium pods and then check `cilium-envoy` only when that standalone mode is enabled.
- The routing test only read `.status.loadBalancer.ingress[0].ip`, which fails for load balancers that publish a hostname. Updated it to read either IP or hostname.
- The "Check Envoy listeners" command used `cilium bpf lb list`, which checks BPF load-balancer state rather than Envoy listener or proxy health. Replaced it with `cilium-dbg status` proxy status and Cilium agent log checks for Ingress proxy programming messages.
- The TLS verification only tested HTTP and would not validate SNI/TLS termination. Added an HTTPS `curl --connect-to` check so the request connects to the Ingress address while still using `test.example.com` for SNI and certificate validation context.

## Review Notes
- The examples assume the Ingress, backend Service, and TLS Secret are in the same namespace. That matches Kubernetes Ingress TLS behavior; users should add `-n <namespace>` consistently if they deploy outside `default`.
- The post uses shared load-balancer mode, so the `cilium-ingress` Service name is accurate for the shared Cilium Ingress service.
