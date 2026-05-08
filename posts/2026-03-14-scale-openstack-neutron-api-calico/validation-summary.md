# Validation Summary: How to Scale OpenStack Neutron API Integration with Calico

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenStack Neutron
- networking-calico / Calico for OpenStack
- etcd
- MariaDB/MySQL
- RabbitMQ / oslo.messaging
- OpenStackClient CLI
- Bash

## Sources Consulted
- OpenStack Neutron configuration reference: https://docs.openstack.org/neutron/latest/configuration/neutron.html
- OpenStackClient port command reference: https://docs.openstack.org/python-openstackclient/3.11.0/command-objects/port.html
- Calico for OpenStack overview: https://docs.tigera.io/calico/latest/getting-started/openstack/overview
- Calico interpretation of Neutron API calls: https://docs.tigera.io/calico/latest/networking/openstack/neutron-api
- etcd v3.6 configuration options: https://etcd.io/docs/v3.6/op-guide/configuration/
- MariaDB InnoDB flush method documentation: https://mariadb.com/docs/server/server-usage/storage-engines/innodb/innodb-flush-method
- MySQL query cache documentation: https://dev.mysql.com/doc/refman/5.7/en/query-cache-configuration.html

## Issues Found
- The Neutron configuration example assumed `/etc/neutron/neutron.conf.d/scale.conf` would always be read. Added a note that this only works when the service is launched with `--config-dir /etc/neutron/neutron.conf.d`; otherwise the settings must be merged into `neutron.conf`. Also added `sudo install -d` before writing the drop-in file.
- The Neutron worker guidance claimed a fixed `2x CPU cores` rule and described the Calico plugin as generically I/O heavy. OpenStack's current Neutron reference documents `api_workers` as a separate worker count whose default is based on available CPUs and constrained by memory, so the comment now says to size workers based on CPU and memory.
- The etcd configuration snippet said it increased request size, but it only set snapshot, quota, and compaction options. Reworded the comment to match the actual options and added a packaging caveat for environment-file based configuration.
- The etcd backend quota comment stated a fixed 2 GB default. Current etcd documentation describes `--quota-backend-bytes` default as `0`, which means etcd chooses the low-space quota default, so the comment now avoids an incorrect fixed value.
- The auto-compaction example used `ETCD_AUTO_COMPACTION_RETENTION=1`. etcd supports numeric periodic retention values as hours by default, but an explicit duration is clearer and less version-sensitive, so it now uses `1h`.
- The section described "request batching", but the example uses `xargs -P` to submit separate OpenStackClient requests in parallel. Renamed the section and surrounding text to describe controlled parallelism instead of batching.

## Review Notes
The remaining tuning values are examples, not universal recommendations. Operators should size worker counts, SQL connection pools, RabbitMQ pools, and etcd quotas from measured load, available CPU and memory, and database/RabbitMQ/etcd capacity. MySQL 8.0 removed the query cache; the shown query cache settings are applicable to MariaDB and older MySQL 5.7-era deployments, but should be omitted from MySQL 8.0 configuration.
