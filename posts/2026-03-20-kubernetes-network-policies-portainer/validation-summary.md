# Validation Summary: How to Manage Kubernetes Network Policies with Portainer

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes
- Portainer
- Kubernetes NetworkPolicy API
- kubectl
- CNI network policy providers

## Sources Consulted
- Kubernetes Network Policies: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes Namespaces: https://kubernetes.io/docs/concepts/overview/working-with-objects/namespaces/
- Kubernetes Service: https://kubernetes.io/docs/concepts/services-networking/service/
- kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Declare Network Policy: https://kubernetes.io/docs/tasks/administer-cluster/declare-network-policy/
- Portainer Add a new application using code: https://docs.portainer.io/user/kubernetes/applications/manifest
- Portainer Create an application from a Manifest: https://docs.portainer.io/user/kubernetes/applications/manifest/create
- Portainer kubectl shell: https://docs.portainer.io/user/kubernetes/kubectl
- Portainer Networking: https://docs.portainer.io/user/kubernetes/networking
- Portainer Kubernetes roles and bindings: https://docs.portainer.io/advanced/kubernetes-roles-and-bindings

## Issues Found
- The post directed readers to `Cluster > Networking > Network Policies`, but current Portainer documentation does not expose a dedicated Network Policies screen. I changed the workflow to the documented `Applications > Create from code > Manifest` path.
- The `namespaceSelector.matchLabels.name: frontend` example would not work on a default cluster unless the namespace was manually labeled. I changed it to the built-in immutable namespace label `kubernetes.io/metadata.name: frontend`.
- The DNS egress section said the rule allowed egress "to the kube-dns service", but the manifest only allowed traffic on port 53 and did not target a specific Service. I corrected the wording to describe DNS egress accurately.
- The verification example used a short Service name from another namespace and omitted the source namespace on `kubectl exec`. I updated it to `kubectl exec -it frontend-pod -n frontend -- curl http://backend-service.production.svc:8080`.
- The monitoring section claimed Portainer has a visual Network Policies view under Networking. I replaced this with the documented Portainer `kubectl shell` guidance.
- The RBAC best-practice bullet implied Portainer RBAC is generally available. I clarified that Portainer RBAC features apply to Business Edition.

## Review Notes
- The post is a code-based tutorial and remains technically relevant after correction.
- The manifests use the stable `networking.k8s.io/v1` API and are syntactically correct after the namespace selector fix.
- The default-deny plus additive allow-policy model described in the post matches Kubernetes NetworkPolicy behavior.
- DNS policy details can vary slightly by cluster DNS implementation, but allowing egress on TCP and UDP port 53 is a valid generic example for workloads under a default-deny egress policy.
