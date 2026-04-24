# Validation Summary: How to Upgrade from Portainer CE to Business Edition

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer Community Edition (CE)
- Portainer Business Edition (BE)
- Docker CLI
- Docker Compose

## Sources Consulted
- Portainer Documentation: Switching to Portainer Business Edition: https://docs.portainer.io/start/upgrade/tobe
- Portainer Documentation: Docker Standalone upgrade to Business Edition: https://docs.portainer.io/start/upgrade/tobe/docker
- Portainer Documentation: How do I enter my Portainer Business license into Portainer CE?: https://docs.portainer.io/faqs/licensing/how-do-i-enter-my-portainer-business-license-into-portainer-ce
- Portainer Documentation: Can I downgrade from Portainer Business to Portainer CE?: https://docs.portainer.io/faqs/upgrading/can-i-downgrade-from-portainer-business-to-portainer-ce
- Portainer Documentation: Why do my users no longer have access after upgrading to BE from CE?: https://docs.portainer.io/faqs/upgrading/why-do-my-users-no-longer-have-access-after-upgrading-to-be-from-ce
- Portainer Documentation: Lifecycle policy: https://docs.portainer.io/start/lifecycle
- Docker Docs: `docker inspect`: https://docs.docker.com/reference/cli/docker/inspect/
- Docker Docs: Format command and log output: https://docs.docker.com/go/formatting/
- Docker Docs: Volumes: https://docs.docker.com/engine/storage/volumes/
- Docker Docs: `docker container run`: https://docs.docker.com/reference/cli/docker/container/run

## Issues Found
- The Step 5 `docker run` example had inline comments after a line-continuation backslash, which breaks the shell command. I removed the inline comments and kept the explanation in preceding comments.
- The rollback section was incorrect. Portainer's documented downgrade flow requires running `portainer/portainer-ee:latest --rollback-to-ce` before redeploying CE, and it only works when the instance was originally upgraded from CE to BE. I updated the instructions to match the official process.
- The overview and conclusion overstated what is preserved during the upgrade. Portainer documents that the CE-to-BE upgrade performs database changes, so I revised the wording to avoid implying a byte-for-byte unchanged configuration state.
- The post did not mention that existing Standard User accounts are reassigned to the Read-Only User role during the CE-to-BE upgrade. I added this under "What Changes After Upgrade" because it affects user access after migration.
- The verification step pointed readers to the wrong UI location. Portainer's documentation indicates that "Business Edition" appears in the bottom-left corner after upgrade, so I corrected that note.
- The Step 2 comment implied that the `docker inspect` commands reconstruct the original `docker run` command. I changed the wording to describe them more accurately as documenting the current container settings.

## Review Notes
- Portainer supports an in-app CE-to-BE upgrade path starting from version 2.17, but the manual image-swap workflow in this post remains valid.
- Portainer recommends the LTS release stream for production workloads. This post's `:latest` examples are valid, but readers running production systems may prefer the LTS tag or a pinned release.
- The commands assume the default named volume `portainer_data`. If the installation uses a bind mount or a different volume name, the commands need to be adjusted.
