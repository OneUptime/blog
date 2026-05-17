# Validation Summary: How to Set Up Apache with WebDAV on Ubuntu

## Status
validated

## Post Type
Tutorial / Step-by-step guide

## Technologies Covered
- Apache HTTP Server 2.4 (`mod_dav`, `mod_dav_fs`, `mod_auth_basic`, `mod_authn_file`, `mod_ssl`, `mod_headers`)
- WebDAV (RFC 4918)
- Ubuntu (`apt`, `systemctl`, `ufw`)
- `htpasswd` for HTTP Basic auth user management
- `davfs2` Linux WebDAV client
- macOS `mount_webdav`
- Windows WebClient service / Map Network Drive
- `curl` for testing WebDAV methods (PROPFIND, MKCOL, COPY, DELETE, PUT)

## Sources Consulted
- Apache `mod_dav_lock` documentation — https://httpd.apache.org/docs/2.4/mod/mod_dav_lock.html (confirms `mod_dav_fs` does not need `mod_dav_lock`)
- Apache `mod_dav_fs` documentation — https://httpd.apache.org/docs/2.4/mod/mod_dav_fs.html
- Apache `mod_dav` documentation — https://httpd.apache.org/docs/2.4/mod/mod_dav.html
- RFC 4918 (HTTP Extensions for WebDAV) for method semantics (PROPFIND, MKCOL, COPY, MOVE, LOCK, UNLOCK)
- Microsoft documentation / KB on `BasicAuthLevel` registry key for the WebClient service (KB 943280 and related)
- `davfs2` man page for mount options and `/etc/davfs2/secrets` format
- `htpasswd` man page

## Issues Found
- **Misleading `mod_dav_lock` claim** — The original post enabled `mod_dav_lock` with the comment "Locking support". Per Apache's official documentation, `mod_dav_fs` (the filesystem provider used here) implements its own locking via the `DavLockDB` directive and explicitly does **not** require `mod_dav_lock`. `mod_dav_lock` is a generic locking module for other backends (e.g., `mod_dav_svn`). Removed the `a2enmod dav_lock` line and updated the comment on `dav_fs` to mention it includes its own locking. Also updated the corresponding troubleshooting recovery command (`a2enmod dav dav_fs dav_lock` → `a2enmod dav dav_fs`).

## Review Notes
- The `Header always set MS-Author-Via "DAV"` directive in the HTTPS vhost requires `mod_headers` to be enabled. On Ubuntu/Debian, `mod_headers` is enabled by default through the `apache2` package, so this works out of the box, but readers running a minimal install may need `sudo a2enmod headers`.
- The basic HTTP vhost sets both `DocumentRoot /var/www/webdav` and `Alias /webdav /var/www/webdav` for the same path. This works, but it exposes the WebDAV tree at both `/` and `/webdav`. Not technically incorrect, just slightly unusual.
- The inner `<LimitExcept OPTIONS>` block is redundant with the outer `Require valid-user` (which already applies to all methods). Leaving it in does no harm.
- Apache documentation generally recommends `<Location>` over `<Directory>` for WebDAV because some DAV operations (e.g., on locked-but-nonexistent resources) don't have a filesystem path. Both work; the SSL vhost in the post already uses `<Location>`, which is good.
- `BasicAuthLevel = 2` for Windows is correct for allowing Basic auth over plain HTTP, but credentials are transmitted base64-only — readers should be reminded the Windows `WebClient` service must be restarted for the registry change to take effect.
- The per-user vhost example does not actually isolate users from each other (any authenticated user can access any subdirectory). The post correctly acknowledges this and points to `AuthzSendForbiddenOnFailure` / LDAP for stricter isolation.
