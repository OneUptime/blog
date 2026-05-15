# Validation Summary: How to Deploy Boundary for Secure Remote Access on RHEL

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Red Hat Enterprise Linux
- HashiCorp Boundary
- Boundary CLI
- Boundary controller and worker HCL configuration
- PostgreSQL
- systemd
- firewalld

## Sources Consulted
- HashiCorp Boundary install documentation: https://developer.hashicorp.com/boundary/install
- HashiCorp Boundary self-managed install documentation: https://developer.hashicorp.com/boundary/docs/deploy/self-managed/install
- HashiCorp Boundary system requirements: https://developer.hashicorp.com/boundary/docs/architecture/system-requirements
- HashiCorp Boundary controller configuration: https://developer.hashicorp.com/boundary/docs/configuration/controller
- HashiCorp Boundary worker configuration: https://developer.hashicorp.com/boundary/docs/configuration/workers
- HashiCorp Boundary AEAD KMS configuration: https://developer.hashicorp.com/boundary/docs/configuration/kms/aead
- HashiCorp Boundary database init command: https://developer.hashicorp.com/boundary/docs/commands/database/init
- HashiCorp Boundary authenticate password command: https://developer.hashicorp.com/boundary/docs/commands/authenticate/password
- HashiCorp Boundary scopes create command: https://developer.hashicorp.com/boundary/docs/commands/scopes/create
- HashiCorp Boundary host-sets add-hosts command: https://developer.hashicorp.com/boundary/docs/commands/host-sets/add-hosts
- HashiCorp Boundary targets create and add-host-sources commands: https://developer.hashicorp.com/boundary/docs/commands/targets/create and https://developer.hashicorp.com/boundary/docs/commands/targets/add-host-sources
- HashiCorp Boundary connect command: https://developer.hashicorp.com/boundary/docs/commands/connect

## Issues Found
- The prerequisites named "PostgreSQL 11 or newer", but current Boundary documentation says to use a PostgreSQL version covered by Boundary's supported version policy. Updated the wording to avoid recommending an unsupported PostgreSQL release.
- The database user was created without the privileges Boundary needs for `boundary database init`. Updated the setup to create the user with `SUPERUSER` for initialization and added a post-initialization command to remove the superuser role.
- The AEAD KMS keys in the controller and worker configuration were not valid base64-encoded 256-bit keys. Replaced them with valid 32-byte base64 values and kept the worker-auth key consistent between controller and worker.
- The worker configuration used `controllers`, but current Boundary worker configuration uses `initial_upstreams` for self-managed workers to reach the Boundary cluster. Updated the worker HCL accordingly.

## Review Notes
The tutorial disables TLS and uses inline AEAD keys, which is acceptable for a basic test deployment but not production-ready. HashiCorp recommends TLS for control-plane traffic and an external KMS such as Vault Transit or a cloud KMS for production deployments.
