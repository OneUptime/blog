# Validation Summary: Understanding the Demo Application in the Cilium Star Wars Demo

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cilium
- Kubernetes
- eBPF
- Kubernetes Services, Deployments, and Pods
- CiliumNetworkPolicy
- HTTP APIs
- kubectl

## Sources Consulted
- Cilium official documentation: Getting Started with the Star Wars Demo - https://docs.cilium.io/en/stable/gettingstarted/demo/
- Cilium upstream demo manifest: https://raw.githubusercontent.com/cilium/cilium/HEAD/examples/minikube/http-sw-app.yaml
- Cilium upstream L3/L4 policy manifest: https://raw.githubusercontent.com/cilium/cilium/HEAD/examples/minikube/sw_l3_l4_policy.yaml
- Cilium upstream L7 policy manifest: https://raw.githubusercontent.com/cilium/cilium/HEAD/examples/minikube/sw_l3_l4_l7_policy.yaml
- Kubernetes official kubectl create reference - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/
- Kubernetes official kubectl get reference - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes official kubectl describe reference - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_describe/
- Kubernetes official kubectl exec reference - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Local runtime check of the current upstream `quay.io/cilium/starwars` image referenced by the Cilium demo manifest.

## Issues Found
- The introduction described the demo as "four Kubernetes workloads." The current upstream manifest deploys three application components: a `deathstar` Service, a `deathstar` Deployment with two pod replicas, and standalone `tiefighter` and `xwing` Pods. Updated the wording to say three application components represented by four pods.
- The Deathstar API table and example used `GET /v1/health`, but the current upstream image returns 404 for that path. Updated the table and curl example to use `GET /v1`, which returns API metadata and is listed by the service itself.

## Review Notes
The post uses the `HEAD` branch URL for the Cilium example manifest. This is valid, but it means future upstream manifest changes could make the post's examples drift over time. Pinning to a Cilium release branch would make the walkthrough more reproducible.
