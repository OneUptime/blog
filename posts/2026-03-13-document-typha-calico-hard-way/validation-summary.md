# Validation Summary: How to Document Typha in a Calico Hard Way Installation

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico Open Source
- Typha
- Kubernetes
- kubectl
- Prometheus metrics
- TLS certificates
- calicoctl

## Sources Consulted
- Calico Open Source Typha overview: https://docs.tigera.io/calico/latest/reference/typha/overview
- Calico Open Source Hard Way Typha installation: https://docs.tigera.io/calico/latest/getting-started/kubernetes/hardway/install-typha
- Calico Open Source Hard Way calico/node installation: https://docs.tigera.io/calico/latest/getting-started/kubernetes/hardway/install-node
- Calico Open Source Typha configuration reference: https://docs.tigera.io/calico/latest/reference/typha/configuration
- Calico Open Source Typha Prometheus metrics reference: https://docs.tigera.io/calico/latest/reference/typha/prometheus
- Kubernetes kubectl reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- Kubernetes JSONPath support: https://kubernetes.io/docs/reference/kubectl/jsonpath/

## Issues Found
- The post used the `calico-system` namespace throughout, but the official Calico Hard Way manifests install Typha, the service, and calico/node resources in `kube-system`. Updated the commands and architecture description to use `kube-system`.
- The post referenced `calico-typha-tls` and `calico-felix-typha-tls` secrets, which do not match the Hard Way certificate resources. Updated the text and certificate expiry commands to use the `calico-typha-ca` ConfigMap, `calico-typha-certs` secret, and `calico-node-certs` secret.
- The daily health check queried `http://localhost:9093/metrics`, but the Typha configuration reference documents the default Prometheus metrics port as `9091`. Updated the script to query port `9091` and added a note that Typha Prometheus metrics must be enabled.
- The daily health check executed against one Deployment-selected pod and compared that pod's connections with the full node count. Updated it to iterate over all Typha pods and sum `typha_connections_streaming`.
- The post referenced `typha_updates_sent`, which is not listed in the current Typha metrics reference. Replaced it with `typha_updates_total` and `typha_client_latency_secs`.
- The scale example could reduce Typha below the three replicas used by the Hard Way guide for availability. Updated the shell snippet to keep a minimum of three replicas while retaining the documented 200-node target example.
- The TLS troubleshooting row said to compare CA certs in both secrets, but the Hard Way stores the CA in a ConfigMap and leaf certificates in secrets. Updated the wording to match those resources.
- The configuration snapshot used `calicoctl get felixconfiguration default`, but the Hard Way manifest configures Felix-to-Typha settings through the `calico-node` DaemonSet environment. Updated the command to inspect the DaemonSet.

## Review Notes
Typha metric names are documented as implementation-dependent and may change across Calico releases, so runbooks should be checked when upgrading Calico. The post now assumes Calico Open Source Hard Way resource names rather than operator-managed installations.
