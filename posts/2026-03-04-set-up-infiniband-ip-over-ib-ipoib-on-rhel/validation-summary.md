# Validation Summary: How to Set Up InfiniBand IP over IB (IPoIB) on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux
- InfiniBand
- IP over InfiniBand (IPoIB)
- NetworkManager and nmcli
- P_Key partitions
- Linux networking tools
- iperf3

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Configuring an IPoIB connection by using nmcli": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_infiniband_and_rdma_networks/configuring-ipoib_configuring-infiniband-and-rdma-networks
- NetworkManager nm-settings-nmcli reference, InfiniBand settings: https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/nm-settings-nmcli.html
- NetworkManager API reference, InfiniBand settings: https://www.networkmanager.dev/docs/api/latest/settings-infiniband.html
- Linux kernel documentation, "IP over InfiniBand": https://www.kernel.org/doc/html/v6.6/infiniband/ipoib.html
- Local nmcli version/help check: `nmcli --version` reported NetworkManager 1.46.0

## Issues Found
- The connected-mode MTU example used `802-3-ethernet.mtu 65520`. That setting belongs to Ethernet profiles, not InfiniBand profiles. Changed it to `infiniband.mtu 65520`, which matches NetworkManager's InfiniBand settings and Red Hat's IPoIB examples.

## Review Notes
- The datagram and connected mode descriptions match the Linux kernel IPoIB documentation. Datagram mode MTU depends on the InfiniBand link-layer MTU; the documented 2044-byte value is correct for a typical 2K InfiniBand MTU.
- Red Hat's RHEL 9 documentation shows `nmcli connection add type infiniband ... transport-mode Connected mtu 65520`; the post's explicit `infiniband.transport-mode connected` and corrected `infiniband.mtu 65520` properties are consistent with NetworkManager's documented property names and accepted values.
- The P_Key child interface example is consistent with NetworkManager's `infiniband.parent` and `infiniband.p-key` settings. NetworkManager documents that a P_Key interface name is based on the parent and P_Key.
