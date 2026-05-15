# Validation Summary: How to Install and Configure Prefect for Data Pipeline Orchestration on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- CentOS Stream 9
- Python 3.12
- Prefect 3
- systemd
- DNF

## Sources Consulted
- Prefect official installation documentation: https://docs.prefect.io/v3/get-started/install
- Prefect official local server documentation: https://docs.prefect.io/v3/how-to-guides/self-hosted/server-cli
- Prefect official settings documentation: https://docs.prefect.io/v3/how-to-guides/configuration/manage-settings
- Prefect official workers documentation: https://docs.prefect.io/v3/concepts/workers
- Prefect official work pools documentation: https://docs.prefect.io/v3/how-to-guides/deployment_infra/manage-work-pools
- Prefect official settings reference for `PREFECT_HOME`: https://docs.prefect.io/v3/api-ref/settings-ref
- Red Hat official RHEL 9 Python documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/installing_and_using_dynamic_programming_languages
- Red Hat official RHEL 9 systemd unit documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/using_systemd_unit_files_to_customize_and_optimize_your_system/using_systemd_unit_files_to_customize_and_optimize_your_system

## Issues Found
- The original installation command used `sudo dnf install -y <package-name>`, which was a placeholder and not a valid Prefect installation. Replaced it with RHEL 9 Python 3.12 and pip package installation, virtual environment creation, and `pip install --upgrade prefect`, matching Prefect's documented Python package installation flow.
- The original service configuration used `/etc/<service>/config.conf` and `<service-name>`, which are not Prefect configuration paths or units. Replaced these placeholders with concrete `prefect-server.service` and `prefect-worker.service` systemd unit files.
- The original post implied Prefect is managed like an RPM-provided service. Prefect is distributed as a Python package, so the corrected guide creates a dedicated service account, installs Prefect in `/opt/prefect`, and manages the Prefect CLI through systemd.
- The original verification and troubleshooting commands referenced placeholder service and package names. Replaced them with `prefect-server`, `prefect-worker`, `prefect config validate`, and `prefect work-pool ls`.

## Review Notes
The corrected guide uses Prefect's default SQLite database under `PREFECT_HOME`, which is appropriate for a basic self-hosted setup. Production deployments may need PostgreSQL, authentication, TLS, reverse proxy configuration, and tighter network exposure controls.
