# Validation Summary: Troubleshooting Typha Scaling in Calico the Hard Way

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Calico Open Source
- Typha
- Felix / calico-node
- Kubernetes
- kubectl
- Prometheus metrics
- TLS / mTLS certificates

## Sources Consulted
- Calico documentation: Install Typha, https://docs.tigera.io/calico/latest/getting-started/kubernetes/hardway/install-typha
- Calico documentation: Install calico/node, https://docs.tigera.io/calico/latest/getting-started/kubernetes/hardway/install-node
- Calico documentation: Configuring Typha, https://docs.tigera.io/calico/latest/reference/typha/configuration
- Calico documentation: Configuring Felix, https://docs.tigera.io/calico/latest/reference/felix/configuration
- Calico documentation: Monitoring Typha with Prometheus, https://docs.tigera.io/calico/latest/reference/typha/prometheus
- Calico documentation: Configure encryption and authentication to secure Calico components, https://docs.tigera.io/calico/latest/network-policy/comms/crypto-auth
- Kubernetes documentation: kubectl rollout, https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/
- Kubernetes documentation: kubectl auth can-i, https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i/
- Kubernetes documentation: EndpointSlices, https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/

## Issues Found
- The post referred to TLS Secret names and keys (`calico-typha-tls`, `calico-felix-tls`, `ca.crt`, and `tls.crt`) that do not match Calico's hard-way manifests. Updated the commands to use the hard-way resources: `calico-typha-ca`, `calico-typha-certs`, `calico-node-certs`, `typhaca.crt`, `typha.crt`, and `calico-node.crt`.
- The TLS verification text said the Typha server certificate CN should match `typhaServerCN` in `FelixConfiguration`. Updated it to match the hard-way manifest and Felix configuration reference, where calico-node uses `FELIX_TYPHACN` / `TyphaCN`.
- The Felix client certificate expected CN was listed as `calico-felix`, but the Calico hard-way guide uses `calico-node`. Updated the expected CN.
- The service endpoint check used the older Endpoints object. Updated the command to use EndpointSlices, which are the current stable Kubernetes API for service backends.
- The connection metrics command used port `9093`. Calico Typha's default Prometheus metrics port is `9091`, and metrics are disabled unless `TYPHA_PROMETHEUSMETRICSENABLED` is set. Updated the command and added a note to use the configured metrics port when it differs.
- The pod status explanation only mentioned Secret mounts for `ContainerCreating`. Updated it to include ConfigMap mounts because the hard-way CA is stored in a ConfigMap.

## Review Notes
The guide assumes a manifest-based Calico hard-way deployment. Operator-based Calico installations manage Typha and mTLS differently, so the troubleshooting commands may need resource-name adjustments in operator-managed clusters.
