# Validation Summary: How to Test Network Policies with Calico on K3s

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- K3s
- Kubernetes NetworkPolicy
- Calico
- Calico GlobalNetworkPolicy
- kubectl
- calicoctl
- BusyBox
- NGINX container image

## Sources Consulted
- Kubernetes Network Policies documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes kubectl expose reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_expose/
- Calico GlobalNetworkPolicy resource documentation: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico K3s quickstart: https://docs.tigera.io/calico/latest/getting-started/kubernetes/k3s/quickstart
- NGINX Docker deployment documentation: https://docs.nginx.com/nginx/admin-guide/installing-nginx/installing-nginx-docker/
- BusyBox command reference for wget: https://busybox.net/BusyBox.html

## Issues Found
- The tutorial created and exposed the `nginx` pod on port 8080, but the standard NGINX container listens on port 80 by default. Updated the `kubectl run`, `kubectl expose`, connectivity test URLs, and NetworkPolicy port from 8080 to 80 so the service and policy match the container's actual listener.
- The BusyBox-based `sensor` pod used `wget --timeout=...`. BusyBox documents the portable timeout option as `-T SEC`; updated the timeout checks to use `wget -T 5` and `wget -T 3`.

## Review Notes
- The Kubernetes NetworkPolicy API version, `podSelector`, `namespaceSelector`, `policyTypes`, ingress rule, and egress rule structure are valid for `networking.k8s.io/v1`.
- The Calico `GlobalNetworkPolicy` example uses the current `projectcalico.org/v3` API shape, a valid `all()` selector, an egress `Deny` action, and `destination.nets`.
- Calico on K3s requires K3s to be installed with Flannel disabled and K3s network policy disabled before installing Calico, as noted in the official Calico K3s quickstart. The post lists Calico installation as a prerequisite, so no tutorial changes were needed.
