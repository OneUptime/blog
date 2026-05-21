# Validation Summary: How to Set Up Istio on DigitalOcean Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- DigitalOcean Kubernetes (DOKS)
- Kubernetes
- DigitalOcean Load Balancers
- doctl
- cert-manager
- Helm
- Let's Encrypt ACME DNS-01

## Sources Consulted
- DigitalOcean doctl Kubernetes cluster create reference: https://docs.digitalocean.com/reference/doctl/reference/kubernetes/cluster/create/
- DigitalOcean Kubernetes load balancer annotations: https://docs.digitalocean.com/products/kubernetes/how-to/configure-load-balancers/
- DigitalOcean Cloud Controller Manager service annotations: https://github.com/digitalocean/digitalocean-cloud-controller-manager/blob/master/docs/controllers/services/annotations.md
- DigitalOcean Kubernetes autoscaler documentation: https://docs.digitalocean.com/products/kubernetes/how-to/autoscale/
- DigitalOcean doctl node pool update reference: https://docs.digitalocean.com/reference/doctl/reference/kubernetes/cluster/node-pool/update/
- DigitalOcean doctl DNS records create reference: https://docs.digitalocean.com/reference/doctl/reference/compute/domain/records/create/
- Istio installation customization and gateway documentation: https://istio.io/latest/docs/setup/additional-setup/customize-installation/ and https://istio.io/latest/docs/setup/additional-setup/gateway/
- Istio Gateway API reference: https://istio.io/latest/docs/reference/config/networking/gateway/
- Istio EnvoyFilter API reference: https://istio.io/latest/docs/reference/config/networking/envoy-filter/
- Istio PeerAuthentication API reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio DNS proxying documentation: https://istio.io/latest/docs/ops/configuration/traffic-management/dns-proxy/
- cert-manager Helm installation documentation: https://cert-manager.io/docs/installation/helm/
- cert-manager DigitalOcean DNS-01 provider documentation: https://cert-manager.io/docs/configuration/acme/dns01/digitalocean/
- Envoy PROXY protocol listener filter documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/listeners/listener_filters/proxy_protocol

## Issues Found
- The cluster creation command pinned Kubernetes `1.28.2-do.0`, which may no longer be a creatable DOKS version under DigitalOcean's supported-release policy. Changed it to `--version latest`.
- The node sizing text made an unsupported absolute minimum-size claim and cited fixed sidecar resource consumption. Reworded it as a practical starting-size recommendation because Istio sidecar resource usage depends on configuration and workload.
- The DigitalOcean load balancer size annotation used deprecated `do-loadbalancer-size-slug`. Replaced it with `do-loadbalancer-size-unit`.
- The custom DigitalOcean load balancer health check annotations omitted `do-loadbalancer-override-health-check`, which is required for explicit health check port, path, and protocol settings to take effect. Added it in both examples.
- The load balancer explanation said DigitalOcean Load Balancers are Layer 4 only. Updated it to say they can be configured with TCP forwarding, because DigitalOcean supports multiple load balancer modes and protocols.
- The PROXY protocol `EnvoyFilter` patched `LISTENER` with a merged `listenerFilters` list and used `typedConfig`. Updated it to use Istio's `LISTENER_FILTER` patch with `INSERT_BEFORE` and Envoy's `typed_config`, matching Istio's documented EnvoyFilter pattern.
- The Istio `Gateway` selector incorrectly used Kubernetes-style `matchLabels`. Changed it to the Istio Gateway selector map form: `istio: ingressgateway`.
- The cert-manager Helm command used the older `installCRDs` value. Updated it to the current documented `crds.enabled=true` value.
- The autoscaling command used `doctl kubernetes cluster update` with a `--node-pool` string. Changed it to the documented `doctl kubernetes cluster node-pool update` command with `--auto-scale`, `--min-nodes`, and `--max-nodes`.

## Review Notes
The remaining commands and manifests are broadly consistent with the official documentation. The Istio add-on manifests under `samples/addons` are useful for demos and evaluation, but production monitoring should normally be installed and managed with production-grade Helm charts or platform-specific observability tooling.
