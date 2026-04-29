# Validation Summary: How to Deploy Mailtrap via Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer stacks
- Docker Compose
- Docker networking
- Mailpit
- SMTP
- Nodemailer
- Django email settings
- Laravel mail configuration

## Sources Consulted
- Portainer stack deployment docs: https://docs.portainer.io/sts/user/docker/stacks/add
- Mailpit Docker docs: https://mailpit.axllent.org/docs/install/docker/
- Mailpit email storage docs: https://mailpit.axllent.org/docs/configuration/email-storage/
- Mailpit SMTP server docs: https://mailpit.axllent.org/docs/configuration/smtp/
- Mailpit SMTP forwarding docs: https://mailpit.axllent.org/docs/configuration/smtp-forward/
- Mailpit Web UI and API docs: https://mailpit.axllent.org/docs/configuration/http/
- Mailpit API v1 docs: https://mailpit.axllent.org/docs/api-v1/
- Mailpit OpenAPI spec: https://raw.githubusercontent.com/axllent/mailpit/master/server/ui/api/v1/swagger.json
- Nodemailer SMTP transport docs: https://nodemailer.com/smtp
- Django settings docs: https://docs.djangoproject.com/en/stable/ref/settings/
- Laravel Sail mail docs: https://laravel.com/docs/12.x/sail
- Laravel 12 application mail config: https://raw.githubusercontent.com/laravel/laravel/12.x/config/mail.php
- Laravel 12 example environment file: https://raw.githubusercontent.com/laravel/laravel/12.x/.env.example
- Docker Compose network reference: https://docs.docker.com/reference/compose-file/networks/
- Docker Compose version/name reference: https://docs.docker.com/reference/compose-file/version-and-name/

## Issues Found
- The post title said Mailtrap even though the tutorial actually deploys Mailpit. I updated the title and description so the post matches the software being deployed.
- The Compose stack mounted `/data` but did not set `MP_DATABASE`, so captured messages would not persist across restarts. I added `MP_DATABASE: /data/mailpit.db` based on Mailpit's Docker and storage docs.
- The commented Mailpit relay example described forwarding all emails to a real address, but Mailpit relaying and forwarding are different features. I replaced the example with the correct `MP_SMTP_FORWARD_*` variables for forwarding a copy to a mailbox.
- The SMTP certificate comment said it would enable TLS, but Mailpit enables STARTTLS unless SMTP TLS is explicitly required. I corrected the comment to match Mailpit's behavior.
- The shared-network example was not reliably reusable across stacks because the network name was left project-scoped. I added an explicit `name: mailpit-net` and referenced that same external network name in the companion Compose example.
- The Laravel example used `MAIL_ENCRYPTION`, which is outdated for current Laravel application skeletons. I updated it to `MAIL_SCHEME=null`.
- The UI walkthrough implied spam scoring is always available. I clarified that spam analysis requires SpamAssassin integration.
- The API example used `/api/v1/message/{messageID}`. I updated it to `/api/v1/message/{ID}` to match Mailpit's published API spec.
- The stack snippet included the obsolete top-level Compose `version` field. I removed it to match the current Compose specification.
- The introduction and conclusion overstated Mailpit as equivalent or identical to Mailtrap. I narrowed those claims to the core SMTP testing workflow that Mailpit actually covers.
- The Docker prerequisite specified `20.10+`, which is outdated against current Portainer compatibility guidance. I changed it to use the Docker version supported by the reader's Portainer release.

## Review Notes
- No remaining technical issues found after the fixes.
- If `MP_UI_AUTH` is enabled, Mailpit applies basic authentication to both the web UI and the API. The post's unauthenticated `curl` examples remain correct for the default configuration.
