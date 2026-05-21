# Validation Summary: How to Configure Git HTTP Backend with Nginx on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- Git and git-http-backend
- Nginx
- fcgiwrap / FastCGI
- HTTP basic authentication
- Let's Encrypt / Certbot
- Git credential helpers

## Sources Consulted
- Git git-http-backend documentation: https://git-scm.com/docs/git-http-backend/2.43.0.html
- Git git-config documentation for core.sharedRepository: https://git-scm.com/docs/git-config/2.44.3.html
- Git gitcredentials documentation: https://git-scm.com/docs/gitcredentials.html
- NGINX documentation for HTTP basic authentication: https://docs.nginx.com/nginx/admin-guide/security-controls/configuring-http-basic-authentication/
- NGINX documentation for location and regex matching: https://docs.nginx.com/nginx/admin-guide/web-server/web-server/
- Apache htpasswd documentation: https://httpd.apache.org/docs/2.4/en/programs/htpasswd.html
- Debian fcgiwrap systemd packaging reference showing fcgiwrap runs as www-data: https://sources.debian.org/patches/fcgiwrap/1.1.0-14%2Bdeb12u1/fix_systemd.patch/

## Issues Found
- Repository push permissions were incomplete. The post added `www-data` to the `git` group but initialized bare repositories without group-write sharing, so pushes handled by fcgiwrap as `www-data` could fail. Changed repository creation commands and the helper script to use `git init --bare --shared=group`, and added a `fcgiwrap` restart after changing group membership.
- The comment that `git-http-backend` requires `http.receivepack=true` was too broad. Git enables receive-pack by default for authenticated web-server users, while `true` enables it even for anonymous users. Reworded the comment to make it explicit that this is for the authenticated-only setup.
- Nginx regexes used `.git` instead of `\.git`, which could match unintended paths. Escaped the dot in the main HTTP/HTTPS examples and the per-repository examples.
- The initial HTTP example served loose and packed object files without basic authentication. Added the same `auth_basic` directives to those static object locations to avoid bypassing repository authentication.
- The per-repository examples omitted `GIT_HTTP_EXPORT_ALL`, even though the repositories created earlier do not include `git-daemon-export-ok`. Added the FastCGI parameter to those examples.
- The public read-only example could advertise anonymous push if used with a repository where `http.receivepack=true` was set. Added a note to keep `http.receivepack` unset or false for that public repository.
- The GNOME keyring credential helper example used the old `git-credential-gnome-keyring` path. Replaced it with Git's documented helper discovery flow and the current Linux `libsecret` helper example.

## Review Notes
The Nginx and fcgiwrap packages were not installed in the local review environment, so `nginx -t` could not be run here. The reviewed configuration was checked against official Git, Nginx, Apache, and Debian packaging documentation instead.
