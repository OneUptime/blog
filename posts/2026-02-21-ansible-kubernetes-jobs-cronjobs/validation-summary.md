# Validation Summary: How to Use Ansible to Create Kubernetes Jobs and CronJobs

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- kubernetes.core Ansible collection
- Kubernetes Jobs
- Kubernetes CronJobs
- Kubernetes batch/v1 API
- Kubernetes Downward API

## Sources Consulted
- Ansible kubernetes.core collection documentation: https://docs.ansible.com/projects/ansible/latest/collections/kubernetes/core/
- Ansible kubernetes.core.k8s module documentation: https://docs.ansible.com/projects/ansible/latest/collections/kubernetes/core/k8s_module.html
- Kubernetes Job API reference: https://kubernetes.io/docs/reference/kubernetes-api/batch/job-v1/
- Kubernetes Jobs concept documentation: https://kubernetes.io/docs/concepts/workloads/controllers/job/
- Kubernetes Indexed Job task documentation: https://kubernetes.io/docs/tasks/job/indexed-parallel-processing-static/
- Kubernetes CronJob API reference: https://kubernetes.io/docs/reference/kubernetes-api/batch/cron-job-v1/

## Issues Found
- The prerequisites listed Ansible 2.12+ for the current `kubernetes.core` collection. Current official collection documentation lists ansible-core 2.16.0 or newer, so the prerequisite was updated.
- The Python dependency install command only installed `kubernetes`. Current `kubernetes.core.k8s` module documentation also lists `PyYAML` and `jsonpatch` as requirements, so the command was updated to install all three packages with `python3 -m pip`.
- The parallel Job example used `JOB_COMPLETION_INDEX` without setting `completionMode: Indexed`. Kubernetes only provides stable completion indexes for Indexed Jobs, so `completionMode: Indexed` was added.
- The parallel Job example passed `"$(JOB_COMPLETION_INDEX)"` as a direct argv value, which Kubernetes does not shell-expand in exec-form commands. The command was changed to run through `/bin/sh -c` so the environment variable is expanded before calling the Python script.

## Review Notes
- The remaining Job and CronJob fields reviewed are current `batch/v1` fields and match Kubernetes documentation, including `backoffLimit`, `activeDeadlineSeconds`, `ttlSecondsAfterFinished`, `concurrencyPolicy`, `successfulJobsHistoryLimit`, `failedJobsHistoryLimit`, and `startingDeadlineSeconds`.
- The YAML snippets parse successfully after the edits.
