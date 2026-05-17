# Validation Summary: How to Set Up WebDAV File Sharing on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- WebDAV (RFC 4918)
- Apache HTTP Server (mod_dav, mod_dav_fs, mod_auth_basic, mod_authn_file)
- Nginx (with nginx-extras / libnginx-mod-http-dav-ext)
- Let's Encrypt / Certbot
- htpasswd (apache2-utils)
- davfs2
- cadaver (command-line WebDAV client)
- Nautilus, Windows Explorer, macOS Finder client integration
- UFW firewall

## Sources Consulted
- Apache mod_dav documentation: https://httpd.apache.org/docs/current/mod/mod_dav.html
- Apache mod_dav_fs documentation: https://httpd.apache.org/docs/current/mod/mod_dav_fs.html
- Apache mod_authn_file / mod_auth_basic documentation
- Apache `LimitRequestBody` directive: https://httpd.apache.org/docs/current/mod/core.html#limitrequestbody
- Nginx ngx_http_dav_module: https://nginx.org/en/docs/http/ngx_http_dav_module.html
- Nginx nginx-dav-ext-module: https://github.com/arut/nginx-dav-ext-module
- Ubuntu `nginx-extras` package (verified it depends on `libnginx-mod-http-dav-ext`)
- davfs2 documentation and `mount.davfs(8)` man page
- cadaver documentation: http://www.webdav.org/cadaver/
- Certbot Apache plugin docs: https://eff-certbot.readthedocs.io/
- RFC 4918 (HTTP Extensions for WebDAV)
- Windows `WebClient` service / WebDAV BasicAuthLevel behavior

## Issues Found
1. **Incorrect directive attribution in troubleshooting section.** The post originally stated: "Check the `client_max_body_size` in Apache/Nginx configuration." `client_max_body_size` is an Nginx-only directive; Apache uses `LimitRequestBody`. Updated the troubleshooting entry to mention both directives correctly and to note the Nginx default of 1 MB (Apache's `LimitRequestBody` defaults to 0/unlimited).

## Review Notes
- The Apache module names (`dav`, `dav_fs`, `auth_basic`, `authn_file`) and `a2enmod`/`a2ensite`/`a2dissite` commands are correct.
- The `DavLockDB` directive must reference a path the Apache user can write to and not be inside a DAV-enabled location; the post places it correctly at `/var/lib/dav/lockdb`.
- The Nginx `dav_methods`, `dav_ext_methods`, `create_full_put_path`, and `dav_access` directives are correctly named and used. The post could optionally include `LOCK UNLOCK` in `dav_ext_methods` for fuller WebDAV class-2 compliance with clients that need locking, but the example as written is valid.
- The Ubuntu `nginx-extras` package (verified on 24.04) does depend on `libnginx-mod-http-dav-ext`, so the install path described works.
- The `awk '{print $3}'` log analysis assumes Apache's `combined` log format, which the post configures — so $3 correctly extracts the authenticated user (`%u`).
- The Windows note about HTTPS being required is accurate: the WebClient service's `BasicAuthLevel` defaults to disallowing Basic auth over HTTP to non-localhost destinations.
- `davfs2` uses `/etc/davfs2/secrets` for system mounts (via `sudo mount` or fstab) and `~/.davfs2/secrets` for per-user mounts. The example mixes both contexts, but the syntax shown in each is correct.
- WebDAV Basic auth credentials are base64-encoded (not encrypted) — the post correctly emphasizes HTTPS in production.
