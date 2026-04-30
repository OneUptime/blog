# Validation Summary: How to Set Up an Internal Registry for OpenTofu Modules

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- OpenTofu
- Module Registry Protocol
- GitLab Terraform Module Registry
- NGINX
- Python
- Flask
- Bash
- GitHub Actions
- Amazon S3

## Sources Consulted
- OpenTofu Module Registry Protocol: https://opentofu.org/docs/v1.8/internals/module-registry-protocol/
- OpenTofu Module Sources: https://opentofu.org/docs/v1.9/language/modules/sources/
- OpenTofu CLI Configuration File: https://opentofu.org/docs/v1.11/cli/config/config-file/
- OpenTofu Command: init: https://opentofu.org/docs/v1.11/cli/commands/init/
- OpenTofu Command: validate: https://opentofu.org/docs/v1.9/cli/commands/validate/
- GitLab Terraform Module Registry: https://docs.gitlab.com/user/packages/terraform_module_registry/
- NGINX `default_type` directive: https://nginx.org/en/docs/http/ngx_http_core_module.html#default_type
- NGINX `add_header` directive: https://nginx.org/en/docs/http/ngx_http_headers_module.html#add_header
- NGINX HTTP/2 module: https://nginx.org/en/docs/http/ngx_http_v2_module.html
- `opentofu/setup-opentofu` GitHub Action: https://github.com/opentofu/setup-opentofu

## Issues Found
- The OpenTofu client config filename was wrong. The post used `~/.terraform.rc`, which is not a recognized Unix config path. I changed it to `~/.tofurc`, which is the correct OpenTofu CLI config file name, while `TF_TOKEN_...` remains a valid alternative.
- The service discovery setup was missing creation of the `.well-known` directory. I added `mkdir -p "/var/www/registry/.well-known"` so the example command sequence works as written.
- The nginx example set JSON responses with `add_header Content-Type`, which is not the right way to define the MIME type for extensionless static files like `terraform.json` and `versions`. I changed those locations to use `default_type application/json;` and added `try_files` for the discovery document.
- The nginx HTTP/2 configuration used `listen 443 ssl http2;`, which current nginx documentation deprecates. I updated it to `listen 443 ssl;` with `http2 on;`.
- The self-hosted registry explanation implied that the download endpoint must use `204` with `X-Terraform-Get`. I corrected the post to reflect the protocol accurately: the endpoint may return either JSON with a `location` value or `204` with `X-Terraform-Get`.
- The GitHub Actions workflow assumed `tofu` was already installed on `ubuntu-latest`. I added `opentofu/setup-opentofu@v2` so the validation steps can actually run.
- The workflow referenced `./scripts/publish-module.sh`, but the script snippet was labeled as `publish-module.sh`. I aligned the script snippet to `scripts/publish-module.sh`.

## Review Notes
- The post’s use of `/.well-known/terraform.json` and the `X-Terraform-Get` header is correct for OpenTofu. OpenTofu intentionally remains compatible with the Terraform registry protocol naming.
- The local workspace did not have the `tofu` binary installed, so CLI flag validation was done against the official OpenTofu command documentation rather than local `--help` output.
