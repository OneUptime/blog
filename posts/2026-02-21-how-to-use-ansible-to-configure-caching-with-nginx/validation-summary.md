# Validation Summary: How to Use Ansible to Configure Caching with Nginx

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- Nginx
- Nginx proxy caching
- Browser caching headers
- Linux cron

## Sources Consulted
- NGINX proxy module documentation: https://nginx.org/en/docs/http/ngx_http_proxy_module.html
- NGINX headers module documentation: https://nginx.org/en/docs/http/ngx_http_headers_module.html#expires
- NGINX content caching guide: https://docs.nginx.com/nginx/admin-guide/content-cache/content-caching/
- NGINX command-line parameters: https://nginx.org/en/docs/switches.html
- NGINX request processing and location matching documentation: https://nginx.org/en/docs/http/request_processing.html
- Ansible apt module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/apt_module.html
- Ansible handlers documentation: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_handlers.html
- Ansible cron module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/cron_module.html
- Ansible systemd module documentation: https://docs.ansible.com/projects/ansible-core/2.13/collections/ansible/builtin/systemd_module.html

## Issues Found
- The optional purge configuration used `proxy_cache_purge` with a cache zone and explicit key, but the Nginx directive arguments are purge conditions. Updated the purge example to use the documented NGINX Plus `PURGE` method pattern with `geo`, `map`, and `proxy_cache_purge $purge_method`.
- The playbook enabled cache purge while installing the normal `nginx` package with `apt`, but `proxy_cache_purge` is an NGINX Plus commercial feature. Changed the playbook to leave purge disabled and added comments noting that enabling it requires NGINX Plus.
- Bypass path locations used plain prefix locations, which could be overridden by the earlier static-asset regex location for matching asset URLs. Changed those locations to `^~` prefix matches so bypass paths take precedence over regex static caching.
- The Ansible handler validated Nginx and then notified a reload handler, but `changed_when: false` would prevent the chained notification from firing. Changed the handlers to use a shared `listen` topic so validation and reload both run when configuration changes notify `Validate and reload nginx`.
- The monitoring command assumed cache status was already the final access-log field. Clarified that `$upstream_cache_status` must be added to the Nginx access log format before the command is meaningful.
- The post stated generally that requests with cookies were skipped from cache, but the example only checks the configured `session` cookie. Updated the wording to avoid overclaiming.

## Review Notes
The remaining examples are broadly correct for Debian/Ubuntu-style Nginx layouts where `/etc/nginx/conf.d/*.conf` is included at the `http` level and `/etc/nginx/sites-enabled/*` is included for server blocks. The cache verification example still depends on the backend returning cacheable responses.
