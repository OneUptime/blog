# Validation Summary: How to Implement cert-manager CSI Driver for Mounting Certificates as Volumes

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Kubernetes
- cert-manager
- cert-manager CSI driver
- Helm
- TLS and mTLS certificates
- ACME / Let's Encrypt
- Python filesystem watching

## Sources Consulted
- cert-manager CSI driver documentation: https://cert-manager.io/docs/usage/csi-driver/
- cert-manager CSI driver installation documentation: https://cert-manager.io/docs/usage/csi-driver/installation/
- cert-manager CSI driver overview: https://cert-manager.io/docs/usage/csi/
- cert-manager Helm installation documentation: https://cert-manager.io/docs/installation/helm/
- Kubernetes DaemonSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/daemonset/
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- cert-manager CSI driver Helm chart templates: https://github.com/cert-manager/csi-driver/tree/master/deploy/charts/csi-driver

## Issues Found
- The per-pod certificate example used `csi.cert-manager.io/pod-uid`, which is not a supported cert-manager CSI driver volume attribute. Changed it to use `${POD_UID}` in `csi.cert-manager.io/uri-sans`, one of the documented variable-supporting attributes.
- The ACME section presented Let's Encrypt usage as a normal external certificate pattern. Official cert-manager CSI driver documentation warns that public CAs such as Let's Encrypt are not recommended for typical CSI driver workloads because each pod receives a certificate and public CAs enforce rate limits. Reworded the section to make that caveat explicit.
- The ACME note said validation happens during pod startup. Clarified that cert-manager must complete HTTP-01 or DNS-01 validation before the pod can start, and that solver configuration must already exist on the Issuer or ClusterIssuer.
- The performance and best-practices sections suggested scaling the CSI driver DaemonSet. The official documentation states the driver is intended to run as a single instance per node and will not work with multiple instances on a single node. Changed the guidance to tuning resources, limits, or node placement.

## Review Notes
- The legacy Jetstack Helm repository command remains usable, though current cert-manager documentation recommends OCI charts for recent versions because they are the source of truth and are published first.
- The post correctly describes CSI-mounted certificates as avoiding intermediate Secret resources and supporting per-pod certificate/key pairs, automatic renewal, and pod-lifetime cleanup.
