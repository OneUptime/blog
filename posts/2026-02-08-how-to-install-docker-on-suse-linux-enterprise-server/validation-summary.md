# Validation Summary: How to Install Docker on SUSE Linux Enterprise Server

## Status
validated

## Post Type
Tutorial / installation guide

## Technologies Covered
- SUSE Linux Enterprise Server 15 SP4+
- SUSEConnect and SLE Containers Module
- zypper package management
- Docker Open Source Engine / Docker Engine
- Docker daemon configuration
- Docker storage drivers
- systemd service drop-ins
- firewalld / SuSEfirewall2
- SUSE Container Registry
- Docker Registry

## Sources Consulted
- SUSE Container Guide: https://documentation.suse.com/en-us/container/all/html/Container-guide/index.html
- SUSE SLES 15 SP4 Modules and Extensions Quick Start: https://documentation.suse.com/en-us/sles/15-SP4/html/SLES-all/article-modules.html
- SUSE SLES 15 SP6 Modules and Extensions Quick Start: https://documentation.suse.com/en-us/sles/15-SP6/html/SLES-all/article-modules.html
- SUSE Package Hub docker-compose package page: https://packagehub.suse.com/packages/docker-compose/
- Docker Engine installation overview: https://docs.docker.com/engine/install/
- Docker daemon configuration overview: https://docs.docker.com/engine/daemon/
- Docker daemon proxy configuration: https://docs.docker.com/engine/daemon/proxy/
- Docker live restore documentation: https://docs.docker.com/engine/daemon/live-restore/
- Docker storage driver selection documentation: https://docs.docker.com/engine/storage/drivers/select-storage-driver/
- Docker Btrfs storage driver documentation: https://docs.docker.com/engine/storage/drivers/btrfs-driver/
- Docker Prometheus metrics documentation: https://docs.docker.com/engine/daemon/prometheus/
- Docker SLES repository index: https://download.docker.com/linux/sles/
- SUSE Container Registry image page for SLE 15: https://registry.suse.com/repositories/suse-sle15

## Issues Found
- The install command installed `docker docker-compose` from the Containers Module. SUSE's SLES container guide documents installing the `docker` package from the Containers Module, while `docker-compose` is published separately through SUSE Package Hub for SLES 15 service packs. Changed the primary install command to `sudo zypper install -y docker` and added a note that Compose requires SUSE Package Hub.
- The prerequisites referred to "a SUSE Package Hub mirror" as though Package Hub were required for Docker itself. Changed this to mirrored SUSE repositories, since Docker comes from the Containers Module.
- The non-root access section used `groupadd docker`, which fails if the group already exists. SUSE documents that the docker group is created during package installation, so the command was changed to `groupadd -f docker`.
- The Docker CE section implied that Docker CE is simply installable from Docker's repository and only loses SUSE coverage. Docker's current installation overview does not provide a supported SLES installation procedure, so the text now tells readers to check Docker's current support and repository availability first.
- The daemon configuration recommended `live-restore` for production. Docker supports the option upstream, but SUSE's container guide says SUSE does not support this feature for Docker Open Source Engine updates. Removed it from the SLES-focused daemon configuration and replaced the explanation with storage-driver guidance.
- The generic daemon and metrics examples forced `overlay2`, which can conflict with the later Btrfs guidance and SLES defaults. Removed that setting from the generic examples and kept storage-driver configuration in the dedicated section.
- The Btrfs daemon example overwrote all prior daemon settings. Expanded it to retain the logging configuration while changing the storage driver.
- The proxy verification command used `docker info | grep -i proxy`. Docker's daemon proxy documentation verifies systemd drop-in environment loading with `systemctl show --property=Environment docker`, so the verification command was changed accordingly.

## Review Notes
The Docker CE zypper repo URL currently resolves to a Docker repository file for SLES 15, but Docker's official install overview still does not list a supported SLES installation procedure. The post now preserves the optional command while making the support caveat explicit.
