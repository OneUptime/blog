# Validation Summary: How to Configure the Ceph Alerts Module

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph (MGR alerts module)
- Rook (Ceph operator for Kubernetes)
- Kubernetes (kubectl exec)
- SMTP email notifications
- Prometheus / PrometheusRule (Alertmanager integration)

## Sources Consulted
- Ceph official documentation for the alerts module (docs.ceph.com/en/latest/mgr/alerts/)
- Ceph source code: src/pybind/mgr/alerts/module.py (MODULE_OPTIONS definitions, _send_alert_smtp implementation)
- Ceph Prometheus module source for health_status_to_number() mapping
- Prometheus Operator PrometheusRule CRD specification (monitoring.coreos.com/v1)

## Issues Found
1. **Description and intro claimed webhook support**: The description said "email or webhook notifications" and the intro said the module "integrates with email (SMTP) and HTTP webhook endpoints." The Ceph alerts module is SMTP email only — it has no webhook support. Removed webhook references from both the description and the introductory paragraph.

2. **Comment incorrectly said "Enable STARTTLS"**: The `smtp_ssl=true` setting enables implicit SSL (Python's `smtplib.SMTP_SSL`), not STARTTLS. The Ceph alerts module does not support STARTTLS at all — it's either implicit SSL or unencrypted. Changed the comment from "Enable STARTTLS" to "Enable SSL".

3. **SMTP port set to 587 instead of 465**: Port 587 is the standard STARTTLS port, but since `smtp_ssl=true` uses implicit SSL, the correct port is 465 (which is also the module's default). Changed from 587 to 465.

## Review Notes
- All configuration option names (`smtp_host`, `smtp_port`, `smtp_sender`, `smtp_destination`, `smtp_user`, `smtp_password`, `smtp_ssl`, `interval`, `smtp_from_name`) are correct and match the Ceph source code's MODULE_OPTIONS.
- The `ceph alerts send` command is correct for triggering a test alert.
- The default interval of 60 seconds is correct.
- The PrometheusRule YAML is well-formed and uses the correct `ceph_health_status == 2` expression (0=OK, 1=WARN, 2=ERR).
- The `smtp_ssl` default is `True` and the `smtp_port` default is `465`, so technically both lines could be omitted for the default SSL configuration. However, showing them explicitly is good tutorial practice.
- The Ceph docs note that the alerts module may support additional notification methods in the future, but as of current releases it is email-only.
