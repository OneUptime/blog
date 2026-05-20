# Validation Summary: How to Deploy Apache Airflow with ArgoCD

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Apache Airflow
- Apache Airflow Helm chart
- Argo CD
- Kubernetes
- Helm values
- Kubernetes Ingress
- KubernetesPodOperator
- Prometheus Operator ServiceMonitor
- git-sync

## Sources Consulted
- Apache Airflow Helm Chart documentation: https://airflow.apache.org/docs/helm-chart/stable/index.html
- Apache Airflow Helm Chart parameters reference: https://airflow.apache.org/docs/helm-chart/stable/parameters-ref.html
- Apache Airflow Helm chart 1.13.0 values.yaml: https://raw.githubusercontent.com/apache/airflow/helm-chart/1.13.0/chart/values.yaml
- Apache Airflow Helm chart 1.13.0 StatsD service template: https://raw.githubusercontent.com/apache/airflow/helm-chart/1.13.0/chart/templates/statsd/statsd-service.yaml
- Argo CD Application specification reference: https://argo-cd.readthedocs.io/en/latest/user-guide/application-specification/
- Apache Airflow KubernetesPodOperator documentation: https://airflow.apache.org/docs/apache-airflow-providers-cncf-kubernetes/stable/operators.html
- Apache Airflow 2.8.2 configuration reference: https://airflow.apache.org/docs/apache-airflow/2.8.2/configurations-ref.html
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
- The Airflow Helm chart's Argo CD guidance requires `applyCustomEnv: false` in addition to `useHelmHooks: false` for `createUserJob` and `migrateDatabaseJob`. Added those values so the jobs are managed correctly by Argo CD.
- The post said Argo CD would run the database migration job on upgrade, but the Airflow Helm chart documentation notes that automatic migrations with Argo CD need an Argo CD sync hook annotation. Added `migrateDatabaseJob.jobAnnotations."argocd.argoproj.io/hook": Sync` and updated the upgrade wording.
- The custom pod template ConfigMap was referenced from `KubernetesPodOperator`, but it was not mounted into the scheduler pod where the operator can read the template file. Added `scheduler.extraVolumes` and `scheduler.extraVolumeMounts` to mount it at `/opt/airflow/pod_templates`.
- The ServiceMonitor endpoint used `statsd-metrics`, but the Airflow chart's StatsD service exposes the Prometheus scrape port as `statsd-scrape`. Updated the ServiceMonitor port.
- The KubernetesExecutor description used overly absolute wording about "perfect isolation and autoscaling." Updated it to "strong isolation" and clarified that it works well with Kubernetes cluster autoscaling.
- The best-practices section only mentioned `useHelmHooks: false` for migration jobs. Updated it to include both migration and user creation jobs, and the required `applyCustomEnv: false` setting.

## Review Notes
- The post uses Airflow chart `1.13.0` and Airflow `2.8.1`, which are version-specific examples rather than current latest versions. The snippets were reviewed for that chart generation and corrected where needed.
- The sample secrets and passwords are placeholders and should be replaced with secret-management tooling such as External Secrets, Sealed Secrets, SOPS, or a cloud secret manager in a real production deployment.
