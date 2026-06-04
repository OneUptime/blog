# Validation Summary: How to Set Up kube-vip for Control Plane and Service Load Balancing Without

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- kubeadm
- kube-vip
- kube-vip cloud provider
- Kubernetes Services of type LoadBalancer
- ARP and BGP load balancing
- containerd and Docker
- Kubespray, RKE2, and k3s

## Sources Consulted
- kube-vip Static Pods documentation: https://kube-vip.io/docs/installation/static/
- kube-vip DaemonSet documentation: https://kube-vip.io/docs/installation/daemonset/
- kube-vip Flags and Environment Variables documentation: https://kube-vip.io/docs/installation/flags/
- kube-vip ARP mode documentation: https://kube-vip.io/docs/modes/arp/
- kube-vip BGP mode documentation: https://kube-vip.io/docs/modes/bgp/
- kube-vip Services documentation: https://kube-vip.io/docs/usage/services/
- kube-vip On-Prem / cloud provider documentation: https://kube-vip.io/docs/usage/cloud-provider/
- kube-vip official RBAC manifest: https://kube-vip.io/manifests/rbac.yaml
- kube-vip cloud provider manifest: https://raw.githubusercontent.com/kube-vip/kube-vip-cloud-provider/main/manifest/kube-vip-cloud-controller.yaml
- Kubernetes kubeadm init documentation: https://kubernetes.io/docs/reference/setup-tools/kubeadm/kubeadm-init/
- Kubernetes kubeadm init phase documentation: https://kubernetes.io/docs/reference/setup-tools/kubeadm/kubeadm-init-phase/
- Kubernetes kubeadm certs renew apiserver documentation: https://kubernetes.io/docs/reference/setup-tools/kubeadm/generated/kubeadm_certs/kubeadm_certs_renew_apiserver/
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/

## Issues Found
- The service load-balancing section implied that kube-vip itself allocates LoadBalancer IPs from the ConfigMap. Updated it to install and describe the kube-vip cloud provider as the component that assigns external IPs, while kube-vip advertises those assigned addresses.
- The IP pool example used `cidr-global` with a start-end IP range. Changed it to `range-global`, matching kube-vip cloud provider ConfigMap semantics.
- The hand-written kube-vip RBAC snippet was missing current permissions for leases, EndpointSlices, node updates/patches, and pods. Updated the ClusterRole to match the official kube-vip RBAC requirements.
- The DaemonSet example used `vip_cidr`, but current kube-vip documentation uses `vip_subnet`. Updated the environment variable.
- The BGP peer examples used `address:AS:multihop`; kube-vip expects `address:AS:password:multihop`. Added the empty password field in both examples.
- The existing-cluster kubeadm certificate instructions referenced a non-default local kubeadm config path and did not account for kubeadm skipping certificate generation when `apiserver.crt` and `apiserver.key` already exist. Updated the steps to export ClusterConfiguration from the `kubeadm-config` ConfigMap, edit SANs, move the old cert/key aside, and regenerate from the config.
- The DHCP example used an unsupported `enable_dhcp` environment variable. Replaced it with the supported Service annotation pattern using `kube-vip.io/loadbalancerIPs: "0.0.0.0"`.
- The service annotation examples included unsupported per-Service annotations for interface selection and service election. Replaced them with supported kube-vip annotations for ignoring a service, requesting a DHCP IP, and setting a DHCP hardware address.

## Review Notes
- The article pins kube-vip examples to `v0.7.0`. That version is older than current kube-vip releases, but the corrected flags, environment variables, and ConfigMap keys are aligned with the current official documentation.
- Kubernetes `.spec.loadBalancerIP` is deprecated as of Kubernetes v1.24; the post now favors kube-vip's provider-specific annotation for static addresses.
