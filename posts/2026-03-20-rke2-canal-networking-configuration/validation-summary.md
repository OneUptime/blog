# Validation Summary: How to Configure RKE2 Networking with Canal

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- RKE2
- Canal CNI
- Flannel
- Calico
- Kubernetes NetworkPolicy
- Kubernetes kubectl
- HelmChartConfig

## Sources Consulted
- RKE2 Network Options: https://docs.rke2.io/networking/basic_network_options
- RKE2 Server Configuration Reference: https://docs.rke2.io/reference/server_config
- RKE2 Helm Integration: https://docs.rke2.io/add-ons/helm
- RKE2 Canal chart values: https://raw.githubusercontent.com/rancher/rke2-charts/main-source/packages/rke2-canal/charts/values.yaml
- RKE2 Canal chart ConfigMap template: https://raw.githubusercontent.com/rancher/rke2-charts/main-source/packages/rke2-canal/charts/templates/config.yaml
- RKE2 Canal chart DaemonSet template: https://raw.githubusercontent.com/rancher/rke2-charts/main-source/packages/rke2-canal/charts/templates/daemonset.yaml
- Flannel backends: https://raw.githubusercontent.com/flannel-io/flannel/master/Documentation/backends.md
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- kubectl create deployment reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_deployment/
- kubectl expose reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_expose/
- kubectl rollout status reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_status/

## Issues Found
- The introduction described Flannel as handling pod-to-pod networking via VXLAN without the RKE2 Canal nuance. Updated it to say Flannel handles inter-node pod networking via VXLAN by default, while Calico handles intra-node traffic and NetworkPolicy enforcement.
- The Flannel backend example included `calico.encapsulation: "None"` and described it as IPIP-related routing. That is not a valid RKE2 Canal chart value for controlling Canal routing, so it was removed.
- The `host-gw` guidance did not mention its direct Layer 2 connectivity requirement. Added that requirement and changed the example to show `backend: "host-gw"`.
- The backend change timing was too casual for a Flannel backend change. Updated the note to apply backend changes before cluster initialization when possible and to restart the `rke2-canal` DaemonSet if changing an existing cluster.
- The NetworkPolicy test referenced `my-service` without creating it. Added commands to create an nginx deployment, expose it as a Service, and wait for rollout before applying the deny-all ingress policy.
- The temporary client command did not specify `--restart=Never`. Added it to match current `kubectl run` behavior for a one-off Pod.
- The MTU example only set `flannel.mtu`. Added `calico.vethuMTU` because the RKE2 Canal chart uses that value for the Calico CNI veth MTU.

## Review Notes
- `kubectl` was not installed in the local environment, so CLI syntax was checked against official Kubernetes reference documentation rather than local `--help` output.
- The external ping command in Step 2 is syntactically valid, but it also depends on cluster egress to the internet; a cluster with restricted egress could fail that check even if Canal pod networking is otherwise healthy.
