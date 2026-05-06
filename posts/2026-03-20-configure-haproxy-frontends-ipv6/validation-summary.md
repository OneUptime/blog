# Validation Summary: How to Configure HAProxy Frontends with IPv6 Bind Addresses

## Status
validated

## Post Type
Guide

## Technologies Covered
- HAProxy frontends and bind directives
- IPv6 and dual-stack listener configuration
- HAProxy ACLs
- TLS/SSL configuration in HAProxy
- Linux networking and service commands (`ss`, `systemctl`)
- `curl`

## Sources Consulted
- HAProxy Frontends tutorial: https://www.haproxy.com/documentation/haproxy-configuration-tutorials/proxying-essentials/configuration-basics/frontends/
- HAProxy Global TLS settings: https://www.haproxy.com/documentation/haproxy-configuration-tutorials/security/ssl-tls/global-tls-settings/
- HAProxy ACLs tutorial: https://www.haproxy.com/documentation/haproxy-configuration-tutorials/proxying-essentials/custom-rules/acls/
- HAProxy Configuration Manual (latest): https://www.haproxy.com/documentation/haproxy-configuration-manual/latest/
- HAProxy Configuration Manual 1.8r1 bind option reference (`v4v6`, `v6only`): https://www.haproxy.com/documentation/haproxy-configuration-manual/1-8r1/
- Local command help checked in the review environment: `ss --help`, `curl --help all`, `systemctl --help`

## Issues Found
- The post described `bind [::]:80` as IPv6-only. HAProxy documents `v6only` for an IPv6-only listener, so the example and summary were corrected to `bind [::]:80 v6only`.
- The dual-stack example used separate `bind *:80` and `bind [::]:80` lines without addressing HAProxy's documented `v4v6` behavior on the IPv6 wildcard bind. The example and summary were corrected to `bind [::]:80 v4v6`.
- The HTTPS example placed `ssl-default-bind-options` and `ssl-default-bind-ciphers` inside a `frontend`, but HAProxy documents those as `global` directives. They were moved into a `global` section in the snippet.
- The HTTPS frontend was labeled as IPv6-only while binding to `[::]:443` without `v6only`. The bind line was corrected to `bind [::]:443 v6only ssl crt /etc/ssl/haproxy/example.com.pem`.
- The ACL example used an invalid IPv6 prefix, `2001:db8:internal::/48`, which is not valid IPv6 syntax. It was corrected to the valid documentation prefix `2001:db8:100::/48`.
- The ACL section described a generic IPv6-client ACL, but the example actually matched specific ranges from a file. The comment and routing condition were adjusted so the snippet accurately reflects file-based IPv6 range matching plus an inline IPv6 subnet ACL.
- The description said the post covered binding to specific IPv6 interfaces, but the examples showed binding to IPv6 addresses. The description was corrected to say addresses.

## Review Notes
- The examples now align with HAProxy's documented `v4v6` and `v6only` bind options, which matter because wildcard IPv6 binds can otherwise behave differently depending on platform defaults.
- The command examples (`ss -6`, `curl -6`, `systemctl reload`) were checked against local help output where applicable.
- The `haproxy` executable is not installed in this review environment, so I could not run `haproxy -c` locally; the configuration syntax review relied on HAProxy's official documentation.
