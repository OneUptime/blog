# Validation Summary: How to Configure Management Network in Harvester

## Status
validated

## Post Type
Guide

## Technologies Covered
- Harvester
- Kubernetes
- Linux networking
- NetworkManager / `nmcli`
- DNS
- NTP
- NIC bonding / LACP
- Longhorn

## Sources Consulted
- Harvester ISO Installation: https://docs.harvesterhci.io/v1.7/install/
- Harvester Configuration: https://docs.harvesterhci.io/v1.7/install/harvester-configuration/
- Update Harvester Configuration After Installation: https://docs.harvesterhci.io/v1.7/install/update-harvester-configuration/
- Harvester Host Management (`NTP Configuration`): https://docs.harvesterhci.io/v1.7/host/
- Harvester VM Network / Management Network: https://docs.harvesterhci.io/v1.7/networking/harvester-network/
- Harvester Settings (`storage-network`, `ntp-servers`): https://docs.harvesterhci.io/v1.7/advanced/index/
- Kubernetes API health endpoints: https://kubernetes.io/docs/reference/using-api/health-checks/

## Issues Found
- The post used an outdated Harvester configuration schema (`network`, `bonds`, `dnsNameservers`, `subnetMask`, and `harvester-mgmt`). I replaced it with the current `install.management_interface`, `os.dns_nameservers`, `os.ntp_servers`, and `subnet_mask` fields documented for current Harvester releases.
- The post referred to the management bond as `harvester-mgmt`, but current Harvester uses `mgmt-bo` for the bond and `mgmt-br` for the bridge. I corrected the interface references and the architecture diagram labels.
- The post claimed you can change a node management IP after installation by editing `ifcfg-*` files and reloading `wicked`. Current Harvester documentation states node IP changes are not supported during the life of a cluster. I removed the unsupported procedure and replaced it with accurate guidance.
- The DNS section used older `wicked`/`ifcfg-*` steps. Current Harvester v1.7 documentation uses `nmcli` and recommends restarting the `rke2-coredns` deployment after DNS changes. I updated the commands accordingly.
- The NTP section instructed readers to edit `/etc/chrony.conf` directly. Current Harvester documentation says to manage NTP through the `ntp-servers` setting and not by editing node-local NTP config files. I replaced the workflow with the supported cluster-wide setting approach and verification command.
- The health-check section used deprecated or outdated Kubernetes checks (`/healthz` and `kubectl get componentstatuses`). I replaced them with `kubectl get --raw='/readyz?verbose'` and `kubectl get nodes -o wide`.
- The LACP switch example configured the uplink as an access port. Harvester documentation requires switches connected to bonded NICs to be configured as trunk ports. I corrected the example.
- The introduction treated Longhorn traffic as always using the management network. Current Harvester docs allow a dedicated storage network, so I clarified that Longhorn uses the management network by default unless storage networking is configured.

## Review Notes
- The post is now aligned with current Harvester v1.7 documentation, which uses NetworkManager-based workflows for post-install network changes.
- Older Harvester releases used different management interface names and `wicked`-based workflows. Readers operating older clusters should use the version-matched Harvester documentation for those releases.
