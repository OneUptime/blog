# Validation Summary: How to Install K3s on Raspberry Pi

## Status
validated

## Post Type
Tutorial / installation guide

## Technologies Covered
- K3s
- Kubernetes
- Raspberry Pi OS
- Raspberry Pi hardware and boot configuration
- NetworkManager / nmcli
- systemd
- Helm
- OneUptime Kubernetes Agent
- OpenTelemetry Collector

## Sources Consulted
- K3s Quick-Start Guide: https://docs.k3s.io/quick-start
- K3s Installation Requirements: https://docs.k3s.io/installation/requirements
- K3s Configuration Options: https://docs.k3s.io/installation/configuration
- K3s Packaged Components: https://docs.k3s.io/installation/packaged-components
- K3s Networking Services: https://docs.k3s.io/networking/networking-services
- K3s Cluster Datastore: https://docs.k3s.io/datastore
- K3s High Availability Embedded etcd: https://docs.k3s.io/datastore/ha-embedded
- K3s Manual Upgrades: https://docs.k3s.io/upgrades/manual
- Kubernetes Swap Memory Management: https://kubernetes.io/docs/concepts/cluster-administration/swap-memory-management/
- Raspberry Pi Configuration Documentation: https://www.raspberrypi.com/documentation/computers/configuration.html
- Raspberry Pi OS Documentation: https://www.raspberrypi.com/documentation/computers/os.html
- OneUptime Kubernetes Agent Documentation: https://oneuptime.com/docs/en/telemetry/kubernetes-agent

## Issues Found
- The static IP instructions used `/etc/dhcpcd.conf`, which is outdated for Raspberry Pi OS Bookworm and newer. Replaced it with DHCP reservation guidance and `nmcli` commands for device-side static IP configuration.
- The swap section described swap as a blanket Kubernetes incompatibility. Updated the wording to match current Kubernetes behavior: Linux nodes can use swap when explicitly configured, but the kubelet does not start with swap enabled by default.
- The swap cleanup command used `rm /var/swap`, which can fail if the file is already absent. Changed it to `rm -f /var/swap`.
- The external datastore example described the default as embedded etcd and used awkward quoting inside `INSTALL_K3S_EXEC`. Updated it to describe the default SQLite datastore and pass the PostgreSQL datastore endpoint without nested shell quotes.
- The memory optimization section told readers to edit the generated systemd unit directly for kubelet reservation flags. Updated it to use `/etc/rancher/k3s/config.yaml`, which K3s documents as the stable configuration file path.
- The SSD boot instructions recommended `sudo rpi-update`, which Raspberry Pi documentation reserves for engineering/testing use. Replaced it with routine APT update guidance.
- The alternate `KUBECONFIG` example exported `~/.kube/pi-cluster-config` without first creating that file. Added a copy step so the command sequence is complete.
- The OneUptime Helm example used the wrong repository URL, chart name, and values. Updated it to the documented `oneuptime/kubernetes-agent` chart with `oneuptime.url`, `oneuptime.apiKey`, namespace creation, and `clusterName`.
- The K3s update best-practice command omitted existing install arguments, which K3s warns can be lost when rerunning the installer. Updated the command to preserve existing environment and arguments.

## Review Notes
The remaining examples are broadly accurate for a single-server K3s cluster with Raspberry Pi worker nodes. Future improvements could add an explicit note that high-availability K3s control planes require multiple server nodes and embedded etcd or an external datastore, while the three-node topology shown here is one server plus two agents.
