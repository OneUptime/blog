# Validation Summary: How to Expose the vCluster API Through Ingress with TLS and kubeconfig

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- vCluster 0.36 with containerized control planes on Shared Nodes or Private Nodes
- Kubernetes Ingress and IngressClass
- ingress-nginx TLS passthrough
- TLS certificates and Subject Alternative Names (SANs)
- Kubernetes kubeconfig files, client certificates, and service-account tokens
- vCluster CLI, kubectl, and OpenSSL

## Sources Consulted

- [vCluster 0.36: Access and expose vCluster](https://www.vcluster.com/docs/vcluster/manage/accessing-vcluster)
- [vCluster 0.36: Ingress control-plane configuration](https://www.vcluster.com/docs/vcluster/configure/vcluster-yaml/control-plane/deployment/ingress)
- [vCluster 0.36: Proxy configuration](https://www.vcluster.com/docs/vcluster/configure/vcluster-yaml/control-plane/components/proxy)
- [vCluster 0.36: Export kubeconfig](https://www.vcluster.com/docs/vcluster/configure/vcluster-yaml/export-kube-config)
- [vCluster 0.36: vcluster create CLI reference](https://www.vcluster.com/docs/vcluster/cli/vcluster_create)
- [vCluster 0.36: vcluster connect CLI reference](https://www.vcluster.com/docs/vcluster/cli/vcluster_connect)
- [vCluster v0.36.1 tagged configuration defaults](https://github.com/loft-sh/vcluster/blob/v0.36.1/chart/values.yaml)
- [vCluster v0.36.1 tagged values schema](https://github.com/loft-sh/vcluster/blob/v0.36.1/chart/values.schema.json)
- [vCluster v0.36.1 generated Ingress template](https://github.com/loft-sh/vcluster/blob/v0.36.1/chart/templates/ingress.yaml)
- [vCluster v0.36.1 certificate SAN generation](https://github.com/loft-sh/vcluster/blob/v0.36.1/pkg/server/cert/cert.go)
- [Kubernetes: Ingress classes](https://kubernetes.io/docs/concepts/services-networking/ingress/#ingress-class)
- [Kubernetes: Authentication](https://kubernetes.io/docs/reference/access-authn-authz/authentication/)
- [Kubernetes: Organizing cluster access using kubeconfig files](https://kubernetes.io/docs/concepts/configuration/organize-cluster-access-kubeconfig/)
- [kubectl config view reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_config/kubectl_config_view/)
- [kubectl get reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/)
- [Kubernetes: Ingress NGINX retirement](https://kubernetes.io/blog/2026/03/30/kubernetes-v1-36-sneak-peek/#ingress-nginx-retirement)
- [ingress-nginx: TLS/HTTPS and SSL passthrough](https://kubernetes.github.io/ingress-nginx/user-guide/tls/#ssl-passthrough)
- [ingress-nginx: SSL passthrough annotation](https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/#ssl-passthrough)
- [ingress-nginx: Controller command-line arguments](https://kubernetes.github.io/ingress-nginx/user-guide/cli-arguments/)
- [OpenSSL 3.6: s_client](https://docs.openssl.org/3.6/man1/openssl-s_client/)
- [OpenSSL 3.6: x509](https://docs.openssl.org/3.6/man1/openssl-x509/)

## Issues Found

- The post described `controlPlane.proxy.extraSANs` and `controlPlane.ingress.host` as solving entirely separate problems and implied that the chart-managed Ingress host alone would leave the certificate without the SAN. vCluster 0.36 automatically adds `controlPlane.ingress.host` to the proxy certificate SANs. Qualified the introductory warning to externally managed Ingress resources, documented the automatic SAN behavior, and clarified that the explicit duplicate `extraSANs` value is safe but redundant.
- The generated Ingress did not select an IngressClass. A classless Ingress can be ignored unless a default class exists or the controller watches classless resources. Added `controlPlane.ingress.spec.ingressClassName: nginx` and instructed readers to use their installed class name.
- The post called ingress-nginx deprecated, but Kubernetes retired the project on March 24, 2026 and no longer publishes fixes or security updates. Updated the status and date while retaining the recommendation to use Gateway API `TLSRoute` for new deployments.
- The certificate troubleshooting section inferred that an edge-issued certificate proved the Ingress controller itself terminated TLS. The certificate only proves that termination happened before vCluster and cannot distinguish the controller from another edge proxy. Corrected the inference.

## Review Notes

The vCluster fields and behavior were checked against both v0.36.0 and v0.36.1 tagged sources. The corrected values rendered successfully with the v0.36.1 Helm chart as a `networking.k8s.io/v1` Ingress selecting the `nginx` class and routing to the release Service's `https` port. The official v0.36.1 CLI binary confirmed every `vcluster create` and `vcluster connect` flag used by the post, and the five links in the post's Official Documentation section resolve to the intended pages.

ingress-nginx implements SSL passthrough outside NGINX and documents that other Ingress annotations do not affect the passthrough connection. The `backend-protocol` and `ssl-redirect` annotations remain in the example because they exactly match vCluster 0.36's defaults and are harmless in this configuration. The commands assume a vCluster 0.36 CLI so that its default chart version matches the version targeted by the guide. No live Ingress endpoint was provisioned during this source, schema, CLI-help, and Helm-render validation.
