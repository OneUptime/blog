# Validation Summary: How to Set Up Xdebug for PHP Remote Debugging on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux
- PHP
- Xdebug 3
- PECL
- Remi RPM repository
- PHP-FPM
- Visual Studio Code PHP debugging
- firewalld

## Sources Consulted
- Xdebug installation documentation: https://xdebug.org/docs/install3
- Xdebug step debugging documentation: https://xdebug.org/docs/step_debug
- Xdebug all settings documentation: https://xdebug.org/docs/all_settings
- Xdebug 2 to 3 upgrade guide: https://xdebug.org/docs/upgrade_guide
- Remi RPM repository package listings for `php-pecl-xdebug3`: https://rpms.remirepo.net/
- firewalld rich language manual: https://firewalld.org/documentation/man-pages/firewalld.richlanguage
- VS Code PHP debugging launch configuration documentation: https://docs.devsense.com/vscode/debug/launch-json/

## Issues Found
- The Remi package example used `php-xdebug`, which may install an older distribution package rather than the Xdebug 3 Remi package. Changed it to `php-pecl-xdebug3`.
- The custom Xdebug ini file used `/etc/php.d/15-xdebug.ini`. Xdebug documentation recommends using a later ini file such as `99-xdebug.ini` when creating a new file, especially so Xdebug loads after OPcache. Updated the path.
- The comment for `xdebug.start_with_request=trigger` said debugging starts on every request. In Xdebug 3, `trigger` starts debugging only when an `XDEBUG_TRIGGER` or legacy debug trigger is present. Corrected the comment.
- The browser trigger wording said to add a generic trigger cookie. Xdebug Helper commonly uses the legacy `XDEBUG_SESSION` cookie for step debugging, which Xdebug 3 still supports. Clarified the cookie name.
- The firewalld example opened port 9003 from the IDE host on the PHP server. Xdebug connects from PHP to the IDE, so the inbound firewall rule belongs on the IDE host and should allow the PHP server as the source. Corrected the comment and example source address.

## Review Notes
- The PECL command remains technically valid, but Xdebug now documents PECL as deprecated in favor of PIE. A future update could add PIE as the preferred source-based installer without changing the core tutorial flow.
- `xdebug.start_with_request=trigger` prevents the step debugger from starting without a trigger, but loading Xdebug can still add overhead. Keeping Xdebug disabled in production remains the right operational guidance.
