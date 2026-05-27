# Validation Summary: How to Fix MetalLB Not Advertising from Control-Plane Nodes

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- Kubernetes
- MetalLB
- MetalLB Helm chart
- Kubernetes DaemonSets
- Kubernetes taints and tolerations
- MetalLB L2Advertisement
- MicroK8s
- k3s

## Sources Consulted
- Kubernetes DaemonSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/daemonset/
- Kubernetes kubeadm control-plane node isolation documentation: https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/create-cluster-kubeadm/
- Kubernetes well-known labels, annotations, and taints reference: https://kubernetes.io/docs/reference/labels-annotations-taints/
- MetalLB installation documentation: https://metallb.io/installation/
- MetalLB Layer 2 concepts: https://metallb.io/concepts/layer2/
- MetalLB advanced L2 configuration documentation: https://metallb.io/configuration/_advanced_l2_configuration/
- MetalLB API reference: https://metallb.io/apis/
- MetalLB troubleshooting documentation: https://metallb.io/troubleshooting/index.html
- MetalLB Helm chart values and speaker template: https://github.com/metallb/metallb/tree/main/charts/metallb
- MetalLB native manifest: https://raw.githubusercontent.com/metallb/metallb/main/config/manifests/metallb-native.yaml
- MicroK8s MetalLB addon documentation: https://canonical.com/microk8s/docs/addon-metallb
- k3s advanced configuration documentation: https://docs.k3s.io/advanced
- k3s server CLI documentation: https://docs.k3s.io/cli/server

## Issues Found
- The post implied MetalLB speaker pods are blocked by control-plane taints by default. Current official MetalLB manifests and Helm chart defaults already include control-plane/master tolerations for the speaker, so the wording was changed to apply to custom, older, or modified installs that lack those tolerations.
- The pod label examples only used `component=speaker`, which matches the native manifest but not current Helm labels. Added `app.kubernetes.io/component=speaker` and kept the older label as a manifest-based fallback.
- The DaemonSet examples assumed the DaemonSet name is always `speaker`. Current Helm installs commonly use `metallb-speaker`, while native manifests use `speaker`, so both names are now shown.
- The L2 failover explanation said a control-plane node without a speaker could be selected as announcer. MetalLB L2 leader election considers active eligible speakers, so the explanation was corrected to focus on cases where node selectors or service settings leave no eligible advertising speaker.
- The JSON patch example only added one toleration and would fail when the tolerations array was absent. Replaced it with a strategic merge patch that adds both `node-role.kubernetes.io/control-plane` and deprecated `node-role.kubernetes.io/master` compatibility tolerations.
- The L2Advertisement worker selector example assumed all clusters have `node-role.kubernetes.io/worker`. Added a note that this label must exist or be replaced with a real worker-node label.
- The MicroK8s section made unsupported blanket claims about single-node control-plane taints and automatic toleration behavior. Reworded it to match the official addon documentation and to cover manual installs that lack tolerations.

## Review Notes
The Kubernetes and MetalLB APIs used in the YAML snippets are current. The `node-role.kubernetes.io/master` taint is deprecated but remains useful as a compatibility toleration for older clusters.
