# Validation Summary: How to Use Docker Volume Drivers for Cloud Storage

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker Engine volume plugins and managed plugins
- Docker volumes and the `local` volume driver
- Docker Compose volumes
- NFS, CIFS/SMB, and GlusterFS mounts
- AWS EBS and AWS S3
- REX-Ray Docker volume plugins
- Portworx volumes
- AWS CLI EBS snapshots

## Sources Consulted
- Docker CLI reference: `docker plugin install` - https://docs.docker.com/reference/cli/docker/plugin/install/
- Docker CLI reference: `docker volume create` - https://docs.docker.com/reference/cli/docker/volume/create/
- Docker Engine storage volumes guide, including NFS and CIFS examples - https://docs.docker.com/engine/storage/volumes/
- Docker volume plugin protocol - https://docs.docker.com/engine/extend/plugins_volume/
- Docker Compose file volumes reference - https://docs.docker.com/reference/compose-file/volumes/
- REX-Ray Docker scheduler guide - https://rexray.readthedocs.io/en/stable/user-guide/schedulers/docker/
- REX-Ray AWS managed plugin guide - https://rexray.readthedocs.io/en/stable/user-guide/schedulers/docker/plug-ins/aws/
- AWS EBS create volume documentation - https://docs.aws.amazon.com/ebs/latest/userguide/ebs-creating-volume.html
- AWS EBS encryption documentation - https://docs.aws.amazon.com/ebs/latest/userguide/ebs-encryption.html
- Portworx volume management documentation - https://docs.portworx.com/portworx-enterprise/reference/cli/create-and-manage-volumes
- Portworx performance tuning documentation - https://docs.portworx.com/portworx-enterprise/3.3/reference/cli/tuning

## Issues Found
- REX-Ray EBS volume type option used `volumetype`; changed it to the documented `volumeType` option in the CLI and Compose examples.
- The S3 section used `elementar/d-s3-volume`, whose option names and current authoritative documentation could not be verified. Replaced the example with REX-Ray's documented `rexray/s3fs` plugin and its documented `S3FS_*` configuration variables.
- CIFS examples used a hostname without the `addr=` mount option. Added `addr=windows-server`, matching Docker's guidance that `addr` is required when a hostname is used.
- Portworx Docker volume example used `size=100`; changed it to `size=100G`, matching Portworx's documented size format for Docker volume options.

## Review Notes
- REX-Ray Docker plugins are still documented, but their Docker Hub images have not been updated for several years. The post remains technically useful, but future updates should mention that modern Kubernetes deployments usually use CSI drivers instead of Docker volume plugins.
- S3-mounted filesystems use FUSE semantics and are not equivalent to POSIX block storage; the post correctly warns against using S3-backed volumes for databases.
