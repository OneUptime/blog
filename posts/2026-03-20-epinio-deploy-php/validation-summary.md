# Validation Summary: How to Deploy a PHP Application with Epinio

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Epinio
- Kubernetes
- Paketo Buildpacks
- Cloud Native Buildpacks
- PHP
- Composer

## Sources Consulted
- Epinio CLI reference: `epinio push` https://docs.epinio.io/references/commands/cli/epinio_push
- Epinio CLI reference: `epinio target` https://docs.epinio.io/references/commands/cli/epinio_target
- Epinio CLI reference: `epinio app show` https://docs.epinio.io/references/commands/cli/app/epinio_app_show
- Epinio CLI reference: `epinio app logs` https://docs.epinio.io/references/commands/cli/app/epinio_app_logs
- Epinio CLI reference: `epinio app update` https://docs.epinio.io/references/commands/cli/app/epinio_app_update
- Epinio CLI reference: `epinio app env list` https://docs.epinio.io/references/commands/cli/app/env/epinio_app_env_list
- Epinio CLI reference: `epinio app env set` https://docs.epinio.io/references/commands/cli/app/env/epinio_app_env_set
- Epinio supported applications https://docs.epinio.io/references/supported_applications
- Epinio detailed push process https://docs.epinio.io/explanations/detailed-push-process
- Epinio certificate issuers https://docs.epinio.io/howtos/other/certificate_issuers
- Paketo PHP buildpack how-to https://paketo.io/docs/howto/php/
- Paketo PHP buildpack reference https://paketo.io/docs/reference/php-reference/
- PHP manual: `json_encode` https://www.php.net/manual/en/function.json-encode.php
- PHP manual: `date` https://www.php.net/manual/en/function.date.php

## Issues Found
- The original application examples were a Bash script and a Node.js server, which did not match a PHP + Composer deployment guide and were not appropriate examples for Epinio's PHP buildpack flow. I replaced them with a minimal `composer.json` and `index.php` example that matches current Paketo PHP buildpack detection and Composer usage.
- The namespace verification step used `epinio namespace show my-apps`, which inspects a namespace but does not confirm the currently targeted namespace. I changed the verification command to `epinio target` and kept `epinio namespace show my-apps` as an inspection step.
- The route lookup commands used `grep Routes` and `awk '{print $2}'`, which do not match current `epinio app show` output. I updated the commands to read the route from the `Active Routes` section and build the URL correctly.
- The example custom route used `my-app.epinio.example.com` as if it were a literal working route. I changed it to `my-app.<your-system-domain>` to reflect Epinio's requirement that routes align with the configured system domain or a custom domain that resolves to the ingress controller.
- The update step claimed Epinio "performs a rolling update" without direct support from the consulted Epinio docs. I changed that wording to the technically accurate and documented behavior that Epinio deploys the updated application.
- The conclusion said Epinio can deploy "any application" to Kubernetes. I narrowed that to supported PHP applications and clarified that the PHP buildpack installs Composer dependencies for this workflow.

## Review Notes
- Review aligned the post with the current Epinio command references available on May 1, 2026, including version 1.13.10 command pages.
- The local `epinio` CLI was not installed in the workspace, so command verification was done against the official Epinio documentation rather than local `--help` output.
- Paketo's current PHP documentation states that the default web server is the PHP built-in server and that detection requires a `*.php` file in the web directory. The corrected example uses `index.php` at the application root, which matches that default behavior.
