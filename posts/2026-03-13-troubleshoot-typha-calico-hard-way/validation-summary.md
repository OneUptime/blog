# Validation Summary: How to Troubleshoot Typha in a Calico Hard Way Installation

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Calico Open Source
- Typha
- calico/node and Felix
- Kubernetes
- Kubernetes NetworkPolicy
- kubectl
- Prometheus metrics
- TLS certificates
- Kubernetes RBAC

## Sources Consulted
- Calico Open Source documentation: Install Typha, Calico the hard way: https://docs.tigera.io/calico/latest/getting-started/kubernetes/hardway/install-typha
- Calico Open Source documentation: Install calico/node, Calico the hard way: https://docs.tigera.io/calico/latest/getting-started/kubernetes/hardway/install-node
- Calico Open Source documentation: Monitoring Typha with Prometheus: https://docs.tigera.io/calico/latest/reference/typha/prometheus
- Calico Open Source documentation: Configuring Typha: https://docs.tigera.io/calico/latest/reference/typha/configuration
- Calico Open Source documentation: Configure encryption and authentication to secure Calico components: https://docs.tigera.io/calico/latest/network-policy/comms/crypto-auth
- Calico Open Source documentation: Installing on on-premises deployments, Typha replica recommendations: https://docs.tigera.io/calico/latest/getting-started/kubernetes/self-managed-onprem/onpremises
- Kubernetes kubectl reference: kubectl auth can-i: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i/
- Kubernetes kubectl reference: kubectl port-forward: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_port-forward/
- Kubernetes kubectl reference: kubectl logs: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes documentation: Update API Objects in Place Using kubectl patch: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/update-api-object-kubectl-patch/
- Kubernetes documentation: Network Policies: https://kubernetes.io/docs/concepts/services-networking/network-policies/

## Issues Found
- The commands used the `calico-system` namespace, but the official Calico hard-way manifests install Typha and calico/node into `kube-system`. Updated all hard-way troubleshooting commands to use `kube-system`.
- The TLS checks referenced operator-style secret names and keys (`calico-typha-tls`, `calico-felix-typha-tls`, `tls.crt`, and `ca.crt`) that do not match the hard-way installation. Updated the commands to use `calico-typha-ca`, `calico-typha-certs`, `calico-node-certs`, `typhaca.crt`, `typha.crt`, and `calico-node.crt`.
- The CA comparison command assumed both certificate secrets contained a CA bundle. In the hard-way flow, the CA is stored in the `calico-typha-ca` ConfigMap. Replaced the comparison with `openssl verify` against the Typha CA.
- The metrics examples used `typha_updates_sent`, which is not listed in the current official Typha metrics reference. Updated the examples to use `typha_updates_total`.
- The metrics examples used port `9093`, while the official Typha metrics example uses `9091`. Updated port-forward and curl commands to use `9091` and clarified that the metrics check applies when Prometheus metrics are enabled.
- The RBAC check for `networkpolicies` did not cover all namespaces. Updated it to use `--all-namespaces` and the hard-way Typha service account identity.
- The conclusion referred to CA consistency between Typha and Felix secrets. Updated it to reflect the hard-way CA ConfigMap and Typha/calico-node certificate secrets.

## Review Notes
The Calico hard-way documentation currently shows older image versions in some manifest examples, but the concepts, resource names, TLS layout, and Typha behavior remain applicable for this troubleshooting guide. Local `kubectl --help` verification was not possible because `kubectl` is not installed in the workspace; kubectl command syntax was checked against the official generated Kubernetes reference instead.
