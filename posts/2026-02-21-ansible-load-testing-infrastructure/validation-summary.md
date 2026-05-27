# Validation Summary: How to Use Ansible for Load Testing Infrastructure Setup

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible playbooks and roles
- Amazon EC2 provisioning with the amazon.aws collection
- Debian/Ubuntu APT repository management
- Grafana k6 load testing
- Locust distributed load testing
- Jinja2 templates

## Sources Consulted
- Ansible amazon.aws.ec2_instance module documentation: https://docs.ansible.com/ansible/latest/collections/amazon/aws/ec2_instance_module.html
- Ansible ansible.builtin.apt_key module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_key_module.html
- Ansible ansible.builtin.deb822_repository module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/deb822_repository_module.html
- Ansible ansible.builtin.pip module documentation: https://docs.ansible.com/projects/ansible-core/2.19/collections/ansible/builtin/pip_module.html
- Grafana k6 Debian/Ubuntu installation documentation: https://grafana.com/docs/k6/latest/set-up/install-k6/
- Grafana k6 options reference: https://grafana.com/docs/k6/latest/using-k6/k6-options/reference/
- Grafana k6 JSON output documentation: https://grafana.com/docs/k6/latest/results-output/real-time/json/
- Locust configuration and command-line documentation: https://docs.locust.io/en/latest/configuration.html

## Issues Found
- The EC2 provisioning example used `subnet_id`, which is not the current parameter name for `amazon.aws.ec2_instance`. Changed it to `vpc_subnet_id` and moved the security group into `network_interfaces` with `assign_public_ip: true`, matching current module examples for public EC2 instances.
- The k6 installation role used `ansible.builtin.apt_key` plus `apt_repository`. `apt_key` depends on the deprecated `apt-key` utility, which has been removed in modern Debian versions. Replaced it with `ansible.builtin.deb822_repository` and `signed_by`, matching Ansible and k6 documentation.
- The run playbook defined `test_run_id` and `results_dir` only in the "Start load test" play, but later plays referenced those variables. Added an initialization play and repeated the required vars in the collection and aggregation plays so result paths resolve correctly.
- The Locust alternative installed Locust into the system Python environment, which can fail on externally managed Python installations. Changed it to install Locust in a virtual environment and run the venv executable.
- The Locust alternative deployed files under `/opt/load-tests` and wrote CSV output under `/opt/load-tests/results` without creating those directories. Added directory creation tasks.

## Review Notes
- The k6 examples use valid `k6 run` options, including `--out json`, `--summary-export`, and repeated `--tag` flags.
- The Locust master and worker flags shown are current, but a real inventory still needs a host in a `master` group and workers configured with the correct `locust_master_host`.
