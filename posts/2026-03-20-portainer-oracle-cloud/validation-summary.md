# Validation Summary: How to Deploy Portainer on Oracle Cloud Free Tier - Part 2

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Oracle Cloud Infrastructure (OCI) Free Tier
- OCI Compute with Ampere A1 (`VM.Standard.A1.Flex`)
- OCI VCN Security Lists and Network Security Groups (NSGs)
- Ubuntu 22.04 on ARM64
- `iptables` / `netfilter-persistent`
- Docker Engine
- Portainer CE
- OCI Block Volume

## Sources Consulted
- Oracle Always Free Resources: https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm
- Oracle Cloud Infrastructure Platform Images: https://docs.oracle.com/en-us/iaas/Content/Compute/References/images.htm
- Oracle Cloud Infrastructure Security Lists: https://docs.oracle.com/en-us/iaas/Content/Network/Tasks/managingsecuritylists.htm
- Oracle Known Issues for Compute: https://docs.oracle.com/en-us/iaas/Content/Compute/known-issues.htm
- Oracle tutorial, Free Tier: Install Flask on an Ubuntu VM: https://docs.oracle.com/en-us/iaas/Content/developer/flask-on-ubuntu/01oci-ubuntu-flask-summary.htm
- OCI consistent device paths for block volumes: https://docs.oracle.com/en-us/iaas/Content/Block/References/consistentdevicepaths.htm
- OCI `/etc/fstab` options for block volumes using consistent device paths: https://docs.oracle.com/en-us/iaas/Content/Block/References/fstaboptionsconsistentdevicepaths.htm
- Docker Engine on Ubuntu: https://docs.docker.com/engine/install/ubuntu/
- Docker daemon configuration overview: https://docs.docker.com/engine/daemon/
- Portainer CE install with Docker on Linux (LTS): https://docs.portainer.io/2.33-lts/start/install-ce/server/docker/linux
- Portainer ARM architecture support FAQ: https://docs.portainer.io/faqs/installing/which-arm-architectures-does-portainer-support

## Issues Found
- The post specified the Ubuntu 22.04 minimal image for an Ampere A1 instance. Oracle's platform image documentation says Arm-based shapes should use the standard Ubuntu image, not Minimal Ubuntu. I updated Step 1 to use `Canonical Ubuntu 22.04` and the full `VM.Standard.A1.Flex` shape name.
- The post described Security Lists as OCI's VCN-level firewall mechanism. OCI supports both Security Lists and NSGs, and Security Lists are configured at the subnet level. I updated Step 2 to describe the walkthrough accurately.
- The Portainer install command used `portainer/portainer-ce:latest`. Current Portainer installation docs recommend the LTS tag. I updated the image reference to `portainer/portainer-ce:lts`.
- The block-volume section assumed `/dev/oracleoci/oraclevdb` without telling the reader to select a consistent device path during attachment, and it mounted the volume only for the current boot. I updated the instructions to select a device path and add an `/etc/fstab` entry with OCI-recommended options so the mount survives reboots.
- The block-volume section implied that changing Docker's `data-root` fully relocates Docker storage. Current Docker docs note that fresh Docker Engine installs can also store image and container layers under `/var/lib/containerd`. I updated the wording to scope the step to `/var/lib/docker` and note the containerd caveat.
- The architecture verification command used a Docker formatting example that I could not confirm in the current official CLI docs. I replaced it with a standard `uname -m` check and the expected `aarch64` output.
- I added a note to avoid changing UFW directly on OCI Ubuntu images, aligning the post with Oracle's Ubuntu known-issues guidance.

## Review Notes
- Docker's convenience install script is still valid and officially documented, but Docker recommends the apt-repository installation path for longer-lived or production-oriented hosts.
- Portainer port `8000` is optional and primarily used for Edge compute features; leaving it published matches Portainer's documented `docker run` example.
- No shell-syntax problems were found in the corrected command snippets.
