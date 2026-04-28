# Validation Summary: How to Set Up Nginx Ingress Controller with a MetalLB IPv4 Address

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Nginx Ingress Controller (ingress-nginx)
- MetalLB
- Kubernetes
- kubectl
- IPv4 networking / LoadBalancer services
- Ingress API (networking.k8s.io/v1)

## Sources Consulted
- ingress-nginx release controller-v1.10.0 (https://github.com/kubernetes/ingress-nginx/releases/tag/controller-v1.10.0)
- ingress-nginx bare-metal deploy.yaml (https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.10.0/deploy/static/provider/baremetal/deploy.yaml)
- MetalLB CRD documentation (IPAddressPool, L2Advertisement) — https://metallb.universe.tf/configuration/
- Kubernetes Ingress API reference — https://kubernetes.io/docs/concepts/services-networking/ingress/
- kubectl patch reference — https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#patch
- google-samples/hello-app image documentation (listens on port 8080)

## Issues Found
No technical issues found.

- The release tag `controller-v1.10.0` exists (published 2024-02-29) and the bare-metal manifest URL resolves correctly.
- The bare-metal manifest does indeed default to a `NodePort` service, so the patch to `LoadBalancer` is appropriate for MetalLB.
- The deployment selector `app.kubernetes.io/component=controller` matches the labels on the controller deployment in v1.10.0.
- The MetalLB CRDs `IPAddressPool` and `L2Advertisement` live in the `metallb-system` namespace; `kubectl get ipaddresspool`/`kubectl get l2advertisement` accept singular forms.
- The strategic merge patch JSON for switching service type is well-formed.
- The `gcr.io/google-samples/hello-app:1.0` image listens on port 8080, matching the `containerPort` and `targetPort`.
- The `Ingress` resource uses the modern `networking.k8s.io/v1` API with `ingressClassName: nginx`, which the bare-metal manifest registers as the default IngressClass.

## Review Notes
- ingress-nginx v1.10.0 is from early 2024; newer minor versions (v1.11.x, v1.12.x) are available. Pinning to v1.10.0 is fine for reproducibility but readers running newer Kubernetes versions may want a newer controller release for compatibility (the project documents a Kubernetes/ingress-nginx compatibility matrix).
- The post does not configure TLS despite the description mentioning HTTPS routing. Adding a `tls:` block with a cert-manager-issued or self-signed certificate would round out the HTTPS portion, but this is an enhancement rather than a correctness issue.
- For production use, MetalLB's L2 mode has known failover limitations under node failure; BGP mode is generally recommended where the network supports it. Out of scope for this tutorial.
