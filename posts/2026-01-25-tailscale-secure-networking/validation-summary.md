# Validation Summary: How to Configure Tailscale for Secure Networking

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Tailscale
- Tailscale Kubernetes Operator
- Kubernetes Services, DaemonSets, and custom resources
- Helm
- Tailscale ACLs, grants, tags, and SSH policy
- Tailscale subnet routing, MagicDNS, and API server proxy
- WireGuard-based mesh VPN networking

## Sources Consulted
- Tailscale Kubernetes Operator overview: https://tailscale.com/docs/kubernetes-operator
- Install the Tailscale Kubernetes Operator: https://tailscale.com/docs/kubernetes-operator/install-operator
- Tailscale Operator Helm chart values: https://github.com/tailscale/tailscale/blob/main/cmd/k8s-operator/deploy/chart/values.yaml
- Expose cluster workloads to your tailnet with Ingress: https://tailscale.com/docs/kubernetes-operator/ingress
- Expose a cluster workload to your tailnet at layer 3: https://tailscale.com/docs/kubernetes-operator/ingress/expose-workload-to-tailnet-l3
- Deploy exit nodes and subnet routers on Kubernetes: https://tailscale.com/docs/kubernetes-operator/connector/deploy-subnet-router
- Tailscale Kubernetes Operator API reference: https://github.com/tailscale/tailscale/blob/main/k8s-operator/api.md
- Access the Kubernetes API server over Tailscale: https://tailscale.com/docs/kubernetes-operator/api-server-access/setup-api-over-tailscale
- Use DNSConfig for in-cluster MagicDNS resolution: https://tailscale.com/docs/kubernetes-operator/concepts/dnsconfig
- Tailnet policy file syntax: https://tailscale.com/docs/reference/syntax/policy-file
- Key expiry: https://tailscale.com/docs/features/access-control/key-expiry

## Issues Found
- The Helm values placed `image` and `resources` at the wrong level and included non-existent `proxyClass.enabled` and `connector.enabled` values. Moved operator image and resources under `operatorConfig` and removed unsupported keys.
- The operator image example pinned `tag: stable`, but the Helm chart expects an empty tag to use the chart app version unless a specific operator image tag is intentionally pinned. Updated the example accordingly.
- The install commands created an OAuth Secret with a custom name and camelCase keys that the chart would not consume by default. Removed that command and used the chart's `oauth.clientId` and `oauth.clientSecret` values with `--create-namespace` and `--wait`.
- The ACL policy referenced tags that were not declared in `tagOwners`. Added the missing tag ownership entries for the CI runner, API proxy, pod, and subnet-router tags.
- The ACL/grants example did not include the API proxy access and service auto-approval needed by the current `ProxyGroup` API server proxy flow. Added grants for `tag:k8s-api` and an `autoApprovers.services` entry.
- The `Connector` example incorrectly put a cluster-scoped resource in a namespace and omitted the current `replicas` field used in Tailscale examples. Removed `namespace` and added `replicas: 1`.
- The Kubernetes API server example used an annotated `ExternalName` Service, which is not the current supported API server proxy model. Replaced it with a `ProxyGroup` of type `kube-apiserver` and updated the kubectl setup commands to use `tailscale configure kubeconfig`.
- The MagicDNS example forwarded CoreDNS directly to `100.100.100.100`, which is not the documented operator pattern for in-cluster MagicDNS. Replaced it with a `DNSConfig` resource and a CoreDNS stub-domain update using the nameserver Service IP.
- The monitoring script used label selectors to find Services by annotation, which Kubernetes label selectors cannot do. Updated those commands to query Services as JSON and filter annotations with `jq`.
- The key-expiry policy example used an unsupported `nodeAttrs` attribute (`key-expiry:90d`). Replaced it with an accurate note that tagged operator-managed devices have key expiry disabled by default and should be managed through the Admin Console with a re-authentication plan.

## Review Notes
The DaemonSet and sidecar examples are still lower-level alternatives to the Kubernetes Operator. They require appropriate auth keys, Secrets, and RBAC in a real deployment; the operator-managed `Connector`, ingress, and API server proxy patterns are the preferred current approach for most production Kubernetes setups.
