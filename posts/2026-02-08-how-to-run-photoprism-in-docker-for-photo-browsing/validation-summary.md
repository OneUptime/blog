# Validation Summary: How to Run PhotoPrism in Docker for Photo Browsing

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- PhotoPrism
- Docker
- Docker Compose
- MariaDB
- PhotoPrism CLI
- Cron
- rsync
- OneUptime HTTP monitoring

## Sources Consulted
- PhotoPrism Docker Compose documentation: https://docs.photoprism.app/getting-started/docker-compose/
- PhotoPrism configuration options: https://docs.photoprism.app/getting-started/config-options/
- PhotoPrism search filters: https://docs.photoprism.app/user-guide/search/filters/
- PhotoPrism browsing/search user guide: https://docs.photoprism.app/user-guide/search/
- PhotoPrism moments documentation: https://docs.photoprism.app/user-guide/organize/moments/
- PhotoPrism setup requirements: https://docs.photoprism.app/getting-started/
- PhotoPrism video transcoding and GPU/TensorFlow notes: https://docs.photoprism.app/getting-started/advanced/transcoding/
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/
- Docker Compose version top-level element documentation: https://docs.docker.com/reference/compose-file/version-and-name/
- Google Photos privacy documentation: https://support.google.com/photos/answer/12840331
- Google Photos product privacy page: https://www.google.com/photos/about

## Issues Found
- The post claimed Google Photos scans images for ad targeting. Google Photos documentation says stored Photos content is not used for ads, so this was changed to the more accurate statement that Google Photos processes the library in Google's cloud.
- The architecture description said originals are kept in the storage directory. PhotoPrism uses `/photoprism/originals` for originals and `/photoprism/storage` for config, cache, backups, thumbnails, and sidecar files, so the wording was corrected.
- The project setup did not create the import directory used later in the Compose file. Added `import` to the `mkdir` command.
- The Compose example used the obsolete top-level `version: "3.8"` field. Removed it to match the current Compose Specification.
- The import directory was mounted inside the originals path. PhotoPrism documentation warns not to configure import inside originals because it can cause import loops, so the import mount was changed to `./import:/photoprism/import`.
- The originals directory was mounted read-only while later sections describe importing and uploading. Read-only originals block features that need writes, so the mount was changed to writable and the comment clarified the trade-off.
- The `PHOTOPRISM_ORIGINALS_LIMIT` comment described a storage limit in GB. PhotoPrism documents it as a maximum original media file size in MB, so the comment was corrected.
- The indexing command comments described `photoprism index` as a full index and `index --cleanup` as only processing new files. PhotoPrism documents `index -f` as the complete rescan and `index --cleanup` as an index update with cleanup, so the comments were corrected.
- The search examples described natural language search and used unsupported or inaccurate filter examples: `face:John`, `month:july`, and `country:Japan`. These were changed to documented filters: `person:"John Doe"`, `month:7`, and `country:jp`.
- The albums section described calendar and location albums as auto-generated albums. PhotoPrism documents Albums as manually curated and Calendar, Places, Regions, and Moments as separate views, so the wording was corrected.
- The update section recommended `photoprism index` after major updates. PhotoPrism documents `photoprism index -f` for a complete rescan, so the command was corrected.
- The backup section said PhotoPrism does not modify originals without qualification. This was narrowed to say PhotoPrism does not modify originals during indexing.

## Review Notes
The Docker and CLI examples are valid for the Compose file as written because it sets explicit container names and uses the current `docker compose` command. For public deployments, the post could later mention PhotoPrism's recommendation to use HTTPS behind a reverse proxy, but that is an operational hardening note rather than a correctness blocker for this local-network tutorial.
