# Validation Summary: How to Deploy Portainer on Vultr Cloud - Part 2

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Portainer CE
- Docker Engine
- Vultr Cloud Compute
- Vultr CLI
- Vultr Firewall
- Vultr Block Storage
- Vultr DNS and API
- Ubuntu 22.04 LTS
- Bash

## Sources Consulted
- Portainer Docker standalone install docs: https://docs.portainer.io/start/install-ce/server/docker/linux
- Docker Engine install docs for Ubuntu: https://docs.docker.com/engine/install/ubuntu/
- Vultr CLI reference: https://docs.vultr.com/reference/vultr-cli
- Vultr CLI instance create reference: https://docs.vultr.com/reference/vultr-cli/instance/create
- Vultr CLI firewall group create reference: https://docs.vultr.com/reference/vultr-cli/firewall/group/create
- Vultr CLI firewall rule create reference: https://docs.vultr.com/reference/vultr-cli/firewall/rule/create
- Vultr CLI instance update-firewall-group reference: https://docs.vultr.com/reference/vultr-cli/instance/update-firewall-group
- Vultr CLI block-storage create reference: https://docs.vultr.com/reference/vultr-cli/block-storage/create
- Vultr block storage attach guide: https://docs.vultr.com/products/cloud-storage/block-storage/management/attach-instances
- Vultr DNS provisioning guide: https://docs.vultr.com/products/network/dns/provisioning
- Vultr DNS record management guide: https://docs.vultr.com/products/network/dns/management/manage-records
- Vultr API reference: https://www.vultr.com/api/
- Vultr pricing page: https://www.vultr.com/pricing/
- Vultr block storage cross-region support note: https://docs.vultr.com/support/products/storage/can-i-attach-and-mount-a-vultr-block-storage-volume-to-a-vultr-compute-instance-in-a-different-region
- Official `vultr-cli` repository and source: https://github.com/vultr/vultr-cli

## Issues Found
- The post installed `vultr-cli` with `go install github.com/vultr/vultr-cli/v2@latest`, which is outdated, and then immediately assumed the binary was already on `PATH`. I changed it to the current `v3` module path used by the official repository and added a `PATH` export so the subsequent `vultr-cli` commands resolve correctly.
- The Vultr CLI path only provisioned a server and did not actually deploy Portainer. I added startup script creation and passed the resulting `--script-id` to `vultr-cli instance create` so Option 2 now performs a Portainer deployment.
- The instance creation example used a hard-coded OS ID and the invalid `--notify-activate` flag. I replaced this with a current OS lookup step and the supported `--notify=true` flag.
- The firewall commands used incorrect CLI syntax for rule creation and firewall attachment. I updated rule creation to pass the firewall group ID as the command argument and changed the instance command to `update-firewall-group`.
- The post extracted created resource IDs with `grep` against default CLI output. I changed these commands to use official JSON output plus `jq`, which matches the current CLI output format.
- The firewall section opened port `443`, but the post only deploys Portainer on `9443` and does not configure a reverse proxy on `443`. I removed the unused `443` rule.
- The startup scripts assumed `curl` was already installed and used `portainer/portainer-ce:latest`. I added `apt-get install -y curl`, ensured Docker is started, and changed the image tag to `portainer/portainer-ce:sts` to match current Portainer installation guidance.
- The block storage section mounted a volume but never connected that mounted path to Portainer’s `/data` directory. I added a migration step from the Docker volume to the mounted block storage and recreated the Portainer container with `/mnt/portainer-data:/data`.
- The DNS section comment said it was creating a DNS record, but the first API call creates the DNS domain/zone. I corrected the wording and aligned the example with Vultr’s documented domain creation payload by including the server IP.
- The size pricing in the control panel section was stale. I updated the Regular Performance pricing to match the current Vultr pricing page as checked on 2026-04-24.
- The conclusion implied Vultr block storage is useful for migrations across regions. Vultr documents block storage as region-specific, so I changed the wording to same-region replacement and migration scenarios.
- The prerequisites did not mention `Go` or `jq`, both of which are required by the CLI example as written. I added them to the prerequisites.

## Review Notes
- Docker still documents the convenience install script, but it recommends the apt repository for longer-term managed installations. The blog’s startup-script approach is technically workable, but a future revision could switch to the repository method for stricter production guidance.
- Portainer’s tunnel port `8000` is optional and primarily needed for Edge agent features. The post keeps it in the container run command, but only opens `9443` in the Vultr firewall, which is consistent with the UI-focused setup described here.
- Ubuntu 22.04 LTS remains supported by Docker, so the OS choice itself did not require a change.
