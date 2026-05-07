# Validation Summary: How to Set Up Apache mod_proxy_fcgi for PHP-FPM Over IPv4

## Status
validated

## Post Type
Guide

## Technologies Covered
- Apache HTTP Server
- `mod_proxy`
- `mod_proxy_fcgi`
- `mod_setenvif`
- PHP-FPM
- FastCGI
- IPv4 TCP sockets
- `systemd`
- `ss`

## Sources Consulted
- Apache `mod_proxy_fcgi` docs: https://httpd.apache.org/docs/current/mod/mod_proxy_fcgi.html
- Apache `mod_proxy` docs: https://httpd.apache.org/docs/current/mod/mod_proxy.html
- Apache core `SetHandler` docs: https://httpd.apache.org/docs/current/en/mod/core.html#sethandler
- Apache `mod_setenvif` docs: https://httpd.apache.org/docs/current/en/mod/mod_setenvif.html
- Apache `httpd` program docs: https://httpd.apache.org/docs/2.4/en/programs/httpd.html
- PHP manual, FPM configuration: https://www.php.net/manual/en/install.fpm.configuration.php
- Debian `a2enmod(8)` man page: https://manpages.debian.org/bookworm/apache2/a2enmod.8.en.html
- Debian `apache2ctl(8)` man page: https://manpages.debian.org/testing/apache2/apache2ctl.8.en.html
- Local command help output: `ss --help`
- Local command help output: `curl --help`
- Local command help output: `systemctl --help`

## Issues Found
- The main `SetHandler` example claimed connection pooling benefits, but Apache’s proxy worker docs state the default reverse-proxy worker does not reuse backend connections. I added matching `<Proxy>` worker blocks with `ProxySet enablereuse=on` so the example now actually enables reuse.
- The `ProxyPassMatch` example said `SetEnvIf Authorization ...` was required to tell PHP-FPM the document root. That was incorrect. The filesystem path comes from the `fcgi://.../var/www/app/$1` target, while the `SetEnvIf` line is only useful for forwarding the `Authorization` header to PHP applications that need it. I corrected that comment and added `enablereuse=on`.
- The separate-server example said the `<Proxy>` block passed document-root information to PHP-FPM. Apache’s handler-pass-through documentation instead says `SetHandler` passes Apache’s mapped local filename to the backend. I corrected the comment and added a note that the PHP files must exist at the same path on the PHP-FPM host when using this approach.
- The expected `ss` output used an overly specific sample line. I changed it to a generic expectation that matches the documented `listen` configuration without implying a fixed backlog or exact column layout.

## Review Notes
- `ProxyPassMatch ... enablereuse=on` with backreferences depends on Apache HTTP Server 2.4.47 or later for `key=value` parameters on those rules to be honored. Current Apache documentation reflects this behavior.
- The post uses Debian/Ubuntu-style Apache management commands such as `a2enmod` and `apache2ctl`, so readers on Red Hat-family systems would need equivalent commands.
- A live Apache/PHP-FPM syntax test was not possible in this environment because `apache2ctl`, `a2enmod`, and PHP-FPM were not installed locally.
