# Validation Summary: How to implement Vault dynamic database credentials for Kubernetes applications

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- HashiCorp Vault database secrets engine
- Vault Kubernetes auth method
- Vault Agent Injector
- Kubernetes Deployments and service accounts
- PostgreSQL
- MySQL/MariaDB
- MongoDB
- Go with `github.com/hashicorp/vault/api`, `database/sql`, and `github.com/lib/pq`
- Python with `hvac` and `psycopg2`

## Sources Consulted
- HashiCorp Vault PostgreSQL database secrets engine documentation: https://developer.hashicorp.com/vault/docs/secrets/databases/postgresql
- HashiCorp Vault MySQL/MariaDB database secrets engine documentation: https://developer.hashicorp.com/vault/docs/secrets/databases/mysql-maria
- HashiCorp Vault MongoDB database secrets engine documentation: https://developer.hashicorp.com/vault/docs/secrets/databases/mongodb
- HashiCorp Vault Agent Injector annotations documentation: https://developer.hashicorp.com/vault/docs/deploy/kubernetes/injector/annotations
- HashiCorp Vault lease CLI documentation: https://developer.hashicorp.com/vault/docs/commands/lease
- HashiCorp Vault `/sys/leases` API documentation: https://developer.hashicorp.com/vault/api-docs/system/leases
- HashiCorp Vault Kubernetes auth API documentation: https://developer.hashicorp.com/vault/api-docs/auth/kubernetes
- Go `io/ioutil` package documentation: https://pkg.go.dev/io/ioutil
- Go HashiCorp Vault API package documentation: https://pkg.go.dev/github.com/hashicorp/vault/api
- hvac Kubernetes auth documentation: https://python-hvac.org/en/stable/usage/auth_methods/kubernetes.html

## Issues Found
- The workflow description said Vault automatically renews the lease if the application is still running. Vault issues renewable leases, but renewal must be performed by a client or Vault Agent. Updated the wording to say the application or Vault Agent renews or refreshes credentials.
- The PostgreSQL database configuration allowed only `app-role` and `readonly-role`, but the post later creates `admin-role` against the same database config. Added `admin-role` to `allowed_roles` so the role can issue credentials.
- The `database/rotate-root/postgres` command was labeled as a connection test. This command rotates Vault's stored root database credentials. Updated the comment to describe it as root credential rotation.
- The Go example used the deprecated `io/ioutil` package. Replaced it with `os.ReadFile`, which is the current Go standard library API.
- The Vault Agent wording implied applications automatically consume updated credentials. Vault Agent renders updated files, but the application must reload the file or restart to use the new values. Added that caveat.

## Review Notes
The examples are technically valid after the corrections, but production systems should add stronger error handling around lease renewal, database reconnection, TLS verification, and PostgreSQL privilege scoping. The sample Vault Agent template renders shell exports at container start; long-running applications need explicit reload behavior to consume later file updates.
