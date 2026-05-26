# Validation Summary: How to Use Ansible to Set Up a Complete LEMP Stack

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- LEMP stack
- Nginx
- PHP-FPM
- MySQL
- PHP PDO
- UFW
- SSH service management

## Sources Consulted
- Ansible `ansible.builtin.apt_repository` documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_repository_module.html
- Ansible `ansible.builtin.service` documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/service_module.html
- Ansible `community.general.timezone` documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/timezone_module.html
- Ansible `community.general.ufw` documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/ufw_module.html
- Ansible MySQL collection documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/mysql/index.html
- Nginx FastCGI module documentation: https://nginx.org/en/docs/http/ngx_http_fastcgi_module.html
- PHP-FPM configuration documentation: https://www.php.net/manual/en/install.fpm.configuration.php
- PHP PDO MySQL DSN documentation: https://www.php.net/manual/en/ref.pdo-mysql.connection.php
- MDN `X-XSS-Protection` header reference: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/X-XSS-Protection
- Ubuntu OpenSSH server documentation: https://ubuntu.com/server/docs/how-to/security/openssh-server/

## Issues Found
- The post described the Nginx PHP-FPM integration as reverse proxy configuration. Nginx sends these requests to PHP-FPM through its FastCGI module, so the description and role comment were changed to refer to FastCGI configuration.
- The Nginx security-header example included `X-XSS-Protection`. MDN marks this header as deprecated and not recommended for production, so the line was removed.
- The "Common Use Cases" introduction referred to "this module" even though the post covers a stack, not an Ansible module. The wording was corrected to "this stack."
- The infrastructure workflow used `ansible.builtin.timezone`, but the documented module is `community.general.timezone`. The task was updated to use the correct FQCN.
- The SSH hardening handler restarted `sshd`. For the Ubuntu/Debian-oriented examples in this post, the OpenSSH service is conventionally managed as `ssh`, so the handler was updated to restart `ssh`.

## Review Notes
- Ansible was not installed in the local environment, so I could not run `ansible-playbook --syntax-check`. The examples were reviewed manually against the official module documentation.
- The main playbook assumes a `mysql` role exists separately. The post defines MySQL variables and references the role, but it does not include the role implementation.
- The PHP PPA example is Ubuntu-specific. For Debian or other distributions, readers would need a different repository setup or the distribution's packaged PHP version.
