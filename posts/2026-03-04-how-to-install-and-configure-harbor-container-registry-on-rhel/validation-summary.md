# Validation Summary: How to Install and Configure Harbor Container Registry on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- Harbor Container Registry
- Docker Engine
- Docker Compose
- OpenSSL
- firewalld
- Trivy vulnerability scanning

## Sources Consulted
- Harbor v2.10.0 installation prerequisites: https://goharbor.io/docs/2.10.0/install-config/installation-prereqs/
- Harbor v2.10.0 HTTPS configuration: https://goharbor.io/docs/2.10.0/install-config/configure-https/
- Harbor v2.10.0 harbor.yml configuration: https://goharbor.io/docs/2.10.0/install-config/configure-yml-file/
- Harbor v2.10.0 installer script documentation: https://goharbor.io/docs/2.10.0/install-config/run-installer-script/
- Harbor v2.15.0 GitHub release: https://github.com/goharbor/harbor/releases/tag/v2.15.0
- Harbor v2.15.0 harbor.yml template: https://raw.githubusercontent.com/goharbor/harbor/v2.15.0/make/harbor.yml.tmpl
- Harbor v2.15.0 install.sh script: https://raw.githubusercontent.com/goharbor/harbor/v2.15.0/make/install.sh
- Docker Engine certificate directory documentation: https://docs.docker.com/engine/security/certificates/
- Red Hat RHEL firewalld documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_firewalls_and_packet_filters/using-and-configuring-firewalld_firewall-packet-filters

## Issues Found
- The post downloaded Harbor v2.10.0, which is no longer the latest official Harbor release as of this review. Updated the download URL to Harbor v2.15.0 while confirming that the shown `harbor.yml` keys and `install.sh --with-trivy` flow remain valid for v2.15.0.
- The commands extracted Harbor into `/opt/harbor` with `sudo` and then wrote files there as the normal user. On a typical RHEL system this can fail due to ownership of `/opt`. Added `sudo chown -R "$(id -u):$(id -g)" /opt/harbor` after extraction so the subsequent certificate and configuration commands work as written.

## Review Notes
- The example still uses placeholder credentials. For production, replace `harbor_admin_password` and `database.password` with strong secrets before first installation.
- Opening port 80 is correct when Harbor's HTTP listener is enabled for redirecting to HTTPS; deployments that disable HTTP can omit it.
