# Validation Summary: Set Up Scheduled Node Pool Scaling for Kubernetes Non-Production Environments

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes CronJobs
- Kubernetes RBAC
- kubectl scaling commands
- KEDA ScaledObjects and cron scaler
- AWS CLI for Amazon EC2 Auto Scaling groups
- Python cost calculation script

## Sources Consulted
- Kubernetes CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Kubernetes kubectl command reference: https://kubernetes.io/docs/reference/kubectl/kubectl-cmds/
- Kubernetes manual Deployment scaling documentation: https://kubernetes.io/docs/tasks/run-application/scale-deployment/
- Kubernetes RBAC documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes Deployment API reference, including the scale subresource: https://kubernetes.io/docs/reference/kubernetes-api/apps/deployment-v1/
- KEDA cron scaler documentation: https://keda.sh/docs/2.20/scalers/cron/
- KEDA ScaledObject specification: https://keda.sh/docs/2.19/reference/scaledobject-spec/
- AWS CLI update-auto-scaling-group command reference: https://docs.aws.amazon.com/cli/latest/reference/autoscaling/update-auto-scaling-group.html

## Issues Found
- The weekly waste calculation used 40 business hours and 128 off-hours, but the later calculation script used 50 business hours and 118 off-hours. Updated the introductory calculation to match the 8 AM-6 PM weekday schedule and the Python script.
- The CronJob schedules did not specify `.spec.timeZone`, so Kubernetes would interpret them using the kube-controller-manager local timezone. Added `timeZone: America/New_York` to the CronJobs to match the KEDA example and make the stated business-hour times explicit.
- The CronJob examples used `bitnami/kubectl:latest` while running both `kubectl` and `aws` commands. Updated the examples to use a placeholder image, `your-registry/kubectl-awscli:latest`, and clarified that the image must include both CLIs.
- The RBAC example granted permissions on `deployments` and `statefulsets`, but `kubectl scale` operates through the scale subresource. Added explicit permissions for `deployments/scale` and `statefulsets/scale`.
- The Monday startup example referenced `/config/dev-deployments.yaml` without defining the required mounted ConfigMap or volume. Replaced that command with explicit `kubectl scale` commands consistent with the weekday scale-up example.
- The KEDA cron example scaled up at 7 AM while the Python savings example used 8 AM-6 PM business hours. Updated the KEDA start time to 8 AM.

## Review Notes
- The AWS Auto Scaling commands and flags are valid for EC2 Auto Scaling groups. In a real EKS setup, credentials should be supplied through an appropriate workload identity mechanism such as IAM Roles for Service Accounts.
- KEDA's cron scaler sets the desired replica count during the configured time window and returns to `minReplicaCount` outside the window. With `minReplicaCount: 1`, the example scales down to one replica outside business hours rather than zero.
