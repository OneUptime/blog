# Validation Summary: How to Set Up Talos Linux on Akamai / Linode

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- Akamai Connected Cloud / Linode
- Linode CLI and Linode API
- Linode NodeBalancers
- Kubernetes
- Linode Cloud Controller Manager
- Linode Block Storage CSI Driver
- Helm
- Linode Cloud Firewalls

## Sources Consulted
- Talos Akamai platform guide: https://docs.siderolabs.com/talos/v1.13/platform-specific-installations/cloud-platforms/akamai
- Talos Image Factory documentation: https://www.talos.dev/v1.9/learn-more/image-factory/
- Talos MachineConfig reference: https://docs.siderolabs.com/talos/v1.11/reference/configuration/v1alpha1/config
- Akamai Images documentation: https://techdocs.akamai.com/cloud-computing/docs/images
- Akamai Upload an Image API reference: https://techdocs.akamai.com/linode-api/reference/upload-an-image
- Akamai NodeBalancers documentation: https://techdocs.akamai.com/cloud-computing/docs/nodebalancer
- Akamai NodeBalancer API guide: https://techdocs.akamai.com/cloud-computing/docs/configure-nodebalancers-with-the-api
- Linode Cloud Controller Manager requirements and Helm installation: https://linode.github.io/linode-cloud-controller-manager/docs/getting-started/requirements.html and https://linode.github.io/linode-cloud-controller-manager/docs/getting-started/helm-installation.html
- Linode Block Storage CSI Driver deployment documentation: https://github.com/linode/linode-blockstorage-csi-driver/blob/main/docs/deployment.md

## Issues Found
- The Talos disk image download used `nocloud-amd64.raw.xz` from the GitHub release URL, which does not match the official Akamai platform guide and returned 404 for Talos v1.9.0. Changed it to the Image Factory Akamai asset pattern, `akamai-amd64.raw.gz`.
- The decompression and recompression steps were unnecessary after switching to the Akamai Image Factory asset, which is already a gzip-compressed raw image. Removed those commands.
- Linode instances created from uploaded Talos images need to boot with the `linode/direct-disk` kernel. Added `--no-defaults` and `linode-cli linodes config-update ... --kernel "linode/direct-disk"` commands.
- The Talos configuration snippet only placed the NodeBalancer address under `machine.certSANs`. Added `cluster.apiServer.certSANs` for the Kubernetes API server certificate and enabled `cluster.externalCloudProvider` for Linode cloud integration.
- The Linode CSI section used a stale secret name and a manifest URL that now returns 404. Replaced it with the current Helm-based installation flow from the official Linode CSI documentation.
- The CSI section omitted the Linode Cloud Controller Manager dependency. Added CCM installation before the CSI driver.
- The prerequisites did not mention Helm even though the corrected Linode cloud integration commands use Helm. Added Helm to the prerequisites.
- The description called the deployment a managed Kubernetes cluster even though the article builds a self-managed Talos cluster on Linode instances. Updated the description to say self-managed.

## Review Notes
- Talos v1.9.0 is not the latest Talos release as of this review date, but the post is version-specific and the installer image reference remains valid for that version.
- The guide still uses placeholders for Linode IDs, config IDs, image IDs, IP addresses, and Image Factory schematic IDs; readers need to replace them with values from their environment.
