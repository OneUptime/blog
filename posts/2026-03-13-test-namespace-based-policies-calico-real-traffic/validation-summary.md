# Validation Summary: How to Test Namespace-Based Policies in Calico with Real Traffic

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico NetworkPolicy
- Kubernetes namespaces and namespace labels
- Kubernetes pods
- kubectl
- BusyBox wget
- nginx container image

## Sources Consulted
- Calico NetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico policy guide for namespaceSelector rules: https://docs.tigera.io/calico/latest/network-policy/get-started/calico-policy/calico-network-policy
- Calico automatic labels documentation: https://docs.tigera.io/calico/latest/network-policy/get-started/calico-policy/calico-labels
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes kubectl wait reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes kubectl label reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_label/
- Kubernetes namespaces documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/namespaces/
- NGINX Docker image documentation: https://docs.nginx.com/nginx/admin-guide/installing-nginx/installing-nginx-docker/

## Issues Found
- The original test setup read pod IPs immediately after creating pods. Added `kubectl wait --for=condition=Ready` calls so the IP and traffic tests run after the test pods are ready.
- The monitoring test probed `http://$PROD_IP:9090`, but the created server pod uses the default `nginx` image, which serves HTTP on port 80. Changed the probe and test matrix wording to test HTTP on port 80.
- The label mutation step said it removed the production label, but the command removed the staging label. It also re-tested a path that was already expected to be blocked, which did not validate dynamic selector changes. Updated the step to remove and restore the monitoring namespace label and verify the previously allowed monitoring path becomes blocked when the label no longer matches.

## Review Notes
- The post assumes the `production`, `staging`, and `monitoring` namespaces and their baseline labels/policies already exist, which is consistent with the prerequisites.
- Runtime validation against a live Kubernetes cluster with Calico was not performed in this workspace. Command syntax and policy semantics were checked against official documentation; BusyBox `wget` syntax was checked locally with the current `busybox` container image.
