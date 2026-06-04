# Validation Summary: How to Use Docker for Load Testing with Gatling

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker
- Docker Compose
- Gatling Community Edition
- Gatling Scala DSL
- Gatling feeders, checks, assertions, injection profiles, and HTML reports
- GitHub Actions
- PostgreSQL container health checks

## Sources Consulted
- Gatling documentation: https://docs.gatling.io/
- Gatling injection reference: https://docs.gatling.io/concepts/injection/
- Gatling assertions reference: https://docs.gatling.io/concepts/assertions/
- Gatling checks reference: https://docs.gatling.io/concepts/checks/
- Gatling feeders reference: https://docs.gatling.io/concepts/session/feeders/
- Gatling configuration reference: https://docs.gatling.io/concepts/configuration/
- Gatling default configuration source: https://github.com/gatling/gatling/blob/main/gatling-core/src/main/resources/gatling-defaults.conf
- Gatling 3.12 release notes: https://docs.gatling.io/release-notes/gatling/whats-new/3.12/
- Gatling Docker-based application guide: https://docs.gatling.io/guides/use-cases/docker-app/
- Docker Hub image metadata for ladamalina/gatling: https://hub.docker.com/r/ladamalina/gatling
- Docker Compose CLI reference: https://docs.docker.com/reference/cli/docker/compose/up/
- GitHub Actions artifact upload action: https://github.com/actions/upload-artifact

## Issues Found
- The post said Gatling's architecture was based on Akka and Netty. Gatling 3.12 dropped Akka, so the wording was updated to match current documentation: Gatling uses a fully asynchronous architecture and models virtual users as lightweight messages.
- The post said Gatling provides official Docker images and used `denvazh/gatling`. That image is not an official Gatling image and is outdated. The wording now says to use a current Gatling Docker image or build one from the official bundle, and examples use `ladamalina/gatling:3.15.0`, which currently publishes Gatling 3.15 tags.
- The custom simulation introduction implied Gatling simulations are Scala files generally. Current Gatling supports Java, JavaScript, TypeScript, Scala, and Kotlin, so the wording now clarifies that this guide uses Scala.
- The load profile comments described `constantUsersPerSec(10)` as holding 50 users and `rampUsers(200)` as ramping up to 200 users. In Gatling's open workload model, these inject arriving users, not fixed concurrent users. The comments were corrected.
- The `gatling.conf` example used removed or obsolete keys: `core.outputDirectoryBaseName`, `core.runDescription`, and `http.ahc.*`. It also showed `maxConnectionsPerHost` as a config property, but current Gatling documents it as an HTTP protocol DSL setting. The snippet now uses current HOCON keys for encoding, socket connect timeout, HTTP request and idle timeouts, and console reporting.
- The project layout placed `gatling.conf` under `resources`. For the standalone Gatling bundle used by the Docker image, configuration belongs under `/opt/gatling/conf`, while feeders belong under `/opt/gatling/user-files/resources`. The local structure and Compose volume mounts were corrected.
- The Compose example used the obsolete top-level `version` key and the report-opening command used macOS-only `open`. The Compose file now follows the current Compose Specification style, and both macOS and Linux report-opening commands are shown.

## Review Notes
The tutorial remains a Docker-based Gatling guide using a third-party community image. For production CI, pinning the Docker image by digest or maintaining an internal image built from the official Gatling bundle would improve reproducibility.
