# Validation Summary: How to Mount Google Cloud Storage as a Docker Volume

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Docker
- Docker Compose
- Docker volumes and bind mounts
- Google Cloud Storage
- Cloud Storage FUSE / gcsfuse
- Google Cloud IAM and service accounts
- Compute Engine attached service accounts
- rclone Docker volume plugin

## Sources Consulted
- Google Cloud: Install or upgrade Cloud Storage FUSE - https://docs.cloud.google.com/storage/docs/cloud-storage-fuse/install
- Google Cloud: Cloud Storage FUSE CLI reference - https://docs.cloud.google.com/storage/docs/cloud-storage-fuse/cli-options
- Google Cloud: Cloud Storage FUSE overview - https://docs.cloud.google.com/storage/docs/cloud-storage-fuse/overview
- Google Cloud: Compute Engine service accounts - https://docs.cloud.google.com/compute/docs/access/service-accounts
- Docker Docs: Volumes - https://docs.docker.com/engine/storage/volumes/
- Docker Docs: Bind mounts and bind propagation - https://docs.docker.com/engine/storage/bind-mounts/
- Docker Docs: Compose services reference - https://docs.docker.com/reference/compose-file/services/
- rclone Docs: Docker Volume Plugin - https://rclone.org/docker/
- rclone Docs: Google Cloud Storage backend - https://rclone.org/googlecloudstorage/

## Issues Found
- The Dockerfile examples used `apt-key`, which is deprecated for current Debian/Ubuntu package setup. Updated the install steps to use the Google Cloud signed keyring with `signed-by`, following current Cloud Storage FUSE install documentation.
- The first container entrypoint used `exec "$@" && kill $GCSFUSE_PID`, which made the cleanup command unreachable after `exec`. Updated the entrypoint to run the command, preserve its exit status, and use a trap to stop gcsfuse.
- The Compose sidecar example mounted a FUSE filesystem through a named Docker volume with `:shared`. Docker named volumes use private propagation and do not support configurable bind propagation. Replaced the named volume example with Linux bind mounts using `rshared`/`rslave`.
- The section title referenced the GCS FUSE CSI driver for plain Docker/GCE usage, but the example was actually Application Default Credentials on Compute Engine. Renamed the section and corrected the surrounding authentication wording.
- The gcsfuse performance examples used deprecated `--stat-cache-ttl`, `--type-cache-ttl`, and `--stat-cache-capacity` flags. Replaced them with current `--metadata-cache-ttl-secs` and `--stat-cache-max-size-mb` options.
- The file cache example set `--file-cache-max-size-mb` without enabling `--cache-dir`. Added `--cache-dir=/tmp/gcsfuse-cache`, which Cloud Storage FUSE requires before setting the file cache size.
- The rclone managed plugin example pointed `service_account_file` to `/credentials/key.json`, a path not visible inside the managed plugin. Updated the example to place the key in the plugin config directory and reference it as `/data/config/gcs-key.json`.
- The rclone plugin setup omitted the required cache directory. Added creation of `/var/lib/docker-plugins/rclone/cache`.
- The security and summary wording used "workload identity" broadly for GCE. Updated this to distinguish Workload Identity Federation for GKE from attached service accounts on Compute Engine.

## Review Notes
The tutorial remains Linux-host oriented. Docker Desktop does not support bind mount propagation in the same way, so the sidecar bind-propagation approach is not portable to all desktop environments.
