# Validation Summary: How to Migrate from Kubernetes to ECS

## Status
validated

## Post Type
Technical migration guide

## Technologies Covered
- Amazon ECS
- AWS Fargate
- AWS CLI
- Kubernetes Deployments, Services, ConfigMaps, Secrets, HPA, Ingress, DaemonSets, CronJobs, and PersistentVolumes
- AWS Systems Manager Parameter Store
- AWS Secrets Manager
- AWS Cloud Map
- ECS Service Connect
- Application Auto Scaling
- Amazon EventBridge Scheduler
- Elastic Load Balancing
- Amazon EFS

## Sources Consulted
- Kubernetes Deployments documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes kubectl reference: https://kubernetes.io/docs/reference/kubectl/kubectl-cmds/
- Kubernetes probes documentation: https://kubernetes.io/docs/concepts/workloads/pods/probes/
- Kubernetes DaemonSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/daemonset/
- Amazon ECS create-service AWS CLI reference: https://docs.aws.amazon.com/cli/latest/reference/ecs/create-service.html
- Amazon ECS task definition and Fargate CPU/memory documentation: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task-cpu-memory-error.html
- Amazon ECS container health check documentation: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/healthcheck.html
- Amazon ECS secrets from Systems Manager Parameter Store documentation: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/secrets-envvar-ssm-paramstore.html
- Amazon ECS service discovery documentation: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/service-discovery.html
- Amazon ECS Service Connect documentation: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/service-connect.html
- Application Auto Scaling register-scalable-target AWS CLI reference: https://docs.aws.amazon.com/cli/latest/reference/application-autoscaling/register-scalable-target.html
- Amazon ECS scheduled tasks with EventBridge Scheduler documentation: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/tasks-scheduled-eventbridge-scheduler.html

## Issues Found
- The Kubernetes Deployment example was missing `spec.template.metadata.labels`. In `apps/v1`, the Deployment selector must match the pod template labels, so the original manifest would be rejected. Added the matching `app: web-api` labels under the pod template.
- The AWS account IDs in example IAM ARNs, ECR image URI, SSM parameter ARN, and Secrets Manager ARN used 9 digits. AWS account IDs are 12 digits, so the examples were changed to use `123456789012`.
- The Secrets Manager ARN example omitted the generated suffix used in full secret ARNs. Updated it to a full-form example ARN with a suffix.
- The ECS health check example uses `curl`. ECS container health checks execute inside the container, unlike Kubernetes HTTP probes, so the container image must include the health-check command. Added a short note to make that requirement explicit.

## Review Notes
The concept mapping is directionally correct, but several mappings are simplifications rather than one-to-one replacements. For example, Kubernetes NetworkPolicies and AWS security groups operate at different layers and with different selectors, and Kubernetes readiness probes do not map exactly to ECS container health checks plus load balancer health checks.
