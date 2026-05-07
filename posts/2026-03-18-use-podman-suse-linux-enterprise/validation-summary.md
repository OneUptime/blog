# Validation Summary: How to Use Podman on SUSE Linux Enterprise

## Status
validated

## Post Type
Guide

## Technologies Covered
- Podman
- SUSE Linux Enterprise Server (SLES)
- openSUSE Tumbleweed
- Buildah
- Skopeo
- Quadlet / systemd
- AppArmor
- PostgreSQL containers
- NGINX containers
- SUSE Base Container Images (BCI)

## Sources Consulted
- SUSE Container Guide: https://documentation.suse.com/en-us/container/all/html/Container-guide/index.html
- SLES 15 SP7 Modules and Extensions Quick Start: https://documentation.suse.com/en-us/sles/15-SP7/html/SLES-all/article-modules.html
- SLES 15 SP2 Release Notes: https://documentation.suse.com/releasenotes/sles/15-SP2/
- Running Podman in Rootless Mode on SLES 15 SP7: https://documentation.suse.com/smart/container/html/rootless-podman/rootless-podman.html
- Podman Quadlet reference (`podman-systemd.unit`): https://docs.podman.io/en/latest/markdown/podman-systemd.unit.5.html
- Podman auto-update reference: https://docs.podman.io/en/stable/markdown/podman-auto-update.1.html
- SUSE BCI 15 SP7 base image page: https://registry.suse.com/repositories/bci-bci-base-15sp7
- SUSE BCI Python 3.11 image page: https://registry.suse.com/repositories/bci-python311
- SUSE BCI Node.js 22 image page: https://registry.suse.com/repositories/bci-nodejs22
- openSUSE Software package metadata for `python-podman-compose`: https://software.opensuse.org/package/python-podman-compose
- Docker Official Image docs for PostgreSQL: https://github.com/docker-library/docs/blob/master/postgres/README.md

## Issues Found
- The introduction incorrectly said Podman replaced Docker in SLES 15 SP3 and later. I corrected this to match SUSE documentation: Podman has been supported since SLES 15 SP2 and is the recommended runtime for current SLES releases.
- The SLES installation section hard-coded a 15.5 Containers Module activation command while claiming applicability to SP4 and later. I corrected the text to explain that the module string is service-pack-specific and updated the example to the current SLES 15 SP7 `SUSEConnect` value.
- The package install examples included `podman-compose`, which is not consistently provided under that package name in current official/openSUSE package metadata and was not used elsewhere in the article. I removed it from the install commands.
- The openSUSE note broadly claimed both Leap and Tumbleweed ship Podman in the default repositories. I narrowed that statement to openSUSE Tumbleweed to avoid over-claiming current Leap package availability.
- Several SUSE BCI image references were outdated or incorrect. I updated them from `registry.suse.com/bci/bci-python:3.11` and `registry.suse.com/bci/bci-nodejs:20` to the current documented image names `registry.suse.com/bci/python:3.11` and `registry.suse.com/bci/nodejs:22`, and changed the base image examples to `registry.suse.com/bci/bci-base:15.7`.
- The AppArmor example used `apparmor=container-default`, which is not a guaranteed built-in profile name for Podman on SLES. I changed it to a generic host-loaded profile placeholder that matches Podman’s documented usage.
- The Quadlet example created a `.network` unit but did not attach the container to it. I fixed the `.container` file to use `Network=enterprise.network` and removed the conflicting `NetworkName=` override so the example works with Quadlet’s documented dependency behavior.
- The Quadlet container image path used `registry.suse.com/my-org/...`, which incorrectly implied a user-managed application image would live in SUSE’s public registry namespace. I changed it to the standard placeholder domain `registry.example.com`.
- The pod example configured the application to connect to the `erp` database, but the PostgreSQL container never created that database. I added `POSTGRES_DB=erp` so the example matches the connection string.
- The storage section said the shown `storage.conf` snippet configured overlay storage “with native diff,” which the snippet does not establish. I corrected the wording to describe it as explicit overlay configuration instead.
- The rootless section omitted the need to restart the user session after changing `subuid` and `subgid` mappings. I added that note based on SUSE’s rootless Podman guidance.

## Review Notes
- The guide now reflects current examples as of 2026-05-07, including SLES 15 SP7 module activation and SUSE Node.js 22 BCI usage. These version-specific commands and tags should be revalidated as new SLES service packs and BCI image lines are released.
