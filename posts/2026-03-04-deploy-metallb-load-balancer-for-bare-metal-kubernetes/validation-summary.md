# Validation Summary: How to Deploy MetalLB Load Balancer for Bare-Metal Kubernetes on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- Kubernetes
- kubectl
- MetalLB
- firewalld

## Sources Consulted
- MetalLB installation documentation: https://metallb.io/installation/
- MetalLB configuration documentation: https://metallb.io/configuration/
- MetalLB troubleshooting documentation: https://metallb.io/troubleshooting/
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes kubectl wait reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- Kubernetes kubectl Linux installation and configuration documentation: https://kubernetes.io/docs/tasks/tools/install-kubectl-linux/
- Red Hat firewalld documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/securing_networks/using-and-configuring-firewalld_securing-networks

## Issues Found
- The original post used placeholders such as `<package-name>`, `<service>`, and `/etc/<service>/config.conf`, which are not valid MetalLB installation or configuration commands. Replaced them with the official MetalLB v0.15.3 manifest installation command and Kubernetes verification commands.
- The original post treated MetalLB as a RHEL systemd service. MetalLB runs inside Kubernetes as a controller Deployment and speaker DaemonSet, so the service management commands were replaced with `kubectl` workload checks.
- The original post did not configure MetalLB. Added the required `IPAddressPool` and `L2Advertisement` custom resources for Layer 2 mode based on the official MetalLB configuration documentation.
- The original verification command `sudo <service> --test` was not applicable. Replaced it with a test NGINX Deployment and `LoadBalancer` Service to verify external IP assignment.
- The original firewall example used a nonexistent generic firewalld service name. Replaced it with an explicit TCP port example for the exposed test service and noted the Layer 2 ARP/NDP requirement.
- The original troubleshooting and security notes referenced local Linux service behavior rather than Kubernetes and MetalLB resources. Updated them to match MetalLB failure modes and Kubernetes resource access control.

## Review Notes
The post now documents a minimal Layer 2 MetalLB deployment. Production environments should choose an address range that is reserved outside DHCP, review CNI compatibility, and use BGP configuration instead of Layer 2 mode when the network design requires routed advertisements.
