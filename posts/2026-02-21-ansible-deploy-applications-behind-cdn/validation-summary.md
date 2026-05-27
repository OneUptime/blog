# Validation Summary: How to Use Ansible to Deploy Applications Behind CDN

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Ansible playbooks, roles, handlers, tags, and built-in modules
- Nginx reverse proxy and cache headers
- AWS CLI for S3 sync and CloudFront invalidations
- Amazon CloudFront CDN caching and invalidation paths
- Cloudflare Cache Purge API
- HTTP Cache-Control headers

## Sources Consulted
- Ansible apt module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_module.html
- Ansible service module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/service_module.html
- Ansible handlers documentation: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_handlers.html
- Ansible tags documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_tags.html
- Ansible uri module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/uri_module.html
- AWS CLI CloudFront create-invalidation documentation: https://docs.aws.amazon.com/cli/latest/reference/cloudfront/create-invalidation.html
- AWS CLI CloudFront wait invalidation-completed documentation: https://docs.aws.amazon.com/cli/latest/reference/cloudfront/wait/invalidation-completed.html
- AWS CLI S3 sync documentation: https://docs.aws.amazon.com/cli/latest/reference/s3/sync.html
- Amazon CloudFront invalidation path documentation: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/invalidation-specifying-objects.html
- Cloudflare Cache Purge API documentation: https://developers.cloudflare.com/api/resources/cache/methods/purge/
- Nginx headers/expires module documentation: https://nginx.org/r/expires

## Issues Found
- The origin server role used `notify: reload nginx` but the project structure and examples did not define the handler. Added `roles/origin_server/handlers/main.yml` to the project structure and included a `reload nginx` handler using the Ansible `service` module.
- The deployment playbook used `notify: restart application` without defining a matching handler. Added a play-level handler that restarts the service named by `app_name`.
- The CDN play was documented as runnable with `--tags cdn`, but the playbook did not apply a `cdn` tag to the role. Added the tag to the `cdn_config` role declaration.
- The CDN role installs `awscli` while running against `localhost` with a local connection, but the play did not use privilege escalation. Added `become: yes` only to the package installation task so AWS commands can still run as the invoking user with that user's credentials.

## Review Notes
- The AWS CLI CloudFront invalidation and waiter commands use valid current options.
- The Cloudflare purge examples match the documented `purge_everything` and `files` request bodies.
- The Nginx `expires` directive does set `Expires` and `Cache-Control: max-age=...`; the explicit `Cache-Control` headers are plausible but may create multiple Cache-Control fields depending on final Nginx behavior and should be tested in the target environment.
- The examples use short Ansible module names such as `apt`, `service`, and `uri`. These remain valid, though Ansible documentation recommends fully qualified collection names such as `ansible.builtin.apt` for clarity.
