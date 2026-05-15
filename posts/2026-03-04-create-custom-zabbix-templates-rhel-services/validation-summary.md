# Validation Summary: How to Create Custom Zabbix Templates for RHEL Services

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- RHEL
- Zabbix templates
- Zabbix agent 2 UserParameter checks
- Zabbix low-level discovery
- Zabbix trigger expressions
- Zabbix API
- systemd/systemctl
- Bash, awk, sed, Python JSON generation

## Sources Consulted
- Zabbix documentation: User parameters - https://www.zabbix.com/documentation/8.0/en/manual/config/items/userparameters
- Zabbix documentation: Low-level discovery - https://www.zabbix.com/documentation/7.0/en/manual/discovery/low_level_discovery
- Zabbix documentation: Trigger expressions - https://www.zabbix.com/documentation/7.0/en/manual/config/triggers/expression
- Zabbix documentation: API authentication - https://www.zabbix.com/documentation/7.0/en/manual/api
- Zabbix documentation: configuration.export API - https://www.zabbix.com/documentation/7.2/en/manual/api/reference/configuration/export
- Zabbix documentation: template.get API - https://www.zabbix.com/documentation/7.0/en/manual/api/reference/template/get
- systemd systemctl manual - https://www.freedesktop.org/software/systemd/man/latest/systemctl.html
- systemd D-Bus/unit property documentation - https://www.freedesktop.org/software/systemd/man/org.freedesktop.systemd1.html

## Issues Found
- The service discovery `sed` expression used `s/.service$//`, where `.` matched any single character instead of a literal dot. Changed it to `s/\.service$//` so only the `.service` suffix is stripped.
- The API example was labeled as exporting a template but used `template.get`, which only retrieves template objects. Added a first `template.get` call to obtain the template ID and a separate `configuration.export` call to export the template.
- The API example used the deprecated JSON-RPC `auth` property. Updated it to use the documented `Authorization: Bearer YOUR_AUTH_TOKEN` header and `application/json-rpc` content type.

## Review Notes
The UserParameter, low-level discovery JSON array, trigger expression, and systemctl examples are broadly correct for current Zabbix and systemd usage. In production, consider filtering discovered services or adding low-level discovery overrides so transient or intentionally stopped services do not create noisy trigger prototypes.
