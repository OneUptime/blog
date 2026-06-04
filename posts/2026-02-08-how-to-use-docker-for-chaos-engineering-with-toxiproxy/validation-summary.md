# Validation Summary: How to Use Docker for Chaos Engineering with Toxiproxy

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker
- Docker Compose
- Toxiproxy
- Redis
- PostgreSQL
- curl
- Python
- pytest
- requests

## Sources Consulted
- Toxiproxy GitHub README and HTTP API documentation: https://github.com/Shopify/toxiproxy
- Toxiproxy toxics documentation in the official README: https://github.com/Shopify/toxiproxy#toxics
- Toxiproxy Docker image guidance in the official README: https://github.com/Shopify/toxiproxy#1-installing-toxiproxy
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/
- Docker Compose version top-level element documentation: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Hub notice for the legacy Shopify Toxiproxy image: https://hub.docker.com/r/shopify/toxiproxy/

## Issues Found
- The Docker Compose snippet used `version: "3.8"`. Docker's current Compose Specification treats the top-level `version` property as obsolete and only informative, so it was removed from the example.
- The slicer toxic example used `delay: 100` while describing slow responses. Toxiproxy defines slicer `delay` in microseconds, so this would only add a 100 microsecond delay. The example was changed to `delay: 100000` and the comment now describes it as a 100ms delay.
- The integration testing section said it used a Toxiproxy client library, but the code defines a small wrapper around the HTTP API using `requests`. The heading and introductory sentence were updated to refer to the Toxiproxy HTTP API.

## Review Notes
- The Toxiproxy proxy and toxic endpoints, field names, toxic types, toxicity behavior, and proxy disable/enable commands match the official Toxiproxy HTTP API documentation.
- The `ghcr.io/shopify/toxiproxy:latest` image is consistent with the official project guidance; Docker Hub notes that the old `shopify/toxiproxy` image moved to GitHub Container Registry.
- The initialization script uses `POST /proxies`, which is suitable for creating proxies in a fresh Toxiproxy instance. For idempotent repeated setup, Toxiproxy also provides a `/populate` endpoint, but the existing example is technically valid as a startup initialization pattern.
