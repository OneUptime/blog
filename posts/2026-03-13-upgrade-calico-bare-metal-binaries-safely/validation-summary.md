# Validation Summary: How to Upgrade Calico on Bare Metal with Binaries Safely

## Status
validated

## Post Type
Tutorial / operational guide

## Technologies Covered
- Calico Open Source
- Kubernetes
- CNI plugins
- calicoctl
- Docker images and binary extraction
- systemd service management

## Sources Consulted
- Calico documentation: Install calicoctl - https://docs.tigera.io/calico/latest/operations/calicoctl/install
- Calico documentation: calicoctl node status - https://docs.tigera.io/calico/latest/reference/calicoctl/node/status
- Calico documentation: Binary install with package manager - https://docs.tigera.io/calico/latest/getting-started/bare-metal/installation/binary-mgr
- Calico documentation: Install CNI plugin - https://docs.tigera.io/calico/latest/getting-started/kubernetes/hardway/install-cni-plugin
- Calico documentation: Install calico/node - https://docs.tigera.io/calico/latest/getting-started/kubernetes/hardway/install-node
- Project Calico v3.27.0 GitHub release API - https://api.github.com/repos/projectcalico/calico/releases/tags/v3.27.0
- Project Calico v3.27.0 manifest - https://raw.githubusercontent.com/projectcalico/calico/v3.27.0/manifests/calico.yaml

## Issues Found
- The download commands used nonexistent v3.27.0 release assets: `calico-node-amd64`, `calico-cni-amd64`, and `calico-ipam-amd64` under `projectcalico/calico`. The official v3.27.0 GitHub release does not publish those assets, and direct URL checks returned 404. Replaced the commands with extraction from the official `docker.io/calico/node:v3.27.0` and `docker.io/calico/cni:v3.27.0` images, matching the images used by the official v3.27.0 Calico manifest.
- The CNI plugin binary name was incorrect as `calico-cni-amd64`. Calico's CNI plugin binary is installed as `calico`, with `calico-ipam` for IPAM. Updated the extraction and copy commands to produce `/tmp/calico-cni-new` from `/opt/cni/bin/calico` and `/tmp/calico-ipam-new` from `/opt/cni/bin/calico-ipam`.
- The verification command used `calicoctl node status` without elevated privileges. Official Calico documentation shows `sudo calicoctl node status` because the command checks the local Calico node instance and BGP state. Updated the command to use `sudo`.

## Review Notes
Calico v3.27.0 is no longer the latest Calico version as of this review, but the post is explicitly versioned and the corrected examples are valid for the referenced v3.27.0 artifacts. The guide assumes a custom host-level `calico-node` systemd service; most Kubernetes Calico installs run `calico/node` as a DaemonSet or are operator-managed, so operators should confirm their installation model before applying this procedure.
