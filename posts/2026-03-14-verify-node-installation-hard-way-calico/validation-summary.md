# Validation Summary: How to Verify Node Installation in a Hard Way Calico Cluster Before Production

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico Open Source
- Kubernetes
- Calico CNI plugin
- Calico Felix
- Calico BIRD/BGP
- Linux networking interfaces and routes
- `kubectl`
- `calicoctl`

## Sources Consulted
- Calico hard-way CNI plugin installation: https://docs.tigera.io/calico/latest/getting-started/kubernetes/hardway/install-cni-plugin
- Calico hard-way `calico/node` installation: https://docs.tigera.io/calico/latest/getting-started/kubernetes/hardway/install-node
- Calico `calico/node` configuration and readiness flags: https://docs.tigera.io/calico/latest/reference/configure-calico-node
- Calico overlay networking, IP-in-IP, VXLAN, and route programming: https://docs.tigera.io/calico/latest/networking/configuring/vxlan-ipip
- Calico Kubernetes system and network requirements: https://docs.tigera.io/calico/latest/getting-started/kubernetes/requirements
- `calicoctl node status` reference: https://docs.tigera.io/calico/latest/reference/calicoctl/node/status
- `calicoctl node` command scope: https://docs.tigera.io/calico/latest/reference/calicoctl/node/overview
- `calicoctl get` reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Kubernetes field selectors: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/
- Kubernetes `kubectl logs` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/

## Issues Found
- The post described BIRD as universally required. Updated the description, introduction, process checks, diagram, verification script, and troubleshooting to clarify that BIRD/BGP checks apply only when BGP is enabled. Calico VXLAN-only clusters can disable BGP and BIRD.
- The post said hard-way installations have no DaemonSet controller reconciling state, but Calico's hard-way Kubernetes guide installs `calico/node` as a DaemonSet. Revised the statement to focus on the absence of an operator and the manual responsibility for host CNI files and backend-specific configuration.
- The per-node scripts assumed `hostname` always matches the Kubernetes/Calico node name. Added a `NODE_NAME` override with a lowercase hostname default and used it consistently in pod selection and `calicoctl get node`.
- The cluster-wide script ran `calicoctl node status` from the workstation, but Calico documents `calicoctl node` commands as node-local commands. Replaced that with a `kubectl get pods -o wide` summary and a note to run `sudo calicoctl node status` directly on each node for BGP status.
- The route verification hard-coded `eth0` for remote pod routes. Replaced it with checks for BIRD-programmed routes and Calico tunnel/workload interfaces so it is not tied to a specific host interface name.
- The troubleshooting guidance for missing remote pod routes only mentioned BGP. Updated it to distinguish BGP-enabled clusters from VXLAN clusters and to mention UDP 4789 for VXLAN.

## Review Notes
The commands are intentionally generic because the post does not target a specific Calico version or a single backend mode. Future improvements could add separate examples for BGP/IPIP, VXLAN-only, and eBPF dataplane deployments.
