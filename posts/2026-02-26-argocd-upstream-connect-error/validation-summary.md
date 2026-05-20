# Validation Summary: How to Fix 'upstream connect error' When Accessing ArgoCD UI

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Argo CD
- Kubernetes
- Kubernetes Ingress
- ingress-nginx
- Istio and Envoy
- Kubernetes NetworkPolicy

## Sources Consulted
- Argo CD ingress documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/ingress/
- Argo CD command parameter ConfigMap example: https://argo-cd.readthedocs.io/en/stable/operator-manual/argocd-cmd-params-cm-yaml/
- Argo CD official install manifest: https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
- ingress-nginx annotation documentation: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/
- Istio sidecar injection documentation: https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- kubectl port-forward reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_port-forward
- kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/

## Issues Found
- The resource limit example was a partial Deployment manifest that would not apply as a valid `apps/v1` Deployment because required fields such as selectors and container images were omitted. Replaced it with a concrete `kubectl patch deployment` command.
- The `server.insecure` example used a minimal ConfigMap manifest that could overwrite unrelated existing command parameters if applied directly. Replaced it with a targeted `kubectl patch configmap` command and added a rollout restart because Argo CD command parameter changes require restarting the server.
- The Argo CD service port description implied port 80 is only for insecure mode and port 443 is only HTTPS. Updated it to match Argo CD documentation: port 80 is HTTP and redirects to HTTPS by default, while port 443 is gRPC/HTTPS.
- The Istio sidecar disable example used the deprecated annotation form and was also a partial Deployment manifest. Replaced it with a `kubectl patch deployment` command that sets the current `sidecar.istio.io/inject: "false"` pod template label.
- The direct health check example tried to run `curl` inside the Argo CD server container, which is not guaranteed to include curl. Replaced it with a temporary `curlimages/curl` pod.
- The proxy buffer section described large responses as causing the specific upstream connect/reset-before-headers error. Narrowed the claim to large upstream headers and Nginx buffer errors, which matches ingress-nginx behavior more accurately.
- The systematic debugging commands used HTTP service port 80 as the default direct-access path. Updated the default path to port-forward service port 443 with HTTPS, with a separate port 80 HTTP variant for `server.insecure: "true"`.

## Review Notes
The remaining examples are intentionally generic and assume the common `argocd` and `ingress-nginx` namespaces. The NetworkPolicy example uses pod port 8080, which matches the Argo CD server service target port in the official install manifest.
