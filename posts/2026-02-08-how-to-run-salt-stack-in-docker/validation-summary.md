# Validation Summary: How to Run Salt Stack in Docker

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Salt / SaltStack
- Docker
- Docker Compose
- Ubuntu 22.04
- Nginx
- GitHub Actions
- YAML

## Sources Consulted
- Salt Install Guide, Linux DEB: https://docs.saltproject.io/salt/install-guide/en/latest/topics/install-by-operating-system/linux-deb.html
- Salt minion configuration reference: https://docs.saltproject.io/en/latest/ref/configuration/minion.html
- Salt master configuration reference: https://docs.saltproject.io/en/master/ref/configuration/master.html
- Salt master CLI reference: https://docs.saltproject.io/en/master/ref/cli/salt-master.html
- Salt minion CLI reference: https://docs.saltproject.io/en/3007/ref/cli/salt-minion.html
- Salt state testing reference: https://docs.saltproject.io/en/latest/ref/states/testing.html
- Salt cmd state reference: https://docs.saltproject.io/en/3007/ref/states/all/salt.states.cmd.html
- Salt service state reference: https://docs.saltproject.io/en/master/ref/states/all/salt.states.service.html
- Salt pillar user guide: https://docs.saltproject.io/salt/user-guide/en/latest/topics/pillar.html
- Salt masterless quickstart: https://docs.saltproject.io/en/latest/topics/tutorials/quickstart.html
- Docker Compose services reference: https://docs.docker.com/reference/compose-file/services/
- Docker Compose version and name reference: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Compose scale CLI reference: https://docs.docker.com/reference/cli/docker/compose/scale/
- Docker multi-service container guidance: https://docs.docker.com/engine/containers/multi-service_container/

## Issues Found
- The Salt APT repository setup used the older `repo.saltproject.io` URL and keyring path. Updated both Dockerfile snippets to use the current Salt DEB install guide with the Broadcom-hosted Salt public key and `salt.sources` file.
- The Salt master and minion commands ran without `--disable-keepalive`. Updated the container commands to run Salt in the foreground without Salt's keepalive wrapper, which Salt documents as useful for containerized environments where the container runtime manages the process lifecycle.
- The Docker Compose examples included the obsolete top-level `version: "3.8"` field. Removed it from both Compose snippets because current Docker Compose uses the Compose Specification and treats `version` as obsolete.
- The minion services set `SALT_MASTER=salt-master`, but the package-installed Salt minion does not use that environment variable by itself. Removed the unused environment entries because the post already configures the master correctly through `/etc/salt/minion.d/master.conf`.
- The Nginx state used `service.running` with `enable: True`, and the verification command used `systemctl status nginx`. A plain Ubuntu container started with `salt-minion` is not booted with systemd, so this would fail in the environment shown. Updated the state to start Nginx with `cmd.run` guarded by `pgrep`, and changed verification to `pgrep -a nginx`.
- The scaling command attempted to scale a service with fixed `container_name` and `hostname`, which Docker Compose does not support for `container_name` and which would also duplicate Salt minion IDs. Added a note before the command explaining that those fixed fields must be removed before scaling.

## Review Notes
The examples are appropriate for a disposable development or CI environment. The `auto_accept: True` setting is correctly scoped as development-only, but it should not be used in production. The Nginx container example is suitable for demonstrating Salt state application inside this tutorial environment; a production Nginx container should usually run Nginx as the container's main process rather than as a side process under a Salt minion container.
