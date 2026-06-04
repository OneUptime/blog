# Validation Summary: How to Run RStudio Server in Docker

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Docker
- Docker Compose
- Rocker RStudio, tidyverse, verse, geospatial, ml, and Shiny images
- RStudio Server
- R
- R packages including DBI, RPostgres, tidyverse, remotes, rmarkdown, and Shiny
- PostgreSQL Docker image

## Sources Consulted
- Rocker Project documentation for rstudio, tidyverse, verse, and geospatial images: https://rocker-project.org/images/versioned/rstudio
- Rocker versioned image repository documentation for extension scripts and `ADD=` support status: https://github.com/rocker-org/rocker-versioned2
- Rocker Project documentation for Shiny images: https://rocker-project.org/images/versioned/shiny.html
- Docker Compose file reference for the obsolete top-level `version` property: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Compose CLI reference: https://docs.docker.com/reference/cli/docker/compose/
- Docker CLI `docker run --help` output in the local environment for `--cpus`, `--memory`, `-p`, `-e`, `-v`, and `-w`
- Docker Official Image documentation for PostgreSQL initialization and environment variables: https://hub.docker.com/_/postgres
- Docker PostgreSQL initialization guide: https://docs.docker.com/guides/postgresql/advanced-configuration-and-initialization/
- Rocker image manifests checked with `docker buildx imagetools inspect` for `rocker/rstudio:4.4.1`, `rocker/tidyverse:4.4.1`, `rocker/verse:4.4.1`, `rocker/geospatial:4.4.1`, `rocker/ml:4.4.1`, and `rocker/shiny-verse:4.4.1`

## Issues Found
- The Docker Compose example used `version: "3.8"`. Current Docker Compose treats the top-level `version` property as obsolete and validates against the current Compose Specification regardless of that field. Removed the `version` line.
- The Shiny example used `-e ADD=shiny` and claimed it installs Shiny Server at runtime. Rocker versioned images for R 4.x no longer support `ADD=` runtime triggers. Replaced the example with a small `Dockerfile.shiny` that runs `/rocker_scripts/install_shiny_server.sh`, then runs the derived image with ports 8787 and 3838 exposed.

## Review Notes
- The remaining Docker, Compose, PostgreSQL, R, and Dockerfile examples are syntactically valid for the documented versions.
- The Compose snippet was checked with `docker compose -f /tmp/rstudio-compose.yml config --quiet`.
- Dockerfile syntax was checked with `docker buildx build --check`.
- Image size values in the table are approximate and can vary by tag, platform, and registry reporting method; they should be treated as rough guidance rather than stable specifications.
