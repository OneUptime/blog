# Validation Summary: How to Run Bookstack in Docker for Documentation

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Docker
- Docker Compose
- LinuxServer.io BookStack container image
- BookStack
- MariaDB
- LDAP
- SMTP email
- BookStack REST API
- OneUptime HTTP monitoring

## Sources Consulted
- LinuxServer.io BookStack image documentation: https://docs.linuxserver.io/images/docker-bookstack/
- BookStack LDAP authentication documentation: https://www.bookstackapp.com/docs/admin/ldap-auth/
- BookStack email and webhooks documentation: https://www.bookstackapp.com/docs/admin/email-webhooks/
- BookStack update notes: https://www.bookstackapp.com/docs/admin/updates/
- BookStack API documentation: https://demo.bookstackapp.com/api/docs
- BookStack content overview documentation: https://www.bookstackapp.com/docs/user/content-overview/
- BookStack Markdown editor documentation: https://www.bookstackapp.com/docs/user/markdown-editor/
- BookStack content tags documentation: https://www.bookstackapp.com/docs/user/tags/
- BookStack search documentation: https://www.bookstackapp.com/docs/user/searching/
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/
- MariaDB Docker official image environment variables: https://mariadb.com/docs/server/server-management/automated-mariadb-deployment-and-administration/docker-and-mariadb/mariadb-server-docker-official-image-environment-variables

## Issues Found
- The Docker Compose example omitted `APP_KEY`, which the current LinuxServer.io BookStack image documents as a mandatory environment variable. Added an `appkey` generation command and an `APP_KEY` entry in the BookStack service environment.
- The project setup created `uploads` and `storage` directories that were not used by the LinuxServer.io image. Updated the setup command to create `db` and `config`, matching the actual volume mappings used by the Compose file.
- The LDAP example used the older `${user}` placeholder. Updated it to `{user}`, which current BookStack documentation identifies as the default placeholder format while keeping the older form only for backward compatibility.
- The backup commands wrote into `~/bookstack-backup` without creating it first. Added `mkdir -p ~/bookstack-backup` before the dump and tar commands.
- The search section claimed BookStack could index text within uploaded images if OCR was enabled. Official BookStack search and upload documentation does not document built-in OCR search for uploaded images, so the sentence was narrowed to page content, titles, and tags.

## Review Notes
- The Compose file still uses a top-level `version: "3.8"` field. Current Docker Compose uses the Compose Specification, where legacy 2.x and 3.x formats were merged, so the version field is no longer needed in new files. It remains syntactically accepted, so this was noted rather than changed.
- The BookStack API examples use the documented token authorization format and page creation endpoint shape.
- The MariaDB `MYSQL_*` initialization variables are supported for compatibility by the MariaDB Docker image, although `MARIADB_*` names are also available.
