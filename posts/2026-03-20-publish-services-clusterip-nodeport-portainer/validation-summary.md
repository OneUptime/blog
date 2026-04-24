# Validation Summary: How to Publish Services (ClusterIP, NodePort, LoadBalancer) in Portainer (2)

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Kubernetes Services
- Kubernetes Ingress
- `kubectl`
- Kubernetes DNS / service discovery

## Sources Consulted
- Portainer Documentation, "Add a new application using a form": https://docs.portainer.io/sts/user/kubernetes/applications/add
- Portainer Documentation, "Services": https://docs.portainer.io/2.27/user/kubernetes/networking/services
- Kubernetes Documentation, "Service": https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes Documentation, "Ingress": https://kubernetes.io/docs/concepts/services-networking/ingress/
- Kubernetes Documentation, "kubectl expose": https://kubernetes.io/docs/reference/kubectl/generated/kubectl_expose/
- Kubernetes Documentation, "DNS for Services and Pods": https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/

## Issues Found
- The Portainer UI steps referred to a generic "Publishing" or "Network ports" section. I updated this to Portainer's documented **Publishing the application** section and clarified that this flow applies to form-based applications.
- The `nodePort` comment said the value "must" be in `30000-32767`. I updated it to reflect Kubernetes' actual behavior: the node port must be within the cluster's configured node port range, with `30000-32767` as the default.
- The AWS LoadBalancer annotation comment referred to an "internal ALB". I corrected this to "internal load balancer" because the Kubernetes Service annotation shown does not specifically imply ALB.
- The ClusterIP access example assumed `cluster.local` unconditionally. I clarified that this example uses the default cluster DNS domain.
- The Ingress backend comment incorrectly said the backend must point to a `ClusterIP` service. I corrected it to require an existing Service, which matches the Kubernetes Ingress documentation.
- The conclusion overstated Portainer support as covering all standard Kubernetes service types. I corrected it to describe Portainer's form-based publishing options as covering `ClusterIP`, `NodePort`, and `LoadBalancer`.

## Review Notes
- The Kubernetes Service manifests and `kubectl expose` examples are otherwise technically correct and use current API versions and CLI flags.
- The headless Service example is technically correct as a YAML fragment, though it is not a complete standalone manifest.
- The Ingress example remains valid, but Kubernetes notes that the Ingress API is frozen and recommends Gateway API for new feature development.
