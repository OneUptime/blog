# Validation Summary: How to Install and Configure phpIPAM for IPv4 Address Management

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- phpIPAM
- Docker Compose
- MariaDB
- REST API
- cURL

## Sources Consulted
- phpipam-docker README: https://github.com/phpipam-docker/phpipam-docker
- phpIPAM API documentation: https://www.phpipam.net/api-documentation/
- phpIPAM API cURL example: https://phpipam.net/api/api_curl_example/
- phpIPAM upstream README: https://github.com/phpipam/phpipam
- Docker Compose `version` field reference: https://docs.docker.com/reference/compose-file/version-and-name/
- MariaDB `mariadb-dump` reference: https://mariadb.com/docs/server/clients-and-utilities/backup-restore-and-import-clients/mariadb-dump
- MariaDB container backup and restore reference: https://mariadb.com/docs/server/server-management/automated-mariadb-deployment-and-administration/docker-and-mariadb/container-backup-and-restoration

## Issues Found
- The Compose example used the obsolete top-level `version` field. I removed it to match the current Compose specification.
- The Compose example omitted the `phpipam-cron` service and the `NET_ADMIN` / `NET_RAW` capabilities required for phpIPAM scanning in Docker. I added the cron service and required capabilities so scheduled discovery and status checks match the documented deployment model.
- The API authentication example used an unsupported JSON-body login flow and the wrong endpoint path. I replaced it with phpIPAM's documented Basic Auth token flow against `/api/myapp/user/` and added the required API app setup step.
- The initial login instructions used `admin` and implied setting the password during install. I corrected this to the documented fresh-install credentials `Admin` / `ipamadmin` and noted that the default password should be changed after first login.
- The subnet utilization example queried the wrong API endpoint. I changed it to the documented `/subnets/{id}/usage/` endpoint.
- The backup and restore commands used incorrect MariaDB client syntax and `mysqldump`, which is deprecated and removed from current MariaDB Docker images. I updated them to use `mariadb-dump`, `mariadb`, and `--password=...`.

## Review Notes
- The post is technically correct after the fixes above.
- The tutorial still uses `:latest` image tags for phpIPAM and MariaDB. That is valid, but pinned tags would make the tutorial more reproducible over time.
