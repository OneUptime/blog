# Validation Summary: How to Use Terraform String Directives for Loops and Conditions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HCL
- Terraform string templates and directives
- Terraform `templatefile`
- JSON generation from Terraform values
- Nginx configuration snippets
- systemd unit file templates

## Sources Consulted
- Terraform official documentation: Strings and Templates - https://developer.hashicorp.com/terraform/language/expressions/strings
- Terraform official documentation: `templatefile` Function - https://developer.hashicorp.com/terraform/language/functions/templatefile
- Terraform official documentation: `jsonencode` Function - https://developer.hashicorp.com/terraform/language/functions/jsonencode
- Terraform official documentation: For Expressions - https://developer.hashicorp.com/terraform/language/expressions/for
- NGINX official documentation: Configuring NGINX and NGINX Plus as a Web Server - https://docs.nginx.com/nginx/admin-guide/web-server/web-server/

## Issues Found
- The directive overview said there were "three directives" but omitted the optional `%{ else }` branch from the table. Updated the wording to describe two block directive types and added `%{ else }` as the optional conditional branch.
- The Nginx heredoc used `$$scheme`, `$$host`, `$$request_uri`, and `$$http_upgrade`. Terraform only has a special dollar escape for `$${`, so these would render as doubled dollar signs rather than normal Nginx variables. Updated them to `$scheme`, `$host`, `$request_uri`, and `$http_upgrade`.
- The whitespace marker explanation referred to `{~` instead of the actual Terraform strip marker form `%{~`. Updated the comment to match Terraform syntax.
- The JSON-generation example interpolated string values directly inside JSON quotes, which can break JSON escaping for values containing quotes, backslashes, or other escaped characters. Updated the example to use `${jsonencode(...)}` for the string values while keeping the directive-based loop and comma logic.

## Review Notes
Terraform was not installed in the local workspace, so validation was performed against the official Terraform language documentation rather than by running `terraform validate`. The post is now technically accurate for current Terraform string template directive behavior.
