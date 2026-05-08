# Validation Summary: How to Validate Calico Node Diagnostics

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico
- Kubernetes
- kubectl
- calicoctl
- Felix
- BGP
- iptables

## Sources Consulted
- Calico documentation: Configuring calico/node, including calico/node daemons, networking backend modes, and exec readiness flags. https://docs.tigera.io/calico/latest/reference/configure-calico-node
- Calico documentation: calicoctl node status command and example BGP Established output. https://docs.tigera.io/calico/latest/reference/calicoctl/node/status
- Calico documentation: Configure BGP peering, including BGP enabled behavior, route reflectors, and calicoctl node status usage. https://docs.tigera.io/calico/latest/networking/configuring/bgp
- Calico documentation: Component architecture, including Felix and BIRD responsibilities and policy-only mode. https://docs.tigera.io/calico/latest/reference/architecture/overview
- Calico documentation: Felix configuration health timeout behavior for liveness and readiness. https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Kubernetes documentation: Debugging Kubernetes nodes with kubectl debug, including host namespace behavior, required permissions, debug image tooling caveats, and sysadmin profile guidance. https://kubernetes.io/docs/tasks/debug/debug-cluster/kubectl-node-debug/
- Kubernetes documentation: kubectl debug reference. https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/

## Issues Found
- The Felix check grepped for the word "live" in command output. Calico exec health/readiness checks are intended to be evaluated by exit status and may produce no output on success, so the script could falsely fail healthy nodes. Changed the script to use the `kubectl exec` exit status for `/bin/calico-node -felix-live -felix-ready`.
- The command substitutions used `grep -c ... || echo 0`, which can produce two lines of output when `grep -c` prints `0` and exits non-zero. That can break numeric comparisons in `[ "${ESTABLISHED}" -gt 0 ]`. Changed the BGP check to capture command output and count Established peers separately.
- The post described "iptables rule completeness" too broadly. Calico can use different dataplanes and backends, including BPF or VXLAN-only modes, so an iptables chain check only applies to Calico's iptables dataplane and only confirms rules are present. Updated the description and section heading accordingly.
- The `kubectl debug node` example used `alpine`, which does not reliably include the required troubleshooting tools, and Kubernetes notes that debug commands depend on the image and permissions. Changed the example to `nicolaka/netshoot` with `--profile=sysadmin` and added a note that the image must include `nsenter` and `iptables`.
- The pod reachability failure comment attributed failures only to BGP route propagation. That is too narrow because dataplane mode, NetworkPolicy, and ICMP handling can also affect ping results. Updated the comment to list those checks.
- The conclusion claimed a green run confirms the full data plane is healthy. That was too broad for the specific checks shown, so it now says the tested dataplane path is healthy.

## Review Notes
The examples assume an operator-style Calico install using the `calico-system` namespace and `k8s-app=calico-node` label. Clusters installed with different manifests may use another namespace, commonly `kube-system`, or different labels. BGP checks are only expected to be meaningful when Calico BGP is enabled.
