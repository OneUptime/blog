# Validation Summary: How to Create Runbook for Istio Incident Response

## Status
validated

## Post Type
Guide

## Technologies Covered
- Istio service mesh
- Kubernetes
- kubectl
- istioctl
- Envoy proxy diagnostics
- Istio PeerAuthentication and DestinationRule resources

## Sources Consulted
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio pilot-discovery metrics reference: https://istio.io/latest/docs/reference/commands/pilot-discovery/
- Istio application requirements and ports: https://istio.io/latest/docs/ops/deployment/application-requirements/
- Istio gateway installation guide: https://istio.io/latest/docs/setup/additional-setup/gateway/
- Istio sidecar traffic capture limitations: https://istio.io/latest/docs/ops/best-practices/security/
- Istio CNI and sidecar traffic redirection: https://istio.io/latest/docs/setup/additional-setup/cni/
- Istio plug in CA certificates task: https://istio.io/latest/docs/tasks/security/cert-management/plugin-ca-cert/
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes kubectl rollout restart reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_restart/
- Kubernetes field selectors documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/
- Kubernetes kubectl top reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_top/

## Issues Found
- The post described `kubectl exec` into the application container as a way to bypass the sidecar. In a normal Istio sidecar deployment, pod network traffic is captured by iptables or Istio CNI at the pod network namespace level, so traffic from the application container still goes through the sidecar. Replaced this with a temporary non-injected curl pod using `kubectl run --annotations=sidecar.istio.io/inject=false`.
- The pod count command used `status.phase!=Running` but described it as counting pods not in Ready state. Updated the comment to say it counts pods not in the Running phase.
- The root certificate check referenced `istio-ca-secret`, which is not the current default Istio CA secret. Updated it to check the namespace `istio-ca-root-cert` ConfigMap and the `cacerts` secret only for plugged-in CA deployments.
- The mitigation for expired certificates said restarting `istiod` would trigger reissuance. Workload certificate recovery generally requires confirming the CA is healthy and restarting affected workloads if certificates are expired, so the mitigation was corrected.
- Gateway diagnostics used ambiguous resource names and older/common labels. Updated Gateway and VirtualService lookups to fully qualified Istio resource names, updated gateway pod selectors to `istio=ingressgateway`, and used `deployment/istio-ingressgateway` for `istioctl proxy-config`.
- The `istiod` metrics commands assumed `curl` was available inside the `istiod` container. Replaced them with port-forwarding to port 15014 and local `curl` commands.

## Review Notes
The post is now technically valid as a general Istio incident response runbook. Some commands still require environment-specific substitutions, such as namespaces, pod names, service names, and whether the ingress gateway is installed in `istio-system` or a separate gateway namespace.
