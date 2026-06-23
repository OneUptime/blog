# Validation Summary: How to Fix '403 Forbidden for All Files' in Nginx

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- Nginx
- Linux file and directory permissions
- SELinux
- AppArmor
- Bash shell commands
- Nginx configuration directives

## Sources Consulted
- Nginx core functionality documentation: https://nginx.org/en/docs/ngx_core_module.html
- Nginx HTTP core module documentation: https://nginx.org/en/docs/http/ngx_http_core_module.html
- Nginx index module documentation: https://nginx.org/en/docs/http/ngx_http_index_module.html
- Nginx autoindex module documentation: https://nginx.org/en/docs/http/ngx_http_autoindex_module.html
- Nginx access module documentation: https://nginx.org/en/docs/http/ngx_http_access_module.html
- NGINX static content documentation: https://docs.nginx.com/nginx/admin-guide/web-server/serving-static-content/
- Red Hat SELinux HTTP server configuration examples: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/selinux_users_and_administrators_guide/sect-managing_confined_services-the_apache_http_server-configuration_examples
- Red Hat SELinux semanage fcontext documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/6/html/security-enhanced_linux/sect-security-enhanced_linux-selinux_contexts_labeling_files-persistent_changes_semanage_fcontext
- Red Hat SELinux port change documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/6/html/managing_confined_services/sect-managing_confined_services-configuration_examples-changing_port_numbers
- GNU chmod manual: https://man7.org/linux/man-pages/man1/chmod.1.html

## Issues Found
- The symbolic links section incorrectly stated that Nginx may not follow symlinks by default. Nginx's documented default for `disable_symlinks` is `off`, so symlinks are allowed by default. Updated the section to explain that symlink-related 403 errors usually come from target permissions, SELinux context, or an explicitly enabled `disable_symlinks` directive.
- The SELinux port command was described as allowing Nginx to connect to specific ports. Red Hat documents `semanage port -a -t http_port_t` as allowing HTTP services to listen on non-standard HTTP ports, so the comment was corrected.
- The debugging script only matched an unindented `user` directive and left `NGINX_USER` empty when the directive was absent. Updated the grep pattern to tolerate indentation and added Nginx's documented default user fallback of `nobody`.

## Review Notes
The article is technically relevant and broadly accurate after the corrections. The permission examples use `www-data`, which is correct for Debian/Ubuntu but should be substituted with the actual Nginx worker user on other distributions, as the post already notes earlier.
