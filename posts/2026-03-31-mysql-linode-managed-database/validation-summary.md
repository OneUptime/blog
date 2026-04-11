# Validation Summary: How to Set Up MySQL on Linode Managed Database

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MySQL 8
- Linode CLI (`linode-cli`)
- Linode/Akamai Managed Databases API (v4)
- SSL/TLS for MySQL connections

## Sources Consulted
- Linode OpenAPI specification (v4.215.0) from `linode/linode-api-docs` GitHub repository — verified all CLI action names, API endpoints, request/response schemas, and parameter definitions
- Linode API reference for Managed Databases (`/v4/databases/mysql/instances`)
- MySQL client `--ssl-mode` and `--ssl-ca` flag documentation

## Issues Found
1. **Incorrect CLI command for SSL certificate download (line 78):** The post used `linode-cli databases mysql-ssl 12345` but the correct CLI action name is `mysql-ssl-cert`, not `mysql-ssl`. This was confirmed against the Linode OpenAPI spec where the `x-linode-cli-action` for the `GET /databases/mysql/instances/{instanceId}/ssl` endpoint is `mysql-ssl-cert`. Fixed to `linode-cli databases mysql-ssl-cert 12345 --text --no-headers > ca-cert.pem`.

## Review Notes
- All API endpoints (`POST /v4/databases/mysql/instances`, `PUT /v4/databases/mysql/instances/{id}`, `GET /v4/databases/mysql/instances/{id}`) are correct per the Linode OpenAPI spec.
- CLI commands `mysql-create`, `mysql-list`, `mysql-view`, `mysql-update` are all correctly named.
- Parameters `--cluster_size`, `--engine mysql/8`, `--type g6-dedicated-2`, and `--allow_list` are all valid per the API schema.
- The default root username `linroot` is confirmed correct.
- The `--text --no-headers` flags for extracting the SSL certificate to a file are a standard Linode CLI approach, though users may need to also pass `--format ca_certificate` if the output includes additional fields beyond the certificate.
- The example IP addresses use RFC 5737 documentation ranges (203.0.113.0/24), which is good practice.
