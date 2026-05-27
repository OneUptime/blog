# Validation Summary: How to Use Ansible to Set Up a Private Docker Registry

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- Docker Engine
- Docker Compose
- CNCF Distribution / Docker Registry
- TLS certificates
- htpasswd basic authentication
- Certbot / Let's Encrypt
- Cron

## Sources Consulted
- Ansible `apt_key` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_key_module.html
- Ansible `apt` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_module.html
- Ansible `community.docker.docker_compose_v2` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/docker/docker_compose_v2_module.html
- Ansible `community.crypto.x509_certificate` documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/crypto/x509_certificate_module.html
- Docker Engine installation on Ubuntu: https://docs.docker.com/engine/install/ubuntu/
- Docker Compose file reference and obsolete `version` field: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker registry certificate trust and insecure registry behavior: https://docs.docker.com/reference/cli/dockerd/
- Docker certificate configuration for registry clients: https://docs.docker.com/engine/security/certificates/
- CNCF Distribution registry configuration: https://distribution.github.io/distribution/about/configuration/
- CNCF Distribution registry deployment guidance: https://distribution.github.io/distribution/about/deploying/
- CNCF Distribution garbage collection documentation: https://distribution.github.io/distribution/about/garbage-collection/
- Apache `htpasswd` documentation: https://httpd.apache.org/docs/current/en/programs/htpasswd.html
- Certbot documentation: https://eff-certbot.readthedocs.io/en/latest/
- Docker Official Image registry entrypoint source: https://github.com/distribution/distribution-library-image

## Issues Found
- The post used Ansible's `apt_key` module for Docker's repository key. The module is retained for compatibility, but the underlying `apt-key` workflow is deprecated. Updated the Docker install snippet to create `/etc/apt/keyrings`, download Docker's key with `get_url`, and reference it with `signed-by`.
- The Docker package installation task did not refresh the APT cache after adding Docker's repository, which can make `docker-ce` unavailable on a fresh host. Added `update_cache: yes` to the Docker package install task.
- The prerequisites omitted the required Ansible collections used by the snippets. Added `community.docker` and `community.crypto`.
- The project layout listed `nginx.conf.j2`, but the post does not configure or use Nginx. Removed it from the layout to avoid a misleading unused template.
- The Docker Compose snippet used the top-level `version: '3.8'` field. Docker Compose now treats the field as obsolete and only informational, so it was removed.
- The running instructions referenced `playbook.yml` but did not show a playbook that applies the role. Added a minimal `playbook.yml` snippet under the existing Running the Playbook section.
- The self-signed TLS path implied that client commands would work without additional trust configuration. Added a note that Docker clients must trust the self-signed certificate or be configured for an insecure registry.
- The garbage collection cron job ran `garbage-collect` against a live writable registry. CNCF Distribution documentation warns that writes should be stopped or the registry made read-only during garbage collection. Updated the cron job to stop the Compose service, run garbage collection with the documented flag order, and start the service again.

## Review Notes
The examples are now technically valid for the stated Ubuntu 22.04 and Ansible 2.12+ target. Future improvements could include adding explicit collection installation commands and a renewal/reload path for Let's Encrypt certificates.
