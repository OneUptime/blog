# Validation Summary: How to Scale AWX for Large Environments

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWX
- AWX Operator
- Ansible execution nodes and Receptor
- AWX instance groups and container groups
- Kubernetes pods and scheduling
- PostgreSQL
- PgBouncer
- Prometheus metrics

## Sources Consulted
- AWX capacity determination and job impact: https://docs.ansible.com/projects/awx/en/24.6.1/userguide/jobs.html#awx-capacity-determination-and-job-impact
- AWX container and instance groups: https://docs.ansible.com/projects/awx/en/24.6.1/administration/containers_instance_groups.html
- AWX managing capacity with instances: https://docs.ansible.com/projects/awx/en/24.6.1/administration/instances.html
- AWX improving performance: https://docs.ansible.com/projects/awx/en/24.6.1/administration/performance.html
- AWX metrics: https://docs.ansible.com/projects/awx/en/24.6.1/administration/metrics.html
- AWX awx-manage utility: https://docs.ansible.com/projects/awx/en/latest/rest_api/awx-manage.html
- AWX Operator scaling web and task pods: https://docs.ansible.com/projects/awx-operator/en/latest/user-guide/advanced-configuration/scaling-the-web-and-task-pods-independently.html
- AWX Operator mesh ingress: https://docs.ansible.com/projects/awx-operator/en/latest/user-guide/advanced-configuration/mesh-ingress.html
- AWX 24.6.1 source for container group pod spec merging: https://github.com/ansible/awx/blob/24.6.1/awx/main/scheduler/kubernetes.py
- AWX 24.6.1 source for default pod spec: https://github.com/ansible/awx/blob/24.6.1/awx/main/utils/execution_environments.py
- AWX 24.6.1 source for API serializer instance fields: https://github.com/ansible/awx/blob/24.6.1/awx/api/serializers.py
- AWX 24.6.1 source for Prometheus metric names: https://github.com/ansible/awx/blob/24.6.1/awx/main/analytics/metrics.py
- PgBouncer feature matrix and pooling modes: https://www.pgbouncer.org/features.html
- Django PostgreSQL notes for PgBouncer transaction pooling: https://docs.djangoproject.com/en/5.1/ref/databases/#transaction-pooling-and-server-side-cursors
- PostgreSQL pg_stat_statements: https://www.postgresql.org/docs/current/pgstatstatements.html
- PostgreSQL streaming replication monitoring: https://www.postgresql.org/docs/current/monitoring-stats.html#MONITORING-PG-STAT-REPLICATION-VIEW

## Issues Found
- The execution-node section showed an AWX custom resource with only `DEFAULT_EXECUTION_QUEUE_NAME`, which does not deploy or register an execution node. It was replaced with the current AWX instance creation and install-bundle workflow.
- The standalone execution-node example manually wrote a Receptor configuration. Current AWX documentation directs administrators to create the instance in AWX, download the generated install bundle, install the required Receptor collection, and run `install_receptor.yml`. The example was updated accordingly.
- The container group API example sent `pod_spec_override` as a nested JSON object. AWX stores this field as text containing YAML or JSON, so the example was changed to send a YAML string.
- The container group pod override attempted a partial container resource override. AWX deep-merges dictionaries but replaces lists, so a partial `containers` list would replace the default container and omit required fields such as the execution environment image. The example now avoids overriding `containers` and suggests Kubernetes `LimitRange` or a full tested container override for resource guardrails.
- The dynamic `kubectl scale` commands were presented as equivalent to changing the AWX custom resource. A note was added that the operator may reconcile direct deployment scaling back to the custom resource values.
- The database read-replica section implied AWX can simply route normal API and dashboard reads to a PostgreSQL replica. AWX does not document a simple supported read-routing setting, so the guidance was changed to use replicas for external reporting or analytics unless a tested supported routing configuration exists.
- The cleanup section repeated the manual `cleanup_jobs` command under an automated cleanup comment. The wording was corrected to say the same cleanup should be scheduled through AWX management jobs or an external scheduler.

## Review Notes
The post is technically relevant and current after the fixes. Capacity and metric examples align with AWX 24.6.1 documentation/source. The sizing table remains guidance rather than a universal formula; actual capacity should still be verified with AWX metrics and workload-specific testing.
