# Validation Summary: How to Run Scrapy in Docker for Web Crawling

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Docker
- Docker Compose
- Scrapy
- Python
- MongoDB
- PyMongo
- cron

## Sources Consulted
- Scrapy 2.11 item pipeline documentation: https://docs.scrapy.org/en/2.11/topics/item-pipeline.html
- Scrapy feed exports documentation: https://docs.scrapy.org/en/latest/topics/feed-exports.html
- Scrapy AutoThrottle documentation: https://docs.scrapy.org/en/latest/topics/autothrottle.html
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/
- Docker Compose version and name top-level elements: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Compose services reference: https://docs.docker.com/reference/compose-file/services/
- Docker Compose run CLI reference: https://docs.docker.com/reference/cli/docker/compose/run/
- Docker CLI help output for `docker compose run` and `docker run`
- PyPI package metadata for Scrapy, PyMongo, and Pillow

## Issues Found
- The `DuplicateFilterPipeline` snippet raised `scrapy.exceptions.DropItem` without importing `scrapy`, which would cause a `NameError` when a duplicate item is found. Changed the snippet to import `DropItem` from `scrapy.exceptions` and raise `DropItem(...)`, matching Scrapy's item pipeline documentation.
- The Docker Compose example used the obsolete top-level `version: "3.8"` field. Removed it because the current Compose Specification treats `version` as obsolete and Compose uses the specification schema directly.
- The MongoDB section said to add the pipeline to settings and pipelines, but only showed the pipeline class. Added the required `ITEM_PIPELINES` setting entry for `MongoPipeline` so items are actually passed to MongoDB.
- The ad-hoc spider command used `docker run ... scrapy-crawler`, but the post never tagged a Docker image as `scrapy-crawler`. Replaced it with `docker compose run --rm --build spider-quotes ...`, which reuses the defined service configuration and matches Docker's documented one-off command workflow.

## Review Notes
- The pinned dependency versions are older than the latest available releases as of 2026-06-04, but they remain compatible with the `python:3.12-slim` base image based on package metadata and are not deprecated in the examples.
- The scheduler installs cron at container startup. This works for the shown example, but a production image should usually install cron at build time for faster and more reproducible starts.
