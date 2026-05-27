# Validation Summary: How to Set Up an Istio Ingress Gateway with TLS Termination on GKE

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Google Kubernetes Engine (GKE)
- Cloud Service Mesh / Istio
- Istio Gateway and VirtualService APIs
- Kubernetes Services, Deployments, Secrets, RBAC, and IngressClass
- TLS termination and mutual TLS
- cert-manager and ACME HTTP-01 challenges
- EnvoyFilter and Envoy Lua HTTP filters
- kubectl and curl

## Sources Consulted
- Istio: Installing Gateways - https://istio.io/latest/docs/setup/additional-setup/gateway/
- Google Cloud Service Mesh: Installing and upgrading gateways with Istio APIs - https://docs.cloud.google.com/service-mesh/docs/operate-and-maintain/gateways
- Istio: Secure Gateways - https://istio.io/latest/docs/tasks/traffic-management/ingress/secure-ingress/
- Istio: Gateway reference - https://istio.io/latest/docs/reference/config/networking/gateway/
- Istio: cert-manager integration - https://istio.io/latest/docs/ops/integrations/certmanager/
- Istio: Kubernetes Ingress - https://istio.io/latest/docs/tasks/traffic-management/ingress/kubernetes-ingress/
- Istio: Understanding TLS Configuration - https://istio.io/latest/docs/ops/configuration/traffic-management/tls-configuration/
- Istio: EnvoyFilter reference - https://istio.io/latest/docs/reference/config/networking/envoy-filter/
- cert-manager: Installation with kubectl - https://cert-manager.io/docs/installation/kubectl/
- cert-manager: Supported releases - https://cert-manager.io/docs/releases/
- cert-manager: ACME HTTP validation - https://cert-manager.io/docs/tutorials/acme/http-validation/
- Google Cloud: About LoadBalancer Services in GKE - https://docs.cloud.google.com/kubernetes-engine/docs/concepts/service-load-balancer

## Issues Found
- The gateway Deployment selected the gateway injection template but did not explicitly enable injection on the pod. Added `sidecar.istio.io/inject: "true"` to match Istio's documented Kubernetes YAML gateway deployment pattern.
- The custom `istio-ingressgateway` ServiceAccount did not have permission to read TLS secrets for SDS. Added a namespaced Role and RoleBinding granting `get`, `watch`, and `list` on Secrets to the gateway ServiceAccount.
- The post said Google-managed certificates could be used in the Kubernetes TLS Secret flow. Removed that mention because Istio `credentialName` expects Kubernetes Secret-backed credentials, while Google-managed certificates are not a direct drop-in for this Istio Gateway API example.
- The cert-manager install command used `v1.14.0`, which is no longer in cert-manager's supported release window. Updated it to the current documented manifest version, `v1.20.2`.
- The ACME HTTP-01 solver used the older `class` field. Updated it to `ingressClassName: istio`, which cert-manager documents as the recommended field for Ingress controllers other than ingress-gce.
- The cert-manager HTTP-01 example referenced an Istio ingress class but did not create the corresponding `IngressClass`. Added an `IngressClass` named `istio` with controller `istio.io/ingress-controller`, matching Istio's Kubernetes Ingress documentation.
- The mutual TLS Gateway example mixed `credentialName` with a file-path `caCertificates` value. Replaced it with Istio's documented secret-based pattern: create a generic Secret containing `tls.key`, `tls.crt`, and `ca.crt`, then reference it with `credentialName`.

## Review Notes
The remaining Istio Gateway, VirtualService, Kubernetes Secret, GKE LoadBalancer Service, curl, and kubectl examples are consistent with official documentation. The EnvoyFilter example uses the low-level EnvoyFilter API, which Istio documents as upgrade-sensitive; it is technically valid, but production users should re-test EnvoyFilter patches during Istio upgrades.
