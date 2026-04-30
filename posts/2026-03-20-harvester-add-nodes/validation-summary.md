# Validation Summary: How to Add Nodes to Harvester Cluster

## Status
validated

## Post Type
Tutorial / operational guide

## Technologies Covered
- Harvester
- Kubernetes
- RKE2
- Longhorn
- KubeVirt
- etcd

## Sources Consulted
- Harvester ISO Installation: https://docs.harvesterhci.io/v1.7/install/
- Harvester Configuration: https://docs.harvesterhci.io/v1.7/install/harvester-configuration/
- Harvester Host Management: https://docs.harvesterhci.io/v1.7/host
- Harvester Installation Troubleshooting: https://docs.harvesterhci.io/v1.7/troubleshooting/index
- Harvester Management Address: https://docs.harvesterhci.io/v1.5/install/management-address/
- Harvester Hardware and Network Requirements: https://docs.harvesterhci.io/v1.3/install/requirements/
- RKE2 Token Management: https://docs.rke2.io/security/token
- Longhorn Replica Auto Balance: https://longhorn.io/docs/1.9.1/high-availability/auto-balance-replicas/
- Longhorn Settings Reference: https://longhorn.io/docs/latest/references/settings/
- Longhorn Multiple Disk Support: https://longhorn.io/docs/1.9.0/nodes-and-volumes/nodes/multidisk/
- KubeVirt Interfaces and Networks: https://kubevirt.io/user-guide/network/interfaces_and_networks/
- KubeVirt Node Assignment: https://kubevirt.io/user-guide/compute/node_assignment/
- KubeVirt Filesystems, Disks and Volumes: https://kubevirt.io/user-guide/storage/disks_and_volumes/

## Issues Found
- The cluster token command pointed at `/etc/rancher/rke2/join-token`, which is not the documented Harvester source for join configuration. I replaced it with the Harvester-documented token lookup from `/etc/rancher/rancherd/config.yaml`.
- The VIP and Harvester version lookup commands used incorrect resources and namespaces. I replaced them with the documented `ingress-expose` service annotation lookup and `settings.harvesterhci.io server-version`.
- The post hardcoded `v1.3.0` as the ISO example version. I changed it to a placeholder that explicitly tells readers to match the installed cluster version.
- The join walkthrough implied every new node automatically becomes an etcd/control-plane node. I corrected this to reflect Harvester node-role behavior and the need to select the appropriate role during installation.
- The unattended join YAML used an invalid schema, including unsupported `network` and `harvester` sections, misplaced `server_url` and `token`, and incorrect field names like `subnetMask` and `dnsNameservers`. I rewrote the snippet to match the documented Harvester configuration format.
- The Longhorn section claimed that existing data automatically rebalances onto the new node. I corrected this to note that Longhorn detects the node and default disk automatically, but replica rebalancing depends on the `Replica Auto Balance` setting.
- The Longhorn verification and disk-management commands referenced nonexistent resources such as `disks.longhorn.io` and `kubectl get disk`. I replaced them with the documented `node.longhorn.io` inspection and edit flow.
- The Harvester UI disk-management steps referred to a `Disks` tab. I corrected this to the documented `Storage` tab and added the required provisioner / force-format detail.
- The readiness validation used `grep Ready`, which can false-positive on `NotReady`. I replaced it with an exact status-column check.
- The KubeVirt example used the containerDisk image without an explicit tag. I updated it to `:latest`, matching the current KubeVirt documentation examples.

## Review Notes
- Harvester node-role behavior is version-sensitive, especially from v1.3.0 onward when role management was introduced.
- Harvester v1.3 documentation is EOL; the post now avoids hardcoding that version, but readers should still align all commands and images with the version already installed in their cluster.
- Longhorn behavior after adding capacity varies by cluster settings. In particular, automatic replica redistribution depends on global or per-volume `Replica Auto Balance` configuration.
