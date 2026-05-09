# Validation Summary: Troubleshoot IPv6 Control Plane in Calico

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Calico
- Kubernetes
- IPv6
- BGP / BIRD
- Typha
- Felix
- calicoctl
- kubectl

## Sources Consulted
- Calico documentation, Configure dual stack or IPv6 only: https://docs.tigera.io/calico/latest/networking/ipam/ipv6
- Calico documentation, Configure Kubernetes control plane to operate over IPv6: https://docs.tigera.io/calico/latest/networking/ipam/ipv6-control-plane
- Calico documentation, FelixConfiguration resource: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico documentation, Configuring calico/node: https://docs.tigera.io/calico/latest/reference/configure-calico-node
- Calico documentation, calicoctl node status: https://docs.tigera.io/calico/latest/reference/calicoctl/node/status
- Calico documentation, BGPPeer resource: https://docs.tigera.io/calico/latest/reference/resources/bgppeer
- Calico documentation, Node resource: https://docs.tigera.io/calico/latest/reference/resources/node
- Calico documentation, Typha overview and configuration: https://docs.tigera.io/calico/latest/reference/typha/overview and https://docs.tigera.io/calico/latest/reference/typha/configuration
- Kubernetes documentation, API health endpoints: https://kubernetes.io/docs/reference/using-api/health-checks
- Kubernetes documentation, kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes blog, Endpoints API deprecation in v1.33: https://kubernetes.io/blog/2025/04/24/endpoints-deprecation/
- BIRD User's Guide, remote control commands: https://bird.network.cz/doc/bird-4.html

## Issues Found
- The description claimed the post covered etcd IPv6 connectivity, but the article did not include etcd diagnostics. I changed the description to match the actual scope: BGP IPv6 peering, Typha connectivity, and Kubernetes API server IPv6 communication.
- The API server connectivity test used the `kubernetes` Service ClusterIP with port `6443`. The default Kubernetes Service exposes the API through service port `443`, while `6443` is commonly the backend API server port. I changed the curl command to use port `443`.
- The API server test used `/healthz`, which Kubernetes has deprecated since v1.16. I changed it to `/readyz`.
- The API server test attempted to run `curl` inside `calico-node`, but Calico node images are not a reliable place to assume curl is available. I changed the example to run a temporary `curlimages/curl` pod and wait for it to become ready before executing the check.
- The BGP status example used `birdcl6 show protocols` directly. Calico documents `calicoctl node status` and the `/bin/calico-node -bird6-ready` readiness endpoint for node/BGP status checks, so I replaced the primary status check with those documented commands.
- The Typha endpoint check used the legacy `Endpoints` API. Kubernetes v1.33 deprecated Endpoints in favor of EndpointSlice, so I changed the command to query EndpointSlices by the `kubernetes.io/service-name=calico-typha` label.
- The ConfigMap snippet used invalid Calico keys: `typha_service_name` and `felix_ipv6_support`. I replaced it with a valid `FelixConfiguration` resource using `spec.ipv6Support: true`, and noted the equivalent `FELIX_IPV6SUPPORT=true` environment variable documented by Calico.
- The best-practices section referenced the invalid `felix_ipv6_support` ConfigMap key. I changed it to the documented Felix configuration field and environment variable.
- The BIRD route command used `birdcl6` without specifying the Calico BIRD6 control socket. I changed it to use BIRD's documented `-s` control socket option with `/var/run/calico/bird6.ctl`.

## Review Notes
- `calicoctl node status` must be run directly on a compute host running the Calico node instance; it is not a generic remote cluster command.
- Calico operator installations manage some component configuration differently than manifest-based installs. The corrected FelixConfiguration example is valid for Felix settings, but Typha component configuration itself cannot be modified directly through the operator.
