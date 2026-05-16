# Validation Summary: How to Upgrade Talos Linux in Air-Gapped Environments

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- Kubernetes
- Air-gapped image mirroring
- Container registries
- `talosctl`
- `crane`
- `skopeo`
- Talos Image Factory
- Talos machine configuration registry mirrors

## Sources Consulted
- Talos v1.7 CLI reference: https://docs.siderolabs.com/talos/v1.7/reference/cli
- Talos latest CLI reference: https://docs.siderolabs.com/talos/latest/reference/cli
- Talos upgrading guide: https://www.talos.dev/latest/talos-guides/upgrading-talos/
- Talos machine configuration reference: https://docs.siderolabs.com/talos/v1.13/reference/configuration/v1alpha1/config
- Talos boot assets / Image Factory guide: https://www.talos.dev/latest/talos-guides/install/boot-assets/
- Talos Image Factory reference: https://www.talos.dev/v1.9/learn-more/image-factory/
- Talos system extensions guide: https://www.talos.dev/v1.9/talos-guides/configuration/system-extensions/
- Talos v1.7.0 release notes and image list: https://github.com/siderolabs/talos/discussions/8621
- go-containerregistry `crane` command documentation: https://github.com/google/go-containerregistry/blob/main/cmd/crane/doc/crane.md

## Issues Found
- The post used `talosctl images --kubernetes-version 1.30.0`, which does not match the Talos v1.7 CLI and is not the current documented command form. Replaced it with `talosctl image default`, plus current `talosctl image k8s-bundle --k8s-version v1.30.0` and `talosctl image talos-bundle v1.7.0` examples.
- The example v1.7.0 image list had incorrect or incomplete defaults. Updated etcd to `gcr.io/etcd-development/etcd:v3.5.13`, Flannel to `ghcr.io/siderolabs/flannel:v0.25.1`, and added the default kubelet, pause, and install-cni images from the v1.7.0 release notes.
- The self-signed registry CA example showed a PEM block, but Talos registry `tls.ca` expects a base64-encoded certificate value. Replaced it with a base64-encoded placeholder.
- The custom Image Factory installer example used an invalid image reference with two tag separators: `ghcr.io/siderolabs/installer:<custom-hash>:v1.7.0`. Replaced it with the documented Image Factory registry format: `factory.talos.dev/installer/<schematic-id>:v1.7.0`.

## Review Notes
The guide is technically relevant and mostly accurate after the fixes. The specific image versions are tied to Talos v1.7.0 and Kubernetes v1.30.0, so future readers should regenerate the image list from the release notes or `talosctl` for their exact target Talos and Kubernetes versions.
