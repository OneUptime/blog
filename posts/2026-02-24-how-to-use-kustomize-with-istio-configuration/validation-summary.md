# Validation Summary: How to Use Kustomize with Istio Configuration

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio VirtualService
- Istio DestinationRule
- Istio AuthorizationPolicy
- Istio PeerAuthentication
- Istio Gateway
- Kustomize
- kubectl
- istioctl
- Kubernetes YAML manifests
- GitOps workflows

## Sources Consulted
- Kubernetes documentation: Declarative Management of Kubernetes Objects Using Kustomize - https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/
- Kubernetes kubectl reference: kubectl kustomize - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_kustomize/
- Istio reference: VirtualService - https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio reference: DestinationRule - https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio reference: AuthorizationPolicy - https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio reference: PeerAuthentication - https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio reference: Gateway - https://istio.io/latest/docs/reference/config/networking/gateway/
- Istio command reference: istioctl analyze - https://istio.io/latest/docs/reference/commands/istioctl/#istioctl-analyze

## Issues Found
- The staging overlay said it removed outlier detection, but the shown YAML object patch only changed connection pool fields and would leave the base `outlierDetection` map in place. I changed the staging `DestinationRule` patch to a targeted JSON patch that explicitly replaces the connection limits and removes `/spec/trafficPolicy/outlierDetection`.
- The section titled "Using Strategic Merge Patches" showed JSON Patch operations (`op`, `path`, `value`) while describing strategic merge behavior. I replaced the example with a YAML object patch and moved the JSON Patch discussion to the following section.
- The post implied strategic merge behavior was the default safe patching mode for more complex Istio resources. I adjusted the wording to note that JSON patches are often safer for Istio custom resources when precise array or nested-field edits are required, matching Kubernetes Kustomize guidance that not all resources or fields support strategic merge patches.
- The validation script piped generated YAML to `istioctl analyze --use-kube=false -f -`, but the official `istioctl analyze` command accepts file or directory arguments rather than a `-f` flag. I changed the script to write the generated YAML to a temporary file and pass that file path to `istioctl analyze`.

## Review Notes
- The Istio API versions and fields used in the examples (`networking.istio.io/v1`, `security.istio.io/v1`, `timeout`, `retries`, `connectionPool`, `outlierDetection`, `principals`, `methods`, `paths`, `mtls.mode: STRICT`, and Gateway TLS `credentialName`) are current in the official Istio documentation.
- I could not run local `kubectl kustomize` or `istioctl analyze` verification because neither `kubectl` nor `istioctl` is installed in this environment.
