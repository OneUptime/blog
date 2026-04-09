# Validation Summary: How to Install the kubectl Plugin for Rook

## Status
validated

## Post Type
Tutorial / Installation Guide

## Technologies Covered
- Rook (Kubernetes storage orchestrator)
- Ceph (distributed storage system)
- kubectl-rook-ceph plugin
- Krew (kubectl plugin manager)
- Kubernetes

## Sources Consulted
- kubectl-rook-ceph GitHub repository: https://github.com/rook/kubectl-rook-ceph
- kubectl-rook-ceph GitHub releases: https://github.com/rook/kubectl-rook-ceph/releases
- Krew documentation: https://krew.sigs.k8s.io/
- Rook documentation: https://rook.io/docs/rook/latest/

## Issues Found

1. **Plugin version v0.4.0 has no binary release assets**: The manual installation section referenced v0.4.0, which is a real Git tag but has zero downloadable binary artifacts. Binary release tarballs only started appearing from v0.5.0 onward. The `curl` command would 404. **Fixed**: Updated version to v0.9.6 (latest release with binary assets).

2. **Release artifact filename pattern was incorrect**: The tarball filenames include the version string (e.g., `kubectl-rook-ceph_v0.9.6_linux_amd64.tar.gz`), but the post omitted the version from the filename. **Fixed**: Updated the `curl` and `tar` commands to include `${PLUGIN_VERSION}` in the filename.

3. **`kubectl rook-ceph version` is not a valid command**: There is no top-level `version` subcommand. The correct command to check the version is `kubectl rook-ceph rook version` (under the `rook` subcommand). **Fixed**: Updated the verification command.

4. **"Access the Rados Gateway" label was incorrect**: The command `kubectl rook-ceph rbd ls replicapool` lists RBD (RADOS Block Device) images in a pool. It has nothing to do with the Rados Gateway (RGW), which is the S3/Swift-compatible object storage interface. **Fixed**: Changed the label to "List RBD images in a pool".

5. **`kubectl rook-ceph debug deploy-toolbox` does not exist**: There is no `deploy-toolbox` subcommand in the plugin. The `debug` subcommand (renamed to `maintenance` in later versions) only supports `start` and `stop` for scaling down deployments for advanced maintenance. The Rook toolbox is deployed via a CephCluster CR or a separate manifest, not through this plugin. **Fixed**: Removed the non-existent command from the debugging section.

## Review Notes
- The Krew installation script is the standard one from the Krew documentation and is correct.
- The `-n` namespace flag usage is correct; the plugin supports both `-n`/`--namespace` for the CephCluster namespace and `-o`/`--operator-namespace` for the operator namespace.
- The `debug` subcommand referenced in the post has been renamed to `maintenance` in current versions. The remaining debug commands in the post (`operator restart`, `ceph osd status`) use different subcommands and remain correct.
- The plugin version (v0.9.6) will eventually become outdated; readers should check the releases page for the latest version.
