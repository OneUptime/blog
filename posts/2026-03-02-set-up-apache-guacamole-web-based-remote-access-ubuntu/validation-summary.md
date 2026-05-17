# Validation Summary: How to Set Up Apache Guacamole for Web-Based Remote Access on Ubuntu

## Status
validated

## Post Type
Tutorial / Setup guide

## Technologies Covered
- Apache Guacamole 1.5.5 (guacamole-server / guacd and guacamole-client)
- Apache Tomcat 9
- FreeRDP 2, libVNCServer, libssh2 (Guacamole protocol backends)
- Nginx (reverse proxy with WebSocket / tunnel support)
- MySQL / MySQL Connector/J 8.x (JDBC authentication extension)
- Ubuntu (apt packages, systemd, ufw)

## Sources Consulted
- Apache Guacamole Manual — Installing Guacamole natively: https://guacamole.apache.org/doc/gug/installing-guacamole.html
- Apache Guacamole Manual — Configuring Guacamole: https://guacamole.apache.org/doc/gug/configuring-guacamole.html
- Apache Guacamole Manual — Configuring user-mapping.xml: https://guacamole.apache.org/doc/gug/configuring-guacamole.html#user-mapping
- Apache Guacamole Manual — JDBC authentication: https://guacamole.apache.org/doc/gug/jdbc-auth.html
- Apache Guacamole Manual — Proxying Guacamole (Nginx): https://guacamole.apache.org/doc/gug/reverse-proxy.html
- Apache Guacamole releases listing: https://guacamole.apache.org/releases/
- Ubuntu 22.04 package index for `freerdp2-dev`, `libjpeg-turbo8-dev`, `libvncserver-dev`, `tomcat9` etc.
- MySQL Connector/J download page: https://dev.mysql.com/downloads/connector/j/

## Issues Found
1. **Deprecated `auth-provider` property with non-existent class name.** The `guacamole.properties` example contained:
   ```
   auth-provider: net.sourceforge.guacamole.net.basic.BasicFileAuthenticationProvider
   ```
   The `auth-provider` property has been deprecated since Guacamole 0.9.7, when all built-in authentication providers (including the file-based one) were moved into bundled extensions that are loaded automatically. Additionally, the class `net.sourceforge.guacamole.net.basic.BasicFileAuthenticationProvider` no longer exists in Guacamole 1.5.5 — leaving this line in place would cause Guacamole to fail to start with a `ClassNotFoundException`. Removed the `auth-provider` line and added a short note explaining that the file-based auth extension is loaded automatically when `user-mapping.xml` is present in `GUACAMOLE_HOME`. The `basic-user-mapping` property remains valid in 1.5.5 and is kept.

## Review Notes
- Guacamole 1.5.5 is a real, valid release; the download URLs under `https://downloads.apache.org/guacamole/1.5.5/` are correctly formed for both the server tarball and the client WAR / JDBC tarball.
- The Ubuntu 22.04 build-dependency list is accurate (correct package names: `freerdp2-dev`, `libjpeg-turbo8-dev`, `libvncserver-dev`, `libssh2-1-dev`, etc.). On Ubuntu 24.04 the `tomcat9` package is no longer in the default repos (replaced by `tomcat10`); the post implicitly targets Ubuntu 22.04, which is fine but worth a future caveat.
- Setting `GUACAMOLE_HOME=/etc/guacamole` in `/etc/default/tomcat9` works on Ubuntu's tomcat9 packaging (the file is sourced by the systemd unit and env vars are exported into the JVM). The follow-up `~/.guacamole` symlink to `/etc/guacamole` serves as a reliable fallback, so the belt-and-suspenders approach is appropriate.
- The Nginx config matches the official Guacamole reverse-proxy example, including `proxy_set_header Connection $http_connection;` — this is the upstream-recommended form. The more conservative pattern (using a `map $http_upgrade $connection_upgrade { ... }` block and `Connection $connection_upgrade`) is an alternative if clients ever send non-standard `Connection` headers, but the current form is consistent with official docs.
- The MySQL JDBC setup grants `SELECT, INSERT, UPDATE, DELETE` on `guacamole_db.*`, which matches the privileges documented in the Guacamole JDBC auth guide.
- The default `guacadmin` / `guacadmin` credentials after running the MySQL schema are correctly noted; the recommendation to change them on first login is appropriate.
- Newer Guacamole versions (1.6.x) have since been released; for new deployments, readers may want to bump `GUAC_VERSION` accordingly and re-check that the JDBC extension and connector versions still line up.
