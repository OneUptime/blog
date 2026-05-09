# Validation Summary: Troubleshooting Cilium Host Network Mode

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- Cilium
- Kubernetes
- Host network pods
- Cilium host firewall and host policies
- CiliumClusterwideNetworkPolicy
- Hubble
- Helm
- kubectl

## Sources Consulted
- Cilium Host Firewall documentation: https://docs.cilium.io/en/stable/security/host-firewall/
- Cilium Host Policies documentation: https://docs.cilium.io/en/stable/security/policy/host.html
- CiliumEndpoint CRD documentation: https://docs.cilium.io/en/stable/network/kubernetes/ciliumendpoint.html
- Cilium `cilium-dbg endpoint list` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_list/
- Cilium Hubble CLI documentation: https://docs.cilium.io/en/latest/observability/hubble/hubble-cli/
- Kubernetes DNS for Services and Pods documentation: https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/
- Kubernetes API reference for Pod host networking and hostPort behavior: https://kubernetes.io/docs/reference/generated/kubernetes-api/
- Python `http.server` documentation: https://docs.python.org/3/library/http.server.html

## Issues Found
- The sample host-networked pod used the default `nginx:1.27` image while declaring port 8080. The default NGINX container listens on port 80, so the example would not serve traffic on the policy's port without extra configuration. I changed the container to run Python's built-in HTTP server on port 8080.
- The host-networked pod omitted `dnsPolicy: ClusterFirstWithHostNet`. Kubernetes recommends explicitly setting this policy for pods that use `hostNetwork` and still need cluster DNS. I added it to the pod example.
- The endpoint inspection commands used `cilium endpoint list`. Current Cilium documentation exposes endpoint inspection through `cilium-dbg endpoint list` in the Cilium agent context. I changed the diagnostic and verification commands to run `cilium-dbg` via `kubectl exec` against the Cilium DaemonSet.
- The host firewall verification only checked the ConfigMap value. Cilium's host firewall documentation also shows verifying the runtime status with `cilium-dbg status`. I added that runtime check.
- The host policy example allowed egress only to `world`, which could make the example unexpectedly block normal host-to-cluster traffic once egress policy enforcement is enabled. I added `cluster` to the allowed egress entities.
- The post said host-networked pods use the node identity. Cilium documentation describes host policies as applying to the host namespace, including host-networking pods, and the host endpoint is represented with the `reserved:host` label. I changed the wording to say host-networked pods are covered by the host endpoint.

## Review Notes
Host policies can block access to nodes or cluster-critical traffic if applied too broadly. In a production guide, it would be useful to mention Cilium's host policy audit mode and to scope the `nodeSelector` to deliberately labeled nodes before enforcing policies cluster-wide.
