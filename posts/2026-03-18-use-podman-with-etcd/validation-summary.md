# Validation Summary: How to Use Podman with etcd

## Status
validated

## Post Type
Guide

## Technologies Covered
- Podman
- Compose with Podman
- etcd
- `etcdctl`
- `etcdutl`
- Python
- `etcd3`
- Prometheus metrics

## Sources Consulted
- etcd container guide: https://etcd.io/docs/v3.5/op-guide/container/
- etcd configuration flags: https://etcd.io/docs/v3.5/op-guide/configuration/
- etcd cluster status tutorial: https://etcd.io/docs/v3.5/tutorials/how-to-check-cluster-status/
- etcd snapshot tutorial: https://etcd.io/docs/v3.5/tutorials/how-to-save-database/
- etcd disaster recovery guide: https://etcd.io/docs/v3.5/op-guide/recovery/
- etcd maintenance guide: https://etcd.io/docs/v3.5/op-guide/maintenance
- Podman compose man page: https://docs.podman.io/en/v5.6.2/markdown/podman-compose.1.html
- python-etcd3 usage docs: https://python-etcd3.readthedocs.io/en/latest/usage.html
- etcd release page for current 3.5 container tags: https://github.com/etcd-io/etcd/releases

## Issues Found
- The post pinned all container examples to `quay.io/coreos/etcd:v3.5.12`, which is an older 3.5 patch release. I updated the examples to `v3.5.30`, which is the current 3.5 patch line listed on the official etcd releases page.
- The cluster example used `podman-compose` and then hard-coded the generated container name `etcd-cluster_etcd1_1` for health checks. Podman’s official documentation documents `podman compose` as the supported wrapper, and the generated container name depends on the compose provider. I changed the commands to `podman compose -f etcd-cluster.yml up -d` and `podman compose ... exec etcd1 etcdctl endpoint health --cluster`.
- The backup script used `etcdctl snapshot status`, but the official etcd v3.5 docs use `etcdutl snapshot status` for snapshot inspection. I changed the status command accordingly and made the snapshot save endpoint explicit with `--endpoints=http://localhost:2379`.
- The restore script attempted to restore into the existing `etcd-data` volume and then restarted etcd without restoring the member with matching identity and peer settings. The official disaster recovery guide says `etcdutl snapshot restore` creates new data directories and that restored members start a new logical cluster. I fixed the script to recreate the volume, restore with `--name`, `--initial-cluster`, and `--initial-advertise-peer-urls`, and restart etcd with matching `node1` and peer listener settings.

## Review Notes
- The Python examples are consistent with the current `etcd3` client API for `get_prefix`, `watch_prefix`, lease creation, and `PutEvent`/`DeleteEvent` handling.
- The post still uses `quay.io/coreos/etcd`, which the official etcd release page lists as a secondary container registry, so the image reference remains valid.
- `podman compose` is a thin wrapper around an external compose provider, so readers still need a compose provider installed on the host.
- Runtime validation was not possible in this workspace because `podman` is not installed here.
