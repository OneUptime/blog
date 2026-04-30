# Validation Summary: How to Set Up a Home Lab with Portainer on Raspberry Pi

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Portainer
- Docker Compose
- Raspberry Pi
- Pi-hole
- Nginx Proxy Manager
- Jellyfin
- Radarr
- Nextcloud
- MariaDB
- Prometheus
- Grafana
- Prometheus node_exporter
- Linux storage mounting with `fstab`
- `cron`

## Sources Consulted
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/version-and-name/
- Portainer stack documentation: https://docs.portainer.io/user/docker/stacks/add
- Pi-hole Docker configuration: https://docs.pi-hole.net/docker/configuration/
- Pi-hole Docker tips and tricks: https://docs.pi-hole.net/docker/tips-and-tricks/
- Nginx Proxy Manager setup instructions: https://nginxproxymanager.com/setup/
- Let's Encrypt challenge types: https://letsencrypt.org/docs/challenge-types/
- Jellyfin container documentation: https://jellyfin.org/docs/general/installation/container/
- Jellyfin DLNA networking documentation: https://jellyfin.org/docs/general/post-install/networking/dlna/
- Nextcloud official image documentation: https://hub.docker.com/_/nextcloud/
- Nextcloud Docker image README: https://github.com/nextcloud/docker
- Nextcloud system requirements: https://docs.nextcloud.com/server/stable/admin_manual/installation/system_requirements.html
- Prometheus command-line flags: https://prometheus.io/docs/prometheus/latest/command-line/prometheus/
- Prometheus configuration reference: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus getting started guide: https://prometheus.io/docs/prometheus/latest/getting_started/
- Prometheus node_exporter README: https://github.com/prometheus/node_exporter/blob/master/README.md
- GNU `find` help output and GNU Findutils manual: https://www.gnu.org/software/findutils/manual/html_mono/find.html
- Local `man 5 crontab`
- Local `blkid --help`
- Local `mount --help`

## Issues Found
- The Compose snippets used the top-level `version: "3.8"` field, which current Docker Compose documentation marks as obsolete. I removed it from all stack examples to keep the YAML current.
- The Pi-hole example used `WEBPASSWORD`, while current Pi-hole Docker documentation recommends `FTLCONF_webserver_api_password`. I replaced it and added `FTLCONF_dns_listeningMode: all`, which Pi-hole documents as necessary when using Docker bridge networking.
- The Pi-hole and Nginx Proxy Manager port mappings conflicted with standard reverse-proxy usage. Pi-hole was bound to host port 80, while Nginx Proxy Manager exposed HTTP on host port 81. I moved Pi-hole’s admin UI to host port 8081 and restored Nginx Proxy Manager to host port 80 so the reverse proxy matches its official setup and standard ACME HTTP-01 validation can work.
- The monitoring stack’s `node-exporter` service did not follow the official containerized host-monitoring guidance. I updated it to include `pid: host`, a host root bind mount, and `--path.rootfs=/host`.
- The Prometheus example bind-mounted `/etc/prometheus` but did not provide a `prometheus.yml`, which would leave the container without the expected config file. I added a minimal `prometheus.yml` example with valid `scrape_configs`.
- The Prometheus example used the deprecated `--storage.tsdb.retention.time` CLI flag. I removed the deprecated flag and moved retention to the config file under `storage.tsdb.retention.time`.
- The backup cleanup command could match the backup root directory itself because it used `find` with `-maxdepth 1` but no `-mindepth 1`. I added `-mindepth 1` so only dated backup directories are eligible for deletion.

## Review Notes
- The post still uses `:latest` tags throughout. That is technically valid, but pinning versions would make the tutorial more reproducible and reduce surprise upgrades.
- The Nextcloud example is valid for initial deployment, but a production reverse-proxy setup commonly also needs trusted domain and trusted proxy configuration once traffic moves from `:8080` to a public hostname.
- The RAM figures in the planning table are rough estimates rather than vendor-guaranteed values.
