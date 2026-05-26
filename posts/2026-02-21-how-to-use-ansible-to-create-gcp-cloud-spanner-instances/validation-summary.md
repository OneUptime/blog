# Validation Summary: How to Use Ansible to Create GCP Cloud Spanner Instances

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- `google.cloud` Ansible collection
- Google Cloud Spanner
- Google Cloud CLI
- GoogleSQL DDL
- Infrastructure as Code

## Sources Consulted
- Ansible `google.cloud.gcp_spanner_instance` module documentation: https://docs.ansible.com/ansible/latest/collections/google/cloud/gcp_spanner_instance_module.html
- Ansible `google.cloud.gcp_spanner_database` module documentation: https://docs.ansible.com/ansible/latest/collections/google/cloud/gcp_spanner_database_module.html
- Ansible `google.cloud.gcp_spanner_instance` module source: https://github.com/ansible-collections/google.cloud/blob/master/plugins/modules/gcp_spanner_instance.py
- Google Cloud Spanner compute capacity documentation: https://cloud.google.com/spanner/docs/compute-capacity
- Google Cloud Spanner performance overview: https://cloud.google.com/spanner/docs/performance
- Google Cloud Spanner instance configurations documentation: https://cloud.google.com/spanner/docs/instance-configurations
- Google Cloud Spanner GoogleSQL DDL reference: https://cloud.google.com/spanner/docs/reference/standard-sql/data-definition-language
- Google Cloud Spanner CPU utilization documentation: https://cloud.google.com/spanner/docs/cpu-utilization
- Cloud Spanner SLA: https://cloud.google.com/spanner/sla
- `gcloud spanner instances update` reference: https://cloud.google.com/sdk/gcloud/reference/spanner/instances/update

## Issues Found
- The instance playbooks used full instance configuration resource paths such as `projects/{{ gcp_project }}/instanceConfigs/regional-us-central1`. The Ansible `google.cloud.gcp_spanner_instance` module expects a bare config ID and prepends the project path internally, so those examples would create malformed config names. Updated the examples to use `regional-us-central1` and `nam7`.
- The post listed outdated approximate per-node throughput values of ~10,000 read QPS and ~2,000 write QPS. Google Cloud's current performance guidance lists regional SSD peak throughput at up to ~22,500 read QPS and ~3,500 write QPS per node for 1 KB row workloads. Updated the comments and scaled-capacity estimate.
- The scaling example used `google.cloud.gcp_spanner_instance` to update `node_count`. The module source explicitly fails update attempts for Spanner instances, so that playbook would not scale an existing instance. Replaced it with an Ansible `command` task that calls the documented `gcloud spanner instances update --nodes` command.

## Review Notes
The database DDL examples, `extra_statements` usage, processing unit guidance, multi-region SLA statement, CPU utilization thresholds, and interleaved table syntax match the consulted official documentation. The scaling example now assumes the Cloud SDK is installed and authenticated before running the playbook.
