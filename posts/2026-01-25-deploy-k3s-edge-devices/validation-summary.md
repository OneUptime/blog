# Validation Summary: How to Deploy K3s on Edge Devices

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- K3s
- Kubernetes
- Raspberry Pi / ARM edge devices
- K3s air-gap installation
- Kubernetes Deployments and DaemonSets
- Prometheus node-exporter
- Rancher system-upgrade-controller

## Sources Consulted
- K3s Requirements: https://docs.k3s.io/installation/requirements
- K3s Configuration Options: https://docs.k3s.io/installation/configuration
- K3s Air-Gap Install: https://docs.k3s.io/installation/airgap
- K3s Automated Upgrades: https://docs.k3s.io/upgrades/automated
- Kubernetes Labels and Selectors: https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/
- K3s GitHub releases for referenced assets: https://github.com/k3s-io/k3s/releases

## Issues Found
- The post stated that K3s generally runs on devices with 512MB RAM. Current K3s requirements list 512MB RAM for agent nodes, but server nodes require at least 2 CPU cores and 2GB RAM. Updated the resource claims and prerequisites to distinguish server and agent requirements.
- The prerequisites listed only 200MB disk space. K3s documentation does not publish that as a supported minimum and recommends SSD storage where possible, especially for Raspberry Pi and ARM devices. Replaced the exact disk minimum with a requirement for sufficient disk space for K3s, images, and workloads.
- Several examples used the custom label `node.kubernetes.io/edge`. Kubernetes reserves the `kubernetes.io/` and `k8s.io/` prefixes for core components. Replaced custom edge labels/selectors with `edge.oneuptime.com/...` labels.
- The air-gap install example extracted the K3s air-gap image archive. K3s documentation says to place the archive itself in `/var/lib/rancher/k3s/agent/images/` so K3s can import it. Updated the commands to copy the archive into that directory.
- The air-gap install example still piped `https://get.k3s.io` on the target edge device. Updated the flow to download `install.sh` on the connected machine, transfer it, and run it locally with `INSTALL_K3S_SKIP_DOWNLOAD=true`.
- The system-upgrade-controller `Plan` omitted fields used by the official K3s examples, including `serviceAccountName` and the `upgrade.image`. Added `serviceAccountName: system-upgrade`, `upgrade.image: rancher/k3s-upgrade`, and `cordon: true` while keeping the edge-specific selector.

## Review Notes
The referenced historical K3s release asset URLs for `v1.28.4+k3s1` and `v1.29.0+k3s1` were checked and still resolve. The post remains version-specific in the air-gap and manual upgrade examples; future updates should refresh the sample versions to a currently supported K3s minor release.
