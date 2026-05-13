# Validation Summary: How to Validate Kubernetes Services with Calico in a Lab Cluster

## Status
validated

## Post Type
Tutorial / validation guide

## Technologies Covered
- Kubernetes Services
- Kubernetes DNS
- Kubernetes NetworkPolicy
- Calico network policy enforcement
- kube-proxy
- Calico eBPF service handling
- kubectl

## Sources Consulted
- Kubernetes Services documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes kubectl expose reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_expose/
- Kubernetes command and args documentation: https://kubernetes.io/docs/tasks/inject-data-application/define-command-argument-container/
- Kubernetes Downward API environment variable documentation: https://kubernetes.io/docs/tasks/inject-data-application/environment-variable-expose-pod-information/
- Calico network policy overview: https://docs.tigera.io/calico/latest/about/kubernetes-training/about-network-policy
- Calico Kubernetes policy tutorial: https://docs.tigera.io/calico/latest/network-policy/get-started/kubernetes-policy/kubernetes-policy-basic
- Calico Kubernetes services training: https://docs.tigera.io/calico-cloud/tutorials/training/about-kubernetes-services

## Issues Found
- The backend Deployment used `args: ["-text=hello-from-$(hostname)"]`. Kubernetes does not run `args` through a shell, and `$(hostname)` is not a Kubernetes environment variable, so the response would remain literal instead of showing a backend pod name. Changed it to use a `POD_NAME` environment variable populated from `metadata.name` through the Downward API, then referenced it as `$(POD_NAME)`.
- The NodePort example selected `.status.addresses[0].address`, but Kubernetes does not guarantee that the first address is an InternalIP. Changed the JSONPath to select the node `InternalIP` address explicitly.
- The headless service command used `--clusterIP=None`, but the current `kubectl expose` flag is `--cluster-ip`. Changed it to `--cluster-ip=None`.
- The best-practices section recommended `kubectl get endpoints`, but the Endpoints API is deprecated in Kubernetes v1.33 and EndpointSlice is the current API. Changed the recommendation to `kubectl get endpointslices -l kubernetes.io/service-name=backend-svc`.

## Review Notes
The NetworkPolicy examples use the Kubernetes `networking.k8s.io/v1` API and are consistent with Calico's documented Kubernetes NetworkPolicy support. The allow rule correctly permits the backend pod's target port, `5678`, rather than the Service port, `80`.
