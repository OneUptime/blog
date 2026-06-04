# Validation Summary: How to Use managedBy Field in CronJobs for External Controller Integration

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes CronJobs
- Kubernetes Jobs
- Kubernetes JobManagedBy feature gate
- Kubernetes controllers and RBAC
- Kubernetes Python client
- Apache Airflow DAGs
- Prometheus metrics
- Flask health and metrics endpoints

## Sources Consulted
- Kubernetes Job API reference: https://kubernetes.io/docs/reference/kubernetes-api/batch/job-v1/
- Kubernetes CronJob API reference: https://kubernetes.io/docs/reference/kubernetes-api/batch/cron-job-v1/
- Kubernetes Job controller documentation, "Delegation of managing a Job object to external controller": https://kubernetes.io/docs/concepts/workloads/controllers/job/#delegation-of-managing-a-job-object-to-external-controller
- Kubernetes CronJob controller documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Kubernetes feature gates reference: https://kubernetes.io/docs/reference/command-line-tools-reference/feature-gates/
- Apache Airflow DAG API documentation: https://airflow.apache.org/docs/apache-airflow/2.10.3/_api/airflow/models/dag/index.html

## Issues Found
- The post incorrectly described `managedBy` as a top-level CronJob field. Kubernetes documents `managedBy` as a Job spec field, so the examples now use `spec.jobTemplate.spec.managedBy` for Jobs created by CronJobs.
- The post incorrectly claimed the built-in CronJob controller ignores CronJobs when `managedBy` is set. The CronJob controller still creates Jobs on the cron schedule; the built-in Job controller skips Jobs with a custom `spec.managedBy`. The explanation and controller example were updated accordingly.
- The post cited Kubernetes 1.28 for `JobManagedBy`. The feature gate was introduced as alpha in Kubernetes 1.30, became beta and enabled by default in 1.32, and became stable in 1.35. The version guidance was corrected.
- The custom controller example watched CronJobs and created Jobs manually. It now watches delegated Jobs, creates Pods from the Job template, and patches basic Job status, matching the documented external Job controller delegation model.
- The RBAC example granted CronJob permissions that were not needed for the corrected controller and omitted Pod list permissions needed for status synchronization. The RBAC rules now cover Jobs, Job status, and Pods.
- The dependency example checked annotations on CronJobs even though annotations needed by the Job controller must be present on the generated Job. The example now places dependency annotations in `jobTemplate.metadata`.
- The dependency example used a non-standard `cronjob-name` label selector. It now uses an explicit `workflow-step` label supplied by the Job template.
- The Airflow example used deprecated `schedule_interval`. It now uses the `schedule` parameter introduced in Airflow 2.4.
- The Airflow-created Job metadata did not set the namespace on the Job object. The metadata now includes the namespace.

## Review Notes
The corrected controller remains a simplified educational example. A production external Job controller should implement the full Kubernetes Job status semantics and pass Job conformance expectations, as recommended by the Kubernetes documentation.
