# Validation Summary: How to Use Ansible to Set Up a RADIUS Server

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- FreeRADIUS
- RADIUS authentication and accounting
- LDAP integration
- EAP / WPA2-Enterprise
- UFW firewall configuration
- Linux systemd services

## Sources Consulted
- FreeRADIUS clients.conf documentation: https://www.freeradius.org/documentation/freeradius-server/4.0.0/reference/raddb/clients.conf.html
- FreeRADIUS users file manual page: https://www.freeradius.org/radiusd/man/users.html
- FreeRADIUS LDAP base configuration documentation: https://www.freeradius.org/documentation/freeradius-server/4.0.0/howto/modules/ldap/base_configuration/index.html
- FreeRADIUS upgrade notes for LDAP authentication in v3: https://www.freeradius.org/documentation/freeradius-server/3.2.9/installation/upgrade.html
- FreeRADIUS debug mode documentation: https://www.freeradius.org/documentation/freeradius-server/3.2.8/radiusd_x.html
- Ansible community.general.ufw module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/ufw_module.html
- Ansible community.general.timezone module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/timezone_module.html
- Ansible built-in module index: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/index.html
- RFC 2865 RADIUS authentication: https://www.rfc-editor.org/info/rfc2865
- RFC 2866 RADIUS accounting: https://www.rfc-editor.org/info/rfc2866

## Issues Found
- The firewall task used the short module name `ufw`. The current Ansible documentation specifies `community.general.ufw`, so the example was updated to use the fully qualified collection name.
- The RADIUS client template set `require_message_authenticator = no`. FreeRADIUS documentation says this is for legacy clients and is not recommended because it can leave deployments exposed to BlastRADIUS-style attacks. The example was changed to `auto`, which is compatible while improving protection.
- The LDAP tasks only configured and enabled the module. FreeRADIUS documentation states that LDAP must also be listed in the relevant virtual server authorization/authentication sections, so a task was added to manage the default virtual server template when LDAP is enabled.
- The users file comment described the wrong syntax, mentioning `Auth-Type := Local` and `User-Password ==`. The rendered example correctly used `Cleartext-Password :=`, so the comment was corrected to match FreeRADIUS users file syntax.
- The EAP example configured `mods-available/eap` but did not explicitly enable the module. A symlink task for `mods-enabled/eap` was added.
- The generic infrastructure workflow used `ansible.builtin.timezone`, but the current module is documented as `community.general.timezone`. The example was updated.
- The SSH hardening regexes did not match commented default settings. They were updated to match both commented and uncommented `PermitRootLogin` and `PasswordAuthentication` lines.

## Review Notes
The post remains a high-level role example and does not include full `radiusd.conf`, `ldap.j2`, `eap.j2`, or virtual server templates. Those templates would still need environment-specific review and testing with `freeradius -X` or `radiusd -XC` before production use.
