# Validation Summary: How to Validate Istio Backup and Recovery for Production

## Status
validated

## Post Type
Guide

## Technologies Covered
- Istio
- Kubernetes
- kubectl
- istioctl
- Kubernetes CronJob
- Kubernetes RBAC
- yq
- TLS certificates and Kubernetes Secrets

## Sources Consulted
- Istio Traffic Management API reference: https://istio.io/latest/docs/reference/config/networking/
- Istio Security API reference: https://istio.io/latest/docs/reference/config/security/
- Istio Telemetry API reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio Proxy Extensions API reference: https://istio.io/latest/docs/reference/config/proxy_extensions/
- Istio Plug in CA Certificates task: https://istio.io/latest/docs/tasks/security/cert-management/plugin-ca-cert/
- Istio Secure Gateways task: https://istio.io/latest/docs/tasks/traffic-management/ingress/secure-ingress/
- Kubernetes kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes kubectl apply reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/
- Kubernetes CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Kubernetes kubectl create secret generic reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_generic/

## Issues Found
- Short Istio resource names such as `gateway` can be ambiguous on clusters that also use the Kubernetes Gateway API. Updated commands and scripts to use fully qualified Istio resource names such as `gateways.networking.istio.io`.
- The "comprehensive" backup resource list missed current Istio configuration resources such as `ProxyConfig`, `WasmPlugin`, and `TrafficExtension`. Added them to the backup script.
- The completeness check counted `kind:` lines, which includes the top-level Kubernetes `List` object and can overcount by one. Changed the check to count `.items` with `yq`.
- The metadata cleanup omitted `status`, which can be present on exported Istio custom resources and should not be restored as desired state. Added status removal.
- The CA backup commands used `istio-ca-secret`, but current Istio documentation for plugged-in CA certificates uses the `cacerts` secret in `istio-system`. Updated the commands and verification JSONPath to use `cacerts`.
- The gateway TLS secret backup used an undocumented label selector. Replaced it with an explicit backup of a Gateway `credentialName` secret, matching Istio gateway TLS documentation.
- The RBAC example did not include the `extensions.istio.io` API group, which is needed for Istio proxy extension resources. Added it.
- The single-resource and namespace restore examples applied all objects or relied on labels that may not exist. Updated them to select the exact backed-up objects with `yq` before applying.
- The complete mesh reconstruction sequence restored CA certificates after installation. Updated the order so plugged-in CA certificates are restored before `istioctl install`, matching Istio's documented CA setup flow.
- Optional Istio CRDs vary by Istio version. Updated backup examples to remove empty files when a resource type is not present so restore loops do not try to apply empty manifests.

## Review Notes
- `kubectl` was not available in the local environment, so CLI behavior was checked against official Kubernetes command references rather than local `--help` output.
- The post does not pin an Istio version. The fixes target current Istio documentation as of 2026-05-21.
