# Validation Summary: How to Deploy Portainer on Linode/Akamai Cloud - Akamai Cloud

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Portainer Community Edition
- Docker Engine on Ubuntu 24.04 LTS
- Linode / Akamai Cloud compute instances
- Linode Cloud Firewalls
- Linode Block Storage
- Linode Backups
- Prometheus
- Grafana
- Prometheus Node Exporter
- Bash / Linux system administration

## Sources Consulted
- Akamai TechDocs: Getting started with the Linode CLI - https://techdocs.akamai.com/cloud-computing/docs/getting-started-with-the-linode-cli
- Akamai TechDocs: Create a Linode - https://techdocs.akamai.com/cloud-computing/docs/create-a-compute-instance
- Akamai TechDocs: Linode Cloud Firewalls - https://techdocs.akamai.com/cloud-computing/docs/cloud-firewall
- Akamai TechDocs: Apply firewall rules to a Linode, Linode Interface, or NodeBalancer - https://techdocs.akamai.com/cloud-computing/docs/apply-firewall-rules-to-a-service
- Akamai TechDocs: Manage Block Storage volumes with the Linode API - https://techdocs.akamai.com/cloud-computing/docs/manage-block-storage-volumes-with-the-api
- Akamai TechDocs: Backups - https://techdocs.akamai.com/cloud-computing/docs/backup-service
- Akamai TechDocs: Backups FAQ - https://techdocs.akamai.com/cloud-computing/docs/faqs-for-the-backup-service
- Akamai TechDocs: Schedule backups - https://techdocs.akamai.com/cloud-computing/docs/schedule-backups
- Akamai TechDocs: Overview of Cloud Manager - https://techdocs.akamai.com/cloud-computing/docs/overview-of-cloud-manager
- Docker Docs: Install Docker Engine on Ubuntu - https://docs.docker.com/engine/install/ubuntu/
- Docker Docs: Linux post-installation steps for Docker Engine - https://docs.docker.com/engine/install/linux-postinstall/
- Portainer Docs: Install Portainer CE with Docker on Linux - https://docs.portainer.io/2.33-lts/start/install-ce/server/docker/linux
- Prometheus Docs: Monitoring Linux host metrics with the Node Exporter - https://prometheus.io/docs/guides/node-exporter/
- Grafana Docs: Run Grafana Docker image - https://grafana.com/docs/grafana/latest/setup-grafana/installation/docker/
- Grafana Docs: Configure a Grafana Docker image - https://grafana.com/docs/grafana/latest/setup-grafana/configure-docker/

## Issues Found
- The post exposed Portainer's legacy HTTP port `9000` by default and used `portainer/portainer-ce:latest`. I changed this to the current default HTTPS port `9443` and the documented LTS image tag `portainer/portainer-ce:lts`, and updated the firewall rules to match.
- The Docker installation used the `get.docker.com` convenience script as the primary method. Docker's official docs only recommend that script for testing and development, so I replaced it with the supported Ubuntu apt-repository installation flow.
- The Block Storage section assumed a device path like `/dev/sdc` and referenced an incorrect `/dev/disk/by-id` pattern. I changed it to use the stable Linode volume `filesystem_path` style (`/dev/disk/by-id/scsi-0Linode_Volume_<label>`) and added creation of `/etc/docker` before writing `daemon.json`.
- The backup guidance implied that enabling Linode Backups would protect the deployment even after moving Docker data onto Block Storage. Akamai's docs state that attached Block Storage volumes are not backed up by the Backups service, so I corrected the backup instructions and conclusion to call this out explicitly.
- The monitoring section claimed the sample stack could provide detailed metrics as written, but the `node-exporter` container was missing the host-access configuration required for host metrics. I updated the example to use the documented host-access pattern and clarified that Prometheus still needs a scrape configuration for `node-exporter`.
- The firewall attachment wording assumed assignment only at the Linode level. Current Akamai docs distinguish between Linode-level assignment and interface-level assignment, so I updated the wording to reflect both cases.
- The description referenced an optional NodeBalancer, but the post did not actually cover NodeBalancer setup. I removed that claim from the description.

## Review Notes
- The recommendation for a 4 GB shared CPU Linode is reasonable as editorial guidance, but it is a sizing recommendation rather than a platform requirement.
- The Prometheus/Grafana example is still a starter stack, not a full production monitoring setup. A future revision could pin image tags and include a complete Prometheus scrape configuration.
