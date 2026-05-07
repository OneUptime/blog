# Validation Summary: How to Avoid IPv4 Fragmentation in Docker and Container Networks

## Status
validated

## Post Type
Guide

## Technologies Covered
- Docker Engine networking
- Docker Compose
- Kubernetes
- Flannel
- Calico
- Weave Net
- Linux networking
- MTU / PMTU / IPv4 fragmentation

## Sources Consulted
- Docker bridge network driver docs: https://docs.docker.com/engine/network/drivers/bridge/
- Docker daemon (`dockerd`) reference: https://docs.docker.com/reference/cli/dockerd/
- Docker `network create` reference: https://docs.docker.com/reference/cli/docker/network/create/
- Docker Compose `version` top-level element docs: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Compose networks reference: https://docs.docker.com/reference/compose-file/networks/
- Kubernetes `kubectl run` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- BusyBox applet reference (`ping` options): https://busybox.net/downloads/BusyBox.html
- Amazon EC2 MTU documentation: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/network_mtu.html
- Azure VM MTU documentation: https://learn.microsoft.com/en-us/azure/virtual-network/how-to-virtual-machine-mtu
- Flannel configuration docs: https://raw.githubusercontent.com/flannel-io/flannel/master/Documentation/configuration.md
- Flannel backend docs: https://raw.githubusercontent.com/flannel-io/flannel/master/Documentation/backends.md
- Flannel CNI plugin README: https://raw.githubusercontent.com/flannel-io/cni-plugin/master/README.md
- Calico MTU guidance: https://docs.tigera.io/calico/latest/networking/configuring/mtu
- Calico Felix configuration reference: https://docs.tigera.io/calico/latest/reference/felix/configuration
- Weave Net Kubernetes addon docs: https://rajch.github.io/weave/kubernetes/kube-addon.html

## Issues Found
- The `alpine` PMTU test commands were incorrect as written. Alpine uses BusyBox `ping` by default, and BusyBox does not support `ping -M do`. I changed the examples to install `iputils` before running PMTU tests, and similarly installed `iproute2` for the `ip` examples.
- The Docker bridge verification command was incorrect. `docker network inspect bridge | grep Mtu` was brittle and did not match the documented option name. I changed verification of the default bridge MTU to `ip link show docker0 | grep mtu`, and changed custom-network verification to `docker network inspect ... --format '{{json .Options}}'`.
- The post overstated the scope of Docker's daemon-level `mtu` setting. Docker documents `mtu` as the MTU for the default `bridge` network, not all future user-defined bridge networks. I corrected the section heading, comments, and conclusion to distinguish the default bridge from user-defined networks.
- The MTU explanation for AWS was too broad. AWS supports jumbo frames for supported in-VPC paths, but internet gateways and VPN paths are limited to 1500-byte MTU. I corrected the AWS example accordingly.
- The WireGuard overhead statement was too broad. I replaced the blanket `~80 bytes` claim with a concrete and accurate example based on a host WireGuard interface already set to MTU 1420.
- The Flannel namespace was outdated. Current Flannel manifests place `kube-flannel-cfg` in the `kube-flannel` namespace, not `kube-system`. I updated the command.
- The Compose example used the obsolete top-level `version` field. Current Docker Compose treats that field as informational and warns that it is obsolete. I removed it.
- The verification download URL was only a placeholder and would not work as written. I replaced it with a real downloadable test file URL.

## Review Notes
- Calico can auto-detect MTU in current releases; explicit `FELIX_*MTU` overrides are still valid when you need to pin values.
- Flannel can auto-calculate MTU; the documented backend `MTU` override remains valid for VXLAN when auto-calculation is not appropriate.
