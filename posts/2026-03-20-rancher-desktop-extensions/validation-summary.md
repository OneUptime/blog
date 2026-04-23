# Validation Summary: How to Enable Extensions in Rancher Desktop

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher Desktop
- `rdctl`
- Kubernetes / `kubectl`
- k3s
- `nerdctl`
- Docker / Moby
- Helm

## Sources Consulted
- Rancher Desktop Introduction: https://docs.rancherdesktop.io/
- Rancher Desktop Installation requirements: https://docs.rancherdesktop.io/getting-started/installation/
- Rancher Desktop `rdctl` command reference: https://docs.rancherdesktop.io/references/rdctl-command-reference/
- Rancher Desktop Kubernetes preferences: https://docs.rancherdesktop.io/ui/preferences/kubernetes/
- Rancher Desktop VM hardware preferences: https://docs.rancherdesktop.io/ui/preferences/virtual-machine/hardware/
- Rancher Desktop Extensions UI: https://docs.rancherdesktop.io/ui/extensions/
- Installing and uninstalling Rancher Desktop extensions: https://docs.rancherdesktop.io/how-to-guides/installing-uninstalling-extensions/
- Rancher Desktop v1.21.0 release notes (`rdctl info --field ip-address`): https://github.com/rancher-sandbox/rancher-desktop/releases/tag/v1.21.0
- Bitnami Charts repository: https://github.com/bitnami/charts
- Bitnami NGINX chart: https://artifacthub.io/packages/helm/bitnami/nginx

## Issues Found
- The title, tags, description, introduction, and conclusion claimed the post was about Rancher Desktop extensions, but the body was actually a general Rancher Desktop setup and usage guide. I corrected the metadata and surrounding copy to match the technical content that is present.
- The prerequisites overstated some requirements. Rancher Desktop officially recommends 8 GB RAM and 4 CPU, rather than requiring them across all platforms, and virtualization support is an actual cross-platform requirement. I updated the prerequisites accordingly.
- The `rdctl set --kubernetes-version v1.28.0` and `rdctl set --kubernetes-version v1.29.0` examples used a hard-coded, stale version format with a leading `v`. I changed them to version-agnostic `<supported-version>` examples.
- `rdctl status` is not part of the current official `rdctl` command set. I replaced it with `rdctl info`, which is the documented command for Rancher Desktop runtime information.
- `rdctl list-settings | grep kubernetesVersion` does not list available Kubernetes versions and does not match the current JSON structure returned by `rdctl list-settings`. I replaced it with `rdctl list-settings` and updated the comment to reflect what the command actually does.
- The troubleshooting block listed manual log paths and had a formatting error where the Windows and Linux paths were merged. The latest Rancher Desktop docs document log access through the UI's `Troubleshooting -> Show Logs`, so I replaced the stale path guidance with the documented workflow.
- `rdctl list-settings | grep -i vm` does not check VM status. I replaced it with `rdctl info --field ip-address`, which is a documented way to confirm Rancher Desktop is running and exposing VM information.
- The container workflow mixed `nerdctl` and `docker` in a way that could mislead readers about runtime-specific commands. I added the matching `docker` alternatives for run/list/log/stop/remove commands so the examples align with the selected container engine.

## Review Notes
- Rancher Desktop's latest docs still show a mix of legacy `rdctl set --container-engine` examples and newer dotted setting names such as `--container-engine.name`; the post was kept on currently documented, broadly compatible command forms where possible.
- The directory slug still references `rancher-desktop-extensions`, but the corrected article content is a general Rancher Desktop guide rather than an extensions tutorial.
