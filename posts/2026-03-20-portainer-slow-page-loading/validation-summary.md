# Validation Summary: How to Fix Slow Page Loading with Many Resources in Portainer (2)

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer Server
- Portainer HTTP API
- Portainer BoltDB storage
- Docker CLI
- Linux `lsblk`

## Sources Consulted
- Portainer CLI configuration options: https://docs.portainer.io/advanced/cli
- Portainer general settings: https://docs.portainer.io/admin/settings/general
- Portainer environments management: https://docs.portainer.io/admin/environments/environments
- Portainer stacks overview: https://docs.portainer.io/user/docker/stacks
- Portainer stack removal: https://docs.portainer.io/user/docker/stacks/remove
- Portainer database encryption and storage location: https://docs.portainer.io/advanced/db-encryption
- Portainer API usage examples: https://docs.portainer.io/sts/api/examples
- Portainer source for CLI flag parsing and snapshot interval validation: https://github.com/portainer/portainer/blob/develop/api/cli/cli.go
- Portainer source for BoltDB startup compaction behavior: https://github.com/portainer/portainer/blob/develop/api/database/boltdb/db.go
- Docker prune documentation: https://docs.docker.com/engine/manage-resources/pruning/
- Docker image prune reference: https://docs.docker.com/reference/cli/docker/image/prune/
- Docker network prune reference: https://docs.docker.com/reference/cli/docker/network/prune/
- Docker resource constraints: https://docs.docker.com/engine/containers/resource_constraints/
- Docker `docker run` reference: https://docs.docker.com/reference/cli/docker/container/run
- `lsblk` local CLI help (`lsblk --help`)

## Issues Found
- The post described `--snapshot-interval` as a numeric seconds value and implied a 60-second default. Current Portainer documentation and source validate this flag as a Go duration string such as `15m`, and the documented default is `5m`. I changed the examples and wording to use `15m` and corrected the default.
- The `docker run` example in Step 6 had invalid shell syntax because inline comments were placed after backslash line continuations. I moved the explanation into a standalone comment and left the command lines syntactically valid.
- The cleanup example used `docker system prune -a` as a "full cleanup", but Docker documents that volumes are not included unless `--volumes` is added. I corrected the command to `docker system prune -a --volumes`.
- The Step 4 heading said "Archive or Remove" even though the documented Portainer action is removal, not archiving. I changed the heading and removed the inaccurate claim that removing a stack entry would not affect running containers.
- The Step 5 explanation claimed every active environment is polled on each page load. Portainer documents periodic snapshots instead, so I replaced that statement with a safer environment cleanup recommendation.
- The Step 7 storage check said `ROTA=0` means SSD. `lsblk` exposes `ROTA` as whether a device is rotational, so I corrected this to "non-rotational storage (typically SSD/NVMe)" versus rotational disks.
- The Step 7 and Step 8 recreation examples dropped the published HTTPS port. I restored `9443` so those commands remain consistent with the rest of the post.
- The database compaction workflow was incorrect. Portainer's `--compact-db` flag compacts the database on startup and then continues running, so the one-off `docker run --rm ... --compact-db` example would not behave as described. I replaced it with a normal startup command that includes `--compact-db`.
- The Step 9 intro overstated the effect of UI filtering by saying it avoids loading all resources. I narrowed this to a correct statement about working with smaller subsets after the list is loaded and removed the unsupported registry filter claim.
- The conclusion recommended splitting large deployments across multiple Portainer instances, which is not guidance I could verify in the official docs I reviewed. I replaced that with advice to re-measure after each change.

## Review Notes
- The examples still use `portainer/portainer-ce:latest`. Current Portainer install and upgrade docs often use channel tags such as `lts` or `sts`; `latest` is not inherently wrong, but pinning a version or channel would make the commands more predictable.
- The API examples assume Portainer's legacy HTTP port `9000` is exposed. Current Portainer documentation uses HTTPS on `9443` by default, with `9000` retained only if you choose to publish it.
