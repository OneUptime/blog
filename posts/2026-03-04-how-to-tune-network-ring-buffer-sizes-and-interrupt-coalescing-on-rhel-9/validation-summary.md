# Validation Summary: How to Tune Network Ring Buffer Sizes and Interrupt Coalescing on RHEL 9

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Linux networking
- ethtool
- NetworkManager
- nmcli

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Configuring ethtool settings in NetworkManager connection profiles, https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_networking/configuring-ethtool-settings-in-networkmanager-connection-profiles_configuring-and-managing-networking
- Red Hat Enterprise Linux 9 documentation: Running dhclient exit hooks using NetworkManager a dispatcher script, https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_networking/assembly_running-dhclient-exit-hooks-using-networkmanager-a-dispatcher-script_configuring-and-managing-networking
- ethtool(8) manual page and `ethtool --help` output
- NetworkManager-dispatcher(8) manual page

## Issues Found
- The persistence example used a NetworkManager dispatcher script for ring buffer settings. RHEL 9 documentation states that NetworkManager can persist ethtool ring buffer settings directly in connection profiles, so the example was changed to use `nmcli connection modify ... ethtool.ring-rx ... ethtool.ring-tx ...` and reactivate the connection.
- The post implied that 4096 can always be used for RX/TX ring sizes. Added a note to use values at or below the `Pre-set maximums` reported by `ethtool -g`.
- The introduction and conclusion made absolute claims that tuning reduces overhead, improves throughput, and prevents drops. These were softened to "can reduce", "improve", and "help reduce" because results depend on NIC driver support, workload, and selected values.

## Review Notes
The `ethtool -g`, `ethtool -G`, `ethtool -c`, `ethtool -C`, and `ethtool -S` command forms and option names are valid. Specific coalescing and ring settings remain driver-dependent, so administrators should verify supported values on the target NIC before applying them.
