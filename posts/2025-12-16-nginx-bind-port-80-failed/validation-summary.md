# Validation Summary: How to Fix 'bind() to [::]:80 failed' Errors in Nginx

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Nginx
- Linux networking and privileged ports
- `lsof`, `ss`, `netstat`, `iproute2`
- systemd
- SELinux
- AppArmor
- Docker Compose
- Linux capabilities
- authbind

## Sources Consulted
- Nginx `ngx_http_core_module` documentation for the `listen` directive: https://nginx.org/en/docs/http/ngx_http_core_module.html
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/
- Docker Compose networking documentation: https://docs.docker.com/compose/how-tos/networking/
- Red Hat SELinux documentation for HTTP service port labels: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/6/html/managing_confined_services/sect-managing_confined_services-configuration_examples-changing_port_numbers
- F5 NGINX SELinux guidance for bind/listen failures and `http_port_t`: https://www.f5.com/company/blog/nginx/using-nginx-plus-with-selinux
- `systemd.service(5)` manual page mirror: https://man.archlinux.org/man/systemd.service.5.en
- Local command help in the review environment: `ss --help`, `lsof -h`, `systemctl --help`, `docker compose config --help`, `setcap -h`, `getcap -h`

## Issues Found
- The SELinux section incorrectly said `httpd_can_network_connect` allows Nginx to bind to any port. That boolean allows outbound TCP connections from the `httpd_t` domain; bind/listen failures on non-standard ports are handled by labeling the port with `http_port_t`. I replaced the boolean command with `semanage port -l | grep -w http_port_t` and an example `semanage port -a -t http_port_t -p tcp 8081`.
- The SELinux example tried to add TCP port 80 to `http_port_t`. Port 80 is normally already part of the HTTP port type, so that command would usually fail with "already defined" and would not be a useful bind-error fix. I changed the example to a non-standard port.
- The Docker Compose example used the legacy top-level `version: '3.8'` field. Current Docker Compose documentation recommends the Compose Specification, where legacy 2.x/3.x formats have been merged. I removed the obsolete `version` line.
- The Docker "Solutions" block was marked as `bash` even though it mixed a shell command with YAML snippets. I changed the fence to `text` so the YAML fragments are not presented as runnable shell code.
- The Docker host-networking option did not mention that `ports` mappings must not be used with `network_mode: host`. I adjusted the note to say host networking should be used without port mappings.

## Review Notes
- The corrected Docker Compose snippets were validated with `docker compose -f - config -q`.
- The Nginx `listen 80`, `listen 0.0.0.0:80`, and `listen [::]:80` examples match the official `listen` directive syntax.
- The Linux port-inspection commands using `lsof` and `ss` use valid options. `netstat` is commonly unavailable on minimal modern systems unless `net-tools` is installed, but the command shown is still valid where `netstat` is present.
- The `authbind` and `setcap` examples are technically valid patterns, but real package layouts vary by distribution. Users may need to adjust the Nginx binary path or service user.
