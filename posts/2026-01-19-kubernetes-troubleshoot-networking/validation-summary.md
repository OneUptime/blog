# Validation Summary: How to Troubleshoot Kubernetes Networking Issues

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Kubernetes networking
- Kubernetes Services and EndpointSlices
- CoreDNS and Kubernetes DNS
- CNI plugins
- kube-proxy
- Ingress and ingress-nginx
- NetworkPolicy
- LoadBalancer and NodePort Services
- tcpdump, dig, nslookup, curl, nc, iptables, IPVS

## Sources Consulted
- Kubernetes DNS debugging documentation: https://kubernetes.io/docs/tasks/administer-cluster/dns-debugging-resolution/
- Kubernetes DNS for Services and Pods documentation: https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes EndpointSlice documentation: https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/
- Kubernetes Endpoints API reference: https://kubernetes.io/docs/reference/kubernetes-api/core/endpoints-v1/
- Kubernetes NetworkPolicy API reference: https://kubernetes.io/docs/reference/kubernetes-api/networking/network-policy-v1/
- Kubernetes kubectl reference: https://kubernetes.io/docs/reference/kubectl/
- kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- kubectl cp reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_cp/
- ingress-nginx rewrite documentation: https://kubernetes.github.io/ingress-nginx/examples/rewrite/
- ingress-nginx path matching documentation: https://kubernetes.github.io/ingress-nginx/user-guide/ingress-path-matching/

## Issues Found
- The DNS troubleshooting pod used the older `gcr.io/kubernetes-e2e-test-images/dnsutils:1.3` image. Updated it to the current Kubernetes documentation example, `registry.k8s.io/e2e-test-images/agnhost:2.39`, with `imagePullPolicy: IfNotPresent` and `restartPolicy: Always`.
- The service debugging examples used the deprecated Endpoints API via `kubectl get endpoints`. Replaced those checks with `kubectl get endpointslices -l kubernetes.io/service-name=...`, since the Endpoints API is deprecated in Kubernetes v1.33+ and EndpointSlice is the current API.
- The ingress-nginx regex rewrite example used a regex path and `$2` rewrite target without enabling regex path matching. Added `nginx.ingress.kubernetes.io/use-regex: "true"` to match ingress-nginx documentation.
- A NetworkPolicy comment said the `namespaceSelector` rule allowed traffic from the same namespace. Corrected the comment to state that it allows traffic from namespaces labeled `name=production`, matching Kubernetes NetworkPolicy selector semantics.

## Review Notes
The remaining commands and manifests are broadly accurate as troubleshooting examples, but several CNI and ingress controller label selectors are installation-specific and may need adjustment for a particular cluster. `kubectl cp` also depends on `tar` being available in the container image, which is documented by Kubernetes and may be worth calling out in a future revision.
