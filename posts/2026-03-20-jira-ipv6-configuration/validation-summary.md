# Validation Summary: How to Configure Jira with IPv6

## Status
validated

## Post Type
Guide / configuration tutorial

## Technologies Covered
- Jira Data Center / Jira Software / Jira Service Management
- Apache Tomcat connector configuration
- Nginx reverse proxy configuration
- Java/JVM IPv4 and IPv6 networking properties
- PostgreSQL JDBC connectivity
- Linux networking and firewall tooling (`ss`, `curl`, `ip6tables`)
- IPv6 addressing and listener configuration

## Sources Consulted
- Atlassian: Setting properties and options on startup — https://confluence.atlassian.com/adminjiraserver/setting-properties-and-options-on-startup-938847831.html
- Atlassian: Start and Stop Jira applications — https://confluence.atlassian.com/adminjiraserver/start-and-stop-jira-applications-938847802.html
- Atlassian: Configuring the base URL — https://confluence.atlassian.com/adminjiraserver/configuring-the-base-url-938847830.html
- Atlassian: Connecting Jira applications to PostgreSQL — https://confluence.atlassian.com/adminjiraserver/connecting-jira-applications-to-postgresql-938846851.html
- Atlassian: Integrating Jira with Apache using SSL — https://confluence.atlassian.com/adminjiraserver0909/integrating-jira-with-apache-using-ssl-1251416651.html
- Apache Tomcat 9 HTTP Connector reference — https://tomcat.apache.org/tomcat-9.0-doc/config/http
- Oracle Java networking properties — https://docs.oracle.com/en/java/javase/24/docs/api/java.base/java/net/doc-files/net-properties.html
- Oracle Java IPv6 guide — https://docs.oracle.com/javase/8/docs/technotes/guides/net/ipv6_guide/
- pgJDBC connection documentation — https://jdbc.postgresql.org/documentation/use/
- NGINX HTTP/2 module docs — https://nginx.org/en/docs/http/ngx_http_v2_module.html
- NGINX 1.25.1 announcement — https://mailman.nginx.org/pipermail/nginx-announce/2023/BYSVLPUZESCZHJMTDD25QD7ZKZYADAR2.html
- Local CLI help used to confirm flags: `ss --help`, `curl --help all`

## Issues Found
- The Tomcat connector example was incomplete for the post's HTTPS reverse-proxy scenario. I added `proxyName`, `proxyPort`, `scheme`, and `secure` so the public URL handling matches Atlassian's documented proxy configuration.
- The restart command used `sudo systemctl restart jira`, which is not the Linux service control method documented by Atlassian. I replaced it with `/etc/init.d/jira stop` and `/etc/init.d/jira start`.
- The Nginx example used the deprecated `listen ... http2` syntax. I updated it to the current `http2 on;` form with non-deprecated `listen ... ssl` directives.
- The Base URL note was too absolute about avoiding raw IPv6 literals. I changed it to the technically correct guidance: prefer an FQDN with an AAAA record and ensure the Base URL exactly matches the user-facing URL.
- The PostgreSQL JDBC example used an invalid IPv6 literal host (`2001:db8::postgres`) and omitted standard Jira `dbconfig.xml` elements required by Atlassian's sample for PostgreSQL. I replaced the host with a valid documentation-prefix IPv6 address and added `delegator-name` and `schema-name`.
- The Jira JVM section used `JAVA_OPTS`, which is not the variable Atlassian documents for adding JVM system properties in `setenv.sh`. I changed it to `JVM_SUPPORT_RECOMMENDED_ARGS`.
- The JVM explanation incorrectly stated that preferring the IPv4 stack is the default behavior and suggested `preferIPv4Stack=false` for IPv6-only environments. I corrected this to match Oracle's documentation: Java uses IPv6-capable sockets by default when IPv6 is available, and `preferIPv6Addresses` only changes address-family preference for name resolution.
- The firewall example used an invalid IPv6 subnet (`2001:db8:internal::/48`) and an unsafe persistence command where shell redirection would not run with elevated privileges. I replaced the subnet with a valid documentation-prefix CIDR and changed the save command to use `sudo tee`.
- The IPv6 curl test used an invalid literal host (`2001:db8::jira`) and assumed a `/jira/` context path that is not established elsewhere in the post. I replaced it with a valid IPv6 literal and a root-path request.
- The closing explanation overstated the role of `address="::"` by implying that this alone "enables" IPv6 support. I corrected the wording to say that it binds the connector to IPv6, while the reverse proxy can expose IPv6 listeners independently.

## Review Notes
- Current official Atlassian documentation for self-managed Jira is Data Center documentation; Jira Server support ended on February 15, 2024.
- Tomcat's Java NIO/NIO2 connectors listen on both IPv4 and IPv6 when bound to `0.0.0.0` or `::`, unless JVM settings change that behavior.
- The updated Nginx example is valid on current NGINX releases. If a future revision wants HTTP/2 enabled only on TLS and never on port 80, the port 80 and 443 listeners could be split into separate `server` blocks.
