# Validation Summary: How to Troubleshoot Flux CD Network Connectivity Issues

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Flux CD
- Kubernetes
- kubectl
- CoreDNS
- Kubernetes NetworkPolicy
- HTTP/S proxy configuration
- TLS certificate configuration

## Sources Consulted
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux HelmRepository documentation: https://fluxcd.io/flux/components/source/helmrepositories/
- Flux proxy settings documentation: https://fluxcd.io/flux/installation/configuration/proxy-setting/
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes DNS debugging documentation: https://kubernetes.io/docs/tasks/administer-cluster/dns-debugging-resolution/
- Kubernetes API health endpoint documentation: https://kubernetes.io/docs/reference/using-api/health-checks/
- kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- CoreDNS forward plugin documentation: https://coredns.io/plugins/forward/
- Flux install manifest for current controller services and probes: https://github.com/fluxcd/flux2/releases/latest/download/install.yaml

## Issues Found
- The CoreDNS private-zone example used an AKS-style `coredns-custom` ConfigMap, which is not the generic Kubernetes CoreDNS configuration path. Changed it to edit the standard `coredns` ConfigMap and `Corefile`.
- The proxy examples omitted `.cluster.local.` with the trailing dot from `NO_PROXY`. Added it because Flux documentation calls out that value for controller-to-controller communication.
- The GitRepository custom CA example used `certSecretRef`, but Flux GitRepository expects HTTPS CA data such as `ca.crt` in the Secret referenced by `spec.secretRef`. Updated the GitRepository example and summary text accordingly.
- The source-controller service test used `/healthz` through the `source-controller` Service. Current Flux manifests expose the artifact HTTP service on port 80 with readiness at `/`, while `/healthz` is on the controller health port. Changed the test to request the service root.
- The Kubernetes API reachability check used `/healthz`, which Kubernetes documents as deprecated since v1.16. Changed the command to use `/readyz`.
- The Kubernetes API reachability check used `kubectl exec` into the source-controller Deployment and assumed a `wget` binary in the controller container. Replaced it with a `curlimages/curl` test pod in the `flux-system` namespace.

## Review Notes
The post is technically relevant and mostly sound after the corrections. Some diagnostic commands depend on the exact tool set in the chosen container images and on the cluster's CNI, DNS, and managed Kubernetes provider behavior.
