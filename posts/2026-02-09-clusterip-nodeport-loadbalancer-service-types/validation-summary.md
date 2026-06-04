# Validation Summary: How to Configure ClusterIP, NodePort, and LoadBalancer Service Type Selection

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Services
- ClusterIP
- NodePort
- LoadBalancer
- Kubernetes Ingress
- kubectl
- Kubernetes YAML manifests

## Sources Consulted
- Kubernetes Services documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes Service API reference: https://kubernetes.io/docs/reference/kubernetes-api/core/service-v1/
- Kubernetes DNS for Services and Pods documentation: https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/
- Kubernetes external load balancer task documentation: https://kubernetes.io/docs/tasks/access-application-cluster/create-external-load-balancer/
- kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- kubectl create reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/
- kubectl apply reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/
- Google Kubernetes Engine LoadBalancer Service documentation: https://docs.cloud.google.com/kubernetes-engine/docs/concepts/service-load-balancer
- Amazon EKS Network Load Balancer annotation documentation: https://docs.aws.amazon.com/eks/latest/userguide/auto-configure-nlb.html
- Azure Kubernetes Service internal load balancer documentation: https://learn.microsoft.com/azure/aks/internal-lb

## Issues Found
- The introduction described ClusterIP, NodePort, and LoadBalancer as the three main Kubernetes service types. Kubernetes also supports other service patterns such as ExternalName and headless services, so this was changed to "three commonly used service types."
- The post stated that every Kubernetes service provides a stable IP address and DNS name. This is not true for all Service forms, such as ExternalName and headless Services, so this was changed to "Most Kubernetes services."
- The LoadBalancer explanation said traffic is distributed across all nodes and that LoadBalancer always includes NodePort. Kubernetes LoadBalancer Services allocate NodePorts by default, but NodePort allocation can be disabled for implementations that route directly to pods. The wording was updated to include that caveat.
- The `production` namespace was used in manifests but not created before applying them. Added an idempotent namespace creation command using `kubectl create namespace --dry-run=client -o yaml | kubectl apply -f -`.
- The interactive test pod command passed `sh` as an argument rather than as the container command. Updated it to use `--restart=Never --command -- sh`, matching current `kubectl run` behavior.
- The NodePort forwarding explanation said traffic is forwarded to the Service ClusterIP. Kubernetes forwards NodePort traffic to ready endpoints behind the Service, so the explanation was corrected.
- The NodePort limitation section implied every request always adds a cross-node forwarding hop. This is true for the default `externalTrafficPolicy: Cluster` path when the selected backend is on another node, but `externalTrafficPolicy: Local` changes that behavior. The wording was narrowed to the default policy.
- The LoadBalancer example mixed AWS, GCP, and Azure provider-specific annotations in one manifest. Provider annotations should be selected for the target cloud provider and load balancer implementation, so the mixed annotation block was removed from the generic example.
- The health check section did not mention that `healthCheckNodePort` applies to LoadBalancer Services with `externalTrafficPolicy: Local`. The wording was updated.
- Several `kubectl get svc` and `kubectl patch svc` commands omitted `-n production` even though the Services are defined in the `production` namespace. The commands were updated to include the namespace.

## Review Notes
Local `kubectl` was not installed in the review environment, so CLI behavior was verified against official Kubernetes command reference documentation rather than by executing commands against a cluster.
