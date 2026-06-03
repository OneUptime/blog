# Validation Summary: How to Configure Vault Lease Management and Renewal in Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- HashiCorp Vault
- Vault leases and TTL tuning
- Vault Agent templates and Kubernetes sidecars
- Kubernetes ConfigMaps and Deployments
- Go Vault API client
- Python hvac client
- Prometheus alert rules
- PostgreSQL dynamic database credentials

## Sources Consulted
- HashiCorp Vault lease concepts: https://developer.hashicorp.com/vault/docs/concepts/lease
- HashiCorp Vault lease revoke command: https://developer.hashicorp.com/vault/docs/commands/lease/revoke
- HashiCorp Vault lease TTL tuning: https://developer.hashicorp.com/vault/docs/troubleshoot/tune-lease-ttl
- HashiCorp Vault database secrets engine: https://developer.hashicorp.com/vault/docs/secrets/databases
- HashiCorp Vault Agent template documentation: https://developer.hashicorp.com/vault/docs/agent-and-proxy/agent/template
- HashiCorp Vault telemetry metrics reference: https://developer.hashicorp.com/vault/docs/internals/telemetry/metrics/all
- HashiCorp Vault Go API package documentation: https://pkg.go.dev/github.com/hashicorp/vault/api
- hvac lease API documentation: https://python-hvac.org/en/main/usage/system_backend/lease.html

## Issues Found
- The post configured database and PKI lease TTLs by writing TTL fields to `database/config/my-database` and `pki/config/urls`. Those endpoints do not set mount-level lease TTLs. I changed the examples to use `vault secrets tune -default-lease-ttl` and `-max-lease-ttl`, which is the documented way to tune secrets engine TTLs.
- The Go `LifetimeWatcher` example imported `time` but did not use it, which would cause a Go compile error in the shown package. I removed the unused import.
- The Vault Agent ConfigMap referenced `/vault/configs/database-config.tpl`, but the Deployment only mounted `/vault/config`, so the template source would not exist. I changed the example to use an inline `contents` template in the Agent configuration.
- The Python renewal loop called `get_credentials()` from inside the existing renewal thread after a renewal failure. Because the thread was still alive, `start_renewal()` would return without creating a replacement renewal thread, then the current loop would break. I changed the failure path to fetch replacement credentials in place and continue the renewal loop.
- The force revoke example omitted `-prefix`, but Vault's `lease revoke -force` command requires `-prefix`. I updated the command to `vault lease revoke -force -prefix ...`.
- The Prometheus examples used non-documented Vault metric names for lease seconds remaining and lease renewal failures. I updated the alert examples to use documented Vault telemetry metrics for leases scheduled for expiration and lease expiration errors.

## Review Notes
The examples are now technically aligned with the official documentation. In a production deployment, applications consuming files rendered by Vault Agent still need a reload strategy when the rendered credential file changes.
