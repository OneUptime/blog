# Validation Summary: How to Manage Database Backups with Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Compose
- Docker CLI
- MySQL
- PostgreSQL
- MongoDB Database Tools
- AWS CLI
- MinIO Client
- Healthchecks.io

## Sources Consulted
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/
- Docker Compose `version` top-level element: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Compose interpolation and `$$` escaping: https://docs.docker.com/reference/compose-file/interpolation/
- Portainer relative path volumes: https://docs.portainer.io/sts/advanced/relative-paths
- MySQL Docker environment variables, including `MYSQL_ROOT_HOST`: https://dev.mysql.com/doc/mysql-installation-excerpt/8.0/en/docker-mysql-more-topics.html
- MySQL `mysqldump` reference: https://dev.mysql.com/doc/refman/8.4/en/mysqldump.html
- PostgreSQL `pg_dump`: https://www.postgresql.org/docs/current/app-pgdump.html
- PostgreSQL `pg_restore`: https://www.postgresql.org/docs/current/app-pgrestore.html
- PostgreSQL libpq environment variables: https://www.postgresql.org/docs/current/libpq-envars.html
- MongoDB connection strings and `authSource`: https://www.mongodb.com/docs/current/reference/connection-string/
- MongoDB `mongodump`: https://www.mongodb.com/docs/manual/reference/mongodump/
- MongoDB `mongorestore`: https://www.mongodb.com/docs/database-tools/mongorestore/
- AWS CLI `s3 cp`: https://docs.aws.amazon.com/cli/latest/reference/s3/cp.html
- MinIO `mc cp`: https://min.io/docs/minio/linux/reference/minio-mc/mc-cp.html
- Healthchecks.io Pinging API: https://healthchecks.io/docs/http_api/

## Issues Found
- The MySQL Compose example used the obsolete top-level `version` key. I removed it because current Compose uses the Compose Specification and treats `version` as obsolete.
- The examples used `./backups` bind mounts as if they were universally valid in Portainer stacks. Portainer documents relative path volumes as a Business Edition feature for Git-based stack deployments, so I replaced them with absolute host-path examples (`/opt/...`) to make the snippets generally correct for Portainer-managed Docker environments.
- The MySQL sidecar connected from a separate container as `root`, but the MySQL Docker documentation states the default account is `root@localhost`. I added `MYSQL_ROOT_HOST: "%"`, which allows the sidecar container to authenticate over the Docker network.
- The S3 upload example recomputed the timestamp when copying to object storage, which could point at a different filename than the one just created. I changed the backup scripts to reuse a `backup_file` variable and updated the S3 and MinIO examples to copy that exact file.
- The S3 section implied the commands would work in the stock database images. I clarified that the sidecar image needs to include the AWS CLI or MinIO Client.
- The MongoDB restore URI relied on implicit authentication-database behavior. I made `authSource=admin` explicit to match the earlier backup example.
- The Healthchecks.io example used the older `healthchecks.io/ping/...` endpoint. I updated it to the current documented `hc-ping.com/<uuid>` endpoint.

## Review Notes
- The article is now technically sound as a guide for logical backups in containerized environments.
- PostgreSQL’s official documentation notes that `pg_dump` is generally not the right tool for regular backups of large production databases. MongoDB’s tool-based backups have similar scope limitations. A future revision could mention physical backup strategies for larger or higher-availability deployments.
- Docker was not installed in the review environment, so command availability inside the images was verified from official documentation rather than local container execution.
