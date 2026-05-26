# Validation Summary: How to Use Ansible to Scan Container Images for Vulnerabilities

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks, roles, tasks, handlers, facts, and Jinja2 filters
- Trivy container image vulnerability scanning
- Docker/container images
- CI/CD pre-deployment security scanning
- Linux system provisioning, SSH hardening, UFW firewall rules, monitoring API integration, and cron scheduling

## Sources Consulted
- Trivy image command documentation: https://trivy.dev/docs/latest/references/configuration/cli/trivy_image/
- Trivy installation documentation: https://trivy.dev/dev/getting-started/installation/
- Trivy vulnerability scanning documentation: https://trivy.dev/docs/latest/guide/scanner/vulnerability/
- Trivy reporting documentation: https://trivy.dev/docs/latest/configuration/reporting/
- Trivy security advisory GHSA-69fq-xp46-6x23 / CVE-2026-33634: https://github.com/aquasecurity/trivy/security/advisories/GHSA-69fq-xp46-6x23
- Ansible unarchive module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/unarchive_module.html
- Ansible slurp module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/slurp_module.html
- Ansible cron module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/cron_module.html
- Ansible community.general timezone module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/timezone_module.html
- Ansible community.general UFW module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/ufw_module.html

## Issues Found
- The Trivy result parsing assumed every entry in `Results` contains a `Vulnerabilities` key. Trivy JSON output can include result entries without vulnerability findings, so the Ansible expression could fail or count incorrectly. Updated the pipeline to select only result entries where `Vulnerabilities` is defined before flattening and filtering by severity.
- The infrastructure provisioning example used `ansible.builtin.timezone`, but current Ansible documentation lists the timezone module as `community.general.timezone`. Updated the task to use `community.general.timezone`.
- The Common Use Cases introduction referred to "this module", but the post is about Ansible automation patterns and Trivy scanning, not a single Ansible module. Updated the wording to avoid the incorrect module terminology.

## Review Notes
The Trivy CLI flags shown for image scanning, severity filtering, JSON output, output files, and database download are current in the official Trivy CLI documentation. The post's direct GitHub release installation pattern is plausible, but production security automation should pin a known-good Trivy version and verify release signatures or checksums, especially in light of the March 2026 Trivy supply-chain advisory.
