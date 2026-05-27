# Validation Summary: How to Install MetalLB on RKE2 (Rancher Kubernetes Engine 2)

## Status
validated

## Post Type
Tutorial / installation guide

## Technologies Covered
- Kubernetes
- RKE2 (Rancher Kubernetes Engine 2)
- MetalLB
- Helm
- kubectl
- Calico / Canal
- firewalld

## Sources Consulted
- RKE2 Networking Services: https://docs.rke2.io/networking/networking_services
- RKE2 Server Configuration Reference: https://docs.rke2.io/reference/server_config
- RKE2 Configuration Options: https://docs.rke2.io/install/configuration
- RKE2 Known Issues and Limitations: https://docs.rke2.io/known_issues
- MetalLB Installation: https://metallb.io/installation/
- MetalLB Configuration: https://metallb.io/configuration/
- MetalLB Advanced IPAddressPool Configuration: https://metallb.io/configuration/_advanced_ipaddresspool_configuration/
- K3s ServiceLB Networking Services, referenced by RKE2 docs for ServiceLB behavior: https://docs.k3s.io/networking/networking-services

## Issues Found
- RKE2 ServiceLB was described as a default packaged component disabled with `disable: [rke2-servicelb]`. Current RKE2 docs describe ServiceLB as optional and controlled by `enable-servicelb`, so the post now instructs readers to leave it absent or set `enable-servicelb: false`.
- The ServiceLB verification command searched for `servicelb`, but ServiceLB pods are created with an `svclb-` prefix. The command now checks `kubectl get pods -n kube-system | grep '^svclb-'`.
- The post suggested disabling the bundled ingress controller by adding `rke2-ingress-nginx` to the disable list. Current RKE2 docs use `ingress-controller: none`, so that note was corrected.
- The MetalLB Helm install omitted the privileged Pod Security Admission namespace labels that MetalLB documents for clusters enforcing Pod Security Admission. The namespace label command was added.
- The test Service used the legacy `metallb.universe.tf/address-pool` annotation. MetalLB docs now use `metallb.io/address-pool`, so the annotation was updated.
- The L2 traffic diagram implied the MetalLB speaker proxies data-plane traffic. MetalLB L2 mode uses the speaker to answer ARP/NDP while kube-proxy or IPVS handles service forwarding on the selected node, so the diagram and sequence were corrected.
- The Calico policy text implied Calico network policy allows ARP. ARP/NDP is layer 2 traffic, so the text now distinguishes IP traffic controlled by policy from ARP/NDP that must be permitted by node and network firewalls.
- The firewall note did not mention RKE2's documented firewalld conflict with default Canal networking. The wording now reflects that caveat while retaining the MetalLB memberlist port guidance.

## Review Notes
The remaining Kubernetes manifests and Helm commands are syntactically valid and align with current MetalLB CRD examples. The post still uses an L2-mode example only; BGP deployments need additional MetalLB BGP resources and router configuration.
