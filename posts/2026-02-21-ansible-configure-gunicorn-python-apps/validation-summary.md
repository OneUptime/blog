# Validation Summary: How to Use Ansible to Configure Gunicorn for Python Apps

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- Gunicorn
- Python virtual environments
- WSGI
- ASGI
- Uvicorn workers
- systemd service and socket units
- logrotate

## Sources Consulted
- Gunicorn deployment documentation: https://docs.gunicorn.org/en/stable/deploy.html
- Gunicorn settings documentation: https://docs.gunicorn.org/en/stable/settings.html
- Gunicorn signal handling documentation: https://docs.gunicorn.org/en/stable/signals.html
- Uvicorn deployment documentation: https://www.uvicorn.org/deployment/
- Ansible pip module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/pip_module.html
- Ansible systemd_service module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/systemd_service_module.html

## Issues Found
- The introduction described FastAPI as WSGI-compatible. FastAPI is ASGI, so the wording now says Gunicorn works with WSGI frameworks and can run ASGI apps such as FastAPI when paired with uvicorn workers.
- The production caveats said Gunicorn's default logging goes to stdout. Gunicorn's access log is disabled by default and the error log defaults to stderr, so the paragraph was corrected.
- The ASGI worker example used `uvicorn.workers.UvicornWorker`, which Uvicorn documents as deprecated. The article now uses the separate `uvicorn-worker` package and `uvicorn_worker.UvicornWorker`.
- The Ansible verification task checked the service as active even for systemd socket activation. A socket-activated Gunicorn service can be inactive until traffic arrives, so the socket mode now verifies the socket unit and TCP mode verifies the service unit.
- The logrotate postrotate hook used `systemctl reload`, which sends HUP and reloads Gunicorn configuration. Gunicorn documents USR1 as the signal for reopening log files, so the hook now sends `USR1` through systemd.

## Review Notes
The Ansible examples use short module names such as `pip` and `systemd`; current Ansible documentation recommends fully qualified collection names for clarity, but the short names remain valid aliases. The Gunicorn worker count formula is a common starting point, but production tuning should still be based on workload and measurement.
