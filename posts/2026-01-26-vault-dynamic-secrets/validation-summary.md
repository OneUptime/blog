# Validation Summary: How to Use Vault Dynamic Secrets

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- HashiCorp Vault
- Vault database secrets engine
- Vault AWS secrets engine
- Vault AppRole authentication
- PostgreSQL
- Python
- hvac
- psycopg2
- boto3
- AWS IAM and STS

## Sources Consulted
- HashiCorp Vault database secrets engine documentation: https://developer.hashicorp.com/vault/docs/secrets/databases
- HashiCorp Vault PostgreSQL database secrets engine documentation: https://developer.hashicorp.com/vault/docs/secrets/databases/postgresql
- HashiCorp Vault AWS secrets engine documentation: https://developer.hashicorp.com/vault/docs/secrets/aws
- HashiCorp Vault AWS secrets engine API documentation: https://developer.hashicorp.com/vault/api-docs/secret/aws
- HashiCorp Vault lease renew CLI documentation: https://developer.hashicorp.com/vault/docs/commands/lease/renew
- HashiCorp Vault lease revoke CLI documentation: https://developer.hashicorp.com/vault/docs/commands/lease/revoke
- HashiCorp Vault system metrics API documentation: https://developer.hashicorp.com/vault/api-docs/system/metrics
- hvac database secrets engine documentation: https://python-hvac.org/en/stable/usage/secrets_engines/database.html
- hvac AWS secrets engine documentation: https://python-hvac.org/en/stable/usage/secrets_engines/aws.html
- hvac lease system backend documentation: https://python-hvac.org/en/stable/usage/system_backend/lease.html
- AWS boto3 credentials documentation: https://docs.aws.amazon.com/boto3/latest/guide/credentials.html
- AWS boto3 session/client reference: https://docs.aws.amazon.com/boto3/latest/reference/core/session.html

## Issues Found
- The post described dynamic secrets as using automatic credential rotation. Dynamic secrets are generated with leases and expire or are revoked; rotation is more precise for static credential rotation. Changed the description to say automatic expiration and TTLs.
- The first Python database manager docstring said it handled renewal, but the sample code fetches and revokes credentials without renewing the lease. Changed the wording to revocation.
- The AWS credentials example used `security_token`, but current Vault AWS secrets engine responses use `session_token`. Updated the sample output and Python code to use `session_token`, which also matches boto3's `aws_session_token` parameter.
- The AWS manager docstring said it provided automatic credential refresh, but the sample code fetches credentials and explicitly revokes them. Changed the wording to explicit credential cleanup.

## Review Notes
- Vault was not installed in the local environment, so Vault CLI behavior was verified against official HashiCorp documentation instead of local `vault --help` output.
- The Python examples were parsed with Python's `ast` module and are syntactically valid.
- The PostgreSQL role examples grant privileges on existing tables in the `public` schema. Future tables would need separate default privileges in a production setup, but the examples are technically correct as written.
