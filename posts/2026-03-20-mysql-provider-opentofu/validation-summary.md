# Validation Summary: How to Configure the MySQL Provider in OpenTofu

## Status
validated

## Post Type
Tutorial / Provider configuration guide

## Technologies Covered
- OpenTofu (v1.6+)
- HCL (HashiCorp Configuration Language)
- MySQL 5.7 / 8.0
- `petoju/mysql` Terraform / OpenTofu provider (v3.x)
- MySQL provider resources: `mysql_database`, `mysql_user`, `mysql_grant`, `mysql_role`

## Sources Consulted
- `petoju/terraform-provider-mysql` repository (the actively maintained MySQL provider since `hashicorp/mysql` was archived): https://github.com/petoju/terraform-provider-mysql
- `petoju/terraform-provider-mysql` provider schema (`mysql/provider.go`) — environment variables `MYSQL_ENDPOINT`, `MYSQL_USERNAME`, `MYSQL_PASSWORD`, `MYSQL_TLS_CONFIG`, `MYSQL_TLS_CA_CERT`, `MYSQL_TLS_CLIENT_CERT`, `MYSQL_TLS_CLIENT_KEY`
- `mysql_database` resource schema (`mysql/resource_database.go`) — `name` (required, ForceNew), `default_character_set` (default `utf8mb4`), `default_collation` (default `utf8mb4_general_ci`)
- `mysql_user` resource schema (`mysql/resource_user.go`) — `user` (required), `host` (default `localhost`), `plaintext_password`, `auth_plugin`, `tls_option` (default `NONE`)
- `mysql_grant` resource schema (`mysql/resource_grant.go`) — `user`/`role`, `host`, `database` (default `*`), `table` (default `*`), `privileges`, `roles`, `grant`
- OpenTofu Registry / Terraform Registry — `petoju/mysql` provider source format
- MySQL 8.0 Reference Manual — `caching_sha2_password` default authentication plugin, role-based access control (8.0+)

## Issues Found
The post arrived as a generic OpenTofu provider template that had not been adapted to MySQL. The title and description claimed it covered the MySQL provider, but every code block used a placeholder `example` provider, fictitious resources (`example_project`, `example_team`, `example_alert`, `example_backup_policy`), and unrelated environment variables (`PROVIDER_API_KEY`, `PROVIDER_TOKEN`, `PROVIDER_ORG`). None of the snippets would have helped a reader configure MySQL. I rewrote the technical content of every step to use the real `petoju/mysql` provider while keeping the original section structure (Step 1–6, Common Issues, Conclusion) and the author's tone.

Specific corrections:

- **Provider source.** Replaced the placeholder `example = { source = "hashicorp/example" }` with the real `mysql = { source = "petoju/mysql", version = "~> 3.0" }`. The `hashicorp/mysql` provider was archived; `petoju/mysql` is the current maintained fork.
- **Provider configuration block.** Replaced the empty `provider "example"` block with a `provider "mysql"` block using the real arguments `endpoint`, `username`, `password`, sourced from `var.mysql_endpoint`, `var.mysql_username`, `var.mysql_password`.
- **Authentication environment variables.** Replaced the fictitious `PROVIDER_API_KEY` / `PROVIDER_TOKEN` / `PROVIDER_ORG` exports with the variables the provider actually reads via `EnvDefaultFunc`: `MYSQL_ENDPOINT`, `MYSQL_USERNAME`, `MYSQL_PASSWORD`, plus the TLS-related `MYSQL_TLS_CONFIG` and `MYSQL_TLS_CA_CERT`.
- **Variable definitions.** Replaced `api_key` / `organization` variables with `mysql_endpoint`, `mysql_username`, and `mysql_password` (the password marked `sensitive = true`).
- **Basic resources.** Replaced `example_project` and `example_team` with real `mysql_database` (using `name`, `default_character_set`, `default_collation`) and `mysql_user` (using `user`, `host`, `plaintext_password`, `tls_option`) blocks.
- **Advanced resources.** Replaced the fictitious `example_alert` and `example_backup_policy` with `mysql_grant` examples (direct privileges and role-based grants) and a `mysql_role` example, which represent the kind of "advanced" configuration the MySQL provider actually supports. Kept the same heading "Step 4: Configure Advanced Settings".
- **Outputs.** Replaced `project_id` / `project_name` outputs (referencing nonexistent `example_project.main`) with `database_name` and `app_user` outputs that reference the real `mysql_database.app` and `mysql_user.app` resources.
- **Common Issues.** Rewrote the three subsections to surface real issues with the MySQL provider: admin-privilege requirements and the MySQL 8.0 `caching_sha2_password` plugin gotcha, network reachability for `tofu plan/apply` (the provider opens a live TCP connection at plan time), and provider version pinning. Removed the misleading "Rate Limiting / `depends_on`" advice — `petoju/mysql` does not use a rate-limited HTTP API.
- **Introduction and Conclusion.** Replaced the self-referential "How to Configure the MySQL Provider in OpenTofu using OpenTofu" sentence with concrete intro and conclusion text that names `petoju/mysql`, explains why it is used (the original `hashicorp/mysql` was archived), and lists the security recommendations (sensitive variables, TLS via `MYSQL_TLS_CONFIG`).
- **Prerequisites.** Replaced the generic "API credentials for the relevant service" line with MySQL-specific prerequisites: a reachable MySQL 5.7/8.0 server and an admin account with `CREATE USER` and `GRANT OPTION` privileges.

The Step 6 deploy block (`tofu init / validate / plan / apply`) was already correct and was left unchanged.

## Review Notes
- The `petoju/mysql` provider configuration argument is `endpoint` (host:port), not separate `host` and `port` fields — the post now uses `endpoint` consistently.
- The `mysql_user.host` field accepts MySQL host patterns including `%` wildcards (e.g., `10.0.%.%`); the example uses this to restrict by subnet.
- MySQL 8.0 made `caching_sha2_password` the default authentication plugin. Connections from the provider over plain TCP can fail with `ER_NOT_SUPPORTED_AUTH_MODE` — the post now mentions setting `auth_plugin = "mysql_native_password"` or enabling TLS as the workaround.
- Roles (`mysql_role`, granting roles to users) require MySQL 8.0 or later. The example notes this in a comment.
- The `mysql_grant` resource accepts either `privileges` or `roles` (they conflict), and either `user`+`host` or `role`. The examples demonstrate both forms.
- The provider opens a real connection at plan time, so OpenTofu cannot plan changes against an unreachable MySQL server. Running `tofu plan` from CI requires network access to the database (commonly handled with a self-hosted runner inside the VPC).
- Future readers should pick a current pin for `version = "~> 3.0"` if a newer major version of `petoju/mysql` ships and they want to opt in deliberately.
