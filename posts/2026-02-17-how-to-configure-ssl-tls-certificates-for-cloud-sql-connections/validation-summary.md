# Validation Summary: How to Configure SSL/TLS Certificates for Cloud SQL Connections

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Google Cloud SQL
- Google Cloud CLI
- Terraform Google provider
- PostgreSQL/libpq, psycopg2, SQLAlchemy, node-postgres, pgJDBC
- MySQL client
- SQL Server sqlcmd
- Google Secret Manager
- Kubernetes Secrets

## Sources Consulted
- Google Cloud SQL for PostgreSQL: Configure SSL/TLS certificates: https://docs.cloud.google.com/sql/docs/postgres/configure-ssl-instance
- Google Cloud SQL for MySQL: Connect using a MySQL client: https://docs.cloud.google.com/sql/docs/mysql/connect-admin-ip
- Google Cloud SQL for MySQL: Authorize with SSL/TLS certificates: https://cloud.google.com/sql/docs/mysql/authorize-ssl
- Google Cloud SQL for SQL Server: Configure SSL/TLS certificates: https://docs.cloud.google.com/sql/docs/sqlserver/configure-ssl-instance
- Google Cloud SQL Auth Proxy documentation: https://docs.cloud.google.com/sql/docs/mysql/connect-auth-proxy
- Google Cloud SDK `gcloud sql instances patch`: https://docs.cloud.google.com/sdk/gcloud/reference/sql/instances/patch
- Google Cloud SDK `gcloud sql ssl server-ca-certs list`: https://cloud.google.com/sdk/gcloud/reference/sql/ssl/server-ca-certs/list
- Google Cloud SDK `gcloud sql ssl client-certs create`: https://docs.cloud.google.com/sdk/gcloud/reference/sql/ssl/client-certs/create
- Google Cloud SDK `gcloud sql ssl client-certs`: https://docs.cloud.google.com/sdk/gcloud/reference/sql/ssl/client-certs
- Terraform `google_sql_database_instance`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/sql_database_instance
- PostgreSQL libpq SSL documentation: https://www.postgresql.org/docs/current/libpq-ssl.html
- node-postgres SSL documentation: https://node-postgres.com/features/ssl
- pgJDBC SSL documentation: https://jdbc.postgresql.org/documentation/ssl/
- Microsoft sqlcmd utility documentation: https://learn.microsoft.com/en-us/sql/tools/sqlcmd/sqlcmd-utility
- Google Cloud SDK `gcloud secrets create`: https://docs.cloud.google.com/sdk/gcloud/reference/secrets/create

## Issues Found
- The post used the legacy Cloud SQL `requireSsl` field and `--require-ssl` flag as the primary enforcement mechanism. Updated examples to use `settings.ipConfiguration.sslMode`, `gcloud sql instances patch --ssl-mode=ENCRYPTED_ONLY`, and Terraform `ssl_mode = "ENCRYPTED_ONLY"`, and noted `TRUSTED_CLIENT_CERTIFICATE_REQUIRED` for PostgreSQL/MySQL client-certificate enforcement.
- The post implied client certificates apply uniformly to all Cloud SQL engines. Updated the text to clarify that Cloud SQL client certificates are for PostgreSQL and MySQL, while SQL Server has different SSL/TLS behavior.
- The MySQL client example provided certificates but did not set `--ssl-mode=VERIFY_CA`. Added it so the client verifies the server CA, matching the surrounding explanation.
- The certificate expiration section stated all Cloud SQL server CA certificates expire after 10 years. Updated it to distinguish per-instance CAs from shared and customer-managed CA modes, whose server certificates have different validity periods.
- The server certificate rotation example skipped creating a new per-instance server CA when needed and suggested manually concatenating CA files. Updated it to create a new server CA if required, download updated CA information, and then rotate; also added a note to use `server-certs` commands for shared or customer-managed CA instances.
- The initial server CA download command was written as universally applicable. Clarified that `server-ca-certs` applies to the default per-instance CA mode and that shared/customer-managed CA instances use `server-certs list --format="value(ca_cert.cert)"`.

## Review Notes
The local environment did not have `gcloud` installed, so Cloud SDK commands were verified against official Google Cloud CLI reference documentation rather than local `--help` output.
