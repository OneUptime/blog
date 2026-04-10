# Validation Summary: How to Connect NVMe-oF Initiators to Ceph Storage

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- NVMe-oF (NVMe over Fabrics)
- nvme-cli (Linux NVMe management tool)
- Ceph (distributed storage)
- Rook (Ceph operator for Kubernetes)
- Linux kernel modules (nvme-fabrics, nvme-tcp, nvme-rdma)
- systemd (nvmf-autoconnect service)
- Kubernetes PersistentVolumes (local block device)

## Sources Consulted
- nvme-cli official documentation and man pages (https://github.com/linux-nvme/nvme-cli)
- Linux kernel NVMe-oF documentation (https://docs.kernel.org/nvme/index.html)
- NVMe-oF discovery.conf file format specification from nvme-cli
- Rook Ceph NVMe-oF gateway documentation (https://rook.io/docs/rook/latest/Storage-Configuration/NVMe-over-Fabrics/overview/)
- Kubernetes PersistentVolume documentation (https://kubernetes.io/docs/concepts/storage/persistent-volumes/)

## Issues Found
- **discovery.conf multi-line format**: The `/etc/nvme/discovery.conf` file had each parameter on its own line (`--transport=tcp`, `--traddr=10.0.1.10`, etc. on separate lines). In discovery.conf, each line is parsed as a separate discovery entry, so splitting parameters across lines creates multiple incomplete entries instead of one complete entry. Fixed by placing all parameters for the single discovery target on one line: `--transport=tcp --traddr=10.0.1.10 --trsvcid=4420 --reconnect-delay=10 --ctrl-loss-tmo=600`.

## Review Notes
- The Kubernetes PersistentVolume example does not include a `storageClassName` field. While the PV spec is valid without it, in practice a `storageClassName` is typically needed to match with PersistentVolumeClaims. This is a best-practice consideration rather than a technical error.
- The NQN format `nqn.2024-01.io.ceph:mysubsystem` follows the correct NQN naming convention (nqn.YYYY-MM.reverse-domain:identifier).
- Port 4420 is the IANA-assigned standard port for NVMe-oF discovery and connections.
- The `--ctrl-loss-tmo=600` (10 minutes) and `--reconnect-delay=10` (10 seconds) are reasonable default values for production use.
