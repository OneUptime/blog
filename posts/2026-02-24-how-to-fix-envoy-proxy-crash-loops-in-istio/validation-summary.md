# Validation Summary: How to Fix Envoy Proxy Crash Loops in Istio

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Istio sidecar injection and control plane
- Envoy sidecar proxy
- Kubernetes pods, logs, resource limits, events, and config maps
- IstioOperator configuration
- Istio certificates and SDS

## Sources Consulted
- Istio Resource Annotations: https://istio.io/latest/docs/reference/config/annotations/
- Istio Installing the Sidecar: https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/
- Istio Application Requirements, ports used by Istio: https://istio.io/latest/docs/ops/deployment/application-requirements/
- Istio Debugging Envoy and Istiod: https://istio.io/latest/docs/ops/diagnostic-tools/proxy-cmd/
- Istio Plug in CA Certificates: https://istio.io/latest/docs/tasks/security/cert-management/plugin-ca-cert/
- Istio Managing In-Mesh Certificates: https://istio.io/latest/docs/ops/configuration/traffic-management/manage-mesh-certificates/
- Istio Supported Releases: https://istio.io/latest/docs/releases/supported-releases/
- Kubernetes kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes kubectl command reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands

## Issues Found
- The opening paragraph said a crashing sidecar takes the entire pod down. Updated it to say the pod can become unavailable while the application container may still be running, which matches Kubernetes multi-container pod behavior more closely.
- The istiod connectivity test used BusyBox `wget` against `/debug/endpointz`. Replaced it with `curlimages/curl` and `curl` against `/version`, matching Istio's documented connectivity check pattern for istiod on port 15014.
- The certificate checks referenced the old/non-default `istio-ca-secret`. Updated the default trust bundle check to use the `istio-ca-root-cert` config map in the workload namespace and added `cacerts` checks for plugged-in CA deployments.
- The port-conflict workaround showed excluding Istio's reserved port `15000` from interception. Clarified that reserved-port conflicts should be fixed by changing the application port, and changed the exclusion example to a non-reserved application port.
- The temporary injection-disable patch used the deprecated `sidecar.istio.io/inject` annotation. Updated it to use the documented pod-template label.
- The diagnostic checklist used `kubectl get envoyfilters -n production -n istio-system`, where the second namespace flag overrides the first. Replaced it with `kubectl get envoyfilters --all-namespaces`.

## Review Notes
The remaining commands and snippets are broadly correct for current Istio and Kubernetes usage. Some troubleshooting guidance is intentionally general because exact symptoms vary by Istio version, install profile, and whether a custom CA or revision-based upgrade flow is in use.
