# Validation Summary: How to Fix '403 Forbidden: directory index' Errors in Nginx

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Nginx HTTP server configuration
- Linux file and directory permissions
- SELinux file contexts
- FastCGI/PHP-FPM configuration
- Linux command-line debugging tools

## Sources Consulted
- Nginx ngx_http_index_module documentation: https://nginx.org/en/docs/http/ngx_http_index_module.html
- Nginx ngx_http_autoindex_module documentation: https://nginx.org/en/docs/http/ngx_http_autoindex_module.html
- Nginx ngx_http_core_module documentation, including try_files and disable_symlinks: https://nginx.org/en/docs/http/ngx_http_core_module.html
- Nginx ngx_http_addition_module documentation: https://nginx.org/en/docs/http/ngx_http_addition_module.html
- Nginx ngx_http_fastcgi_module documentation: https://nginx.org/en/docs/http/ngx_http_fastcgi_module.html
- Nginx core module user directive documentation: https://nginx.org/en/docs/ngx_core_module.html
- Nginx command-line parameters documentation: https://nginx.org/en/docs/switches.html
- Red Hat Enterprise Linux NGINX setup documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/deploying_web_servers_and_reverse_proxies/setting-up-and-configuring-nginx_deploying-web-servers-and-reverse-proxies
- Red Hat SELinux file labeling documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/selinux_users_and_administrators_guide/sect-security-enhanced_linux-working_with_selinux-selinux_contexts_labeling_files
- Local command help for namei and strace

## Issues Found
- The symlink section incorrectly implied that Nginx might not follow symlinks by default. Updated it to state that Nginx allows symlinks by default and that symlink 403 errors typically come from `disable_symlinks`, target permissions, or SELinux policy.
- The description of `disable_symlinks if_not_owner` was imprecise. Updated it to match the official behavior: access is denied when the symlink and target have different owners.
- The styled autoindex example used `add_before_body` and `add_after_body` without noting that these directives come from the optional `ngx_http_addition_module`, which is not built by default. Added a short requirement note.
- The `strace` command traced only `open`, `stat`, and `access`, which can miss modern file-access syscalls such as `openat`. Replaced it with `-e trace=%file`.
- The diagnostic script assumed the Nginx `user` directive is always present. Added a fallback to Nginx's documented default user and quoted the variable use.

## Review Notes
The remaining examples are technically valid as general Linux/Nginx troubleshooting guidance. Some commands are distribution-specific, such as the common `www-data` user on Debian/Ubuntu and SELinux tooling on RHEL-family systems, but the post already frames these as common examples rather than universal values.
