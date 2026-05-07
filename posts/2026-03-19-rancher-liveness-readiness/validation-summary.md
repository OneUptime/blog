# Validation Summary: How to Configure Liveness and Readiness Probes in Rancher

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Rancher Manager
- Kubernetes
- Liveness probes
- Readiness probes
- Startup probes
- `kubectl`
- gRPC health checking

## Sources Consulted
- Kubernetes: Liveness, Readiness, and Startup Probes - https://kubernetes.io/docs/concepts/configuration/liveness-readiness-startup-probes/
- Kubernetes: Configure Liveness, Readiness and Startup Probes - https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/
- Rancher: Deploying Workloads - https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/kubernetes-resources-setup/workloads-and-pods/deploy-workloads
- Rancher: Upgrading Workloads - https://ranchermanager.docs.rancher.com/v2.9/how-to-guides/new-user-guides/kubernetes-resources-setup/workloads-and-pods/upgrade-workloads
- Kubernetes Blog: Kubernetes 1.24: gRPC container probes in beta - https://kubernetes.io/blog/2022/05/13/grpc-probes-now-in-beta/
- gRPC: Health Checking - https://grpc.io/docs/guides/health-checking/

## Issues Found
- The Rancher UI navigation was too specific for current documented workflow. I updated it to the documented path of `☰ > Cluster Management`, opening the cluster, then `Explore > Workload`, followed by creating a `Deployment` or using `⋮ > Edit Config` for an existing workload.
- The gRPC probe example used `service: my.health.v1.Health`, which is not a generally correct Kubernetes probe `service` value and can cause probe failures unless the server exposes that exact health service name. I removed the field from the example and clarified that the probe requires the gRPC Health Checking Protocol.
- The gRPC version note was incomplete. I updated it to reflect that native gRPC probes are available by default in Kubernetes 1.24+ and stable in Kubernetes 1.27+.
- The post claimed that using the same endpoint for liveness and readiness probes "defeats the purpose." Current Kubernetes documentation explicitly allows using the same low-cost endpoint for both probes. I corrected this guidance to say separate endpoints are only needed when liveness and readiness represent different conditions.
- The `successThreshold` table entry omitted the Kubernetes restriction that liveness and startup probes must use `1`. I added that constraint.

## Review Notes
- The remaining YAML snippets and `kubectl describe pod ...` verification command are technically correct after the fixes.
- Rancher’s official workload docs validate the workload creation and edit flow, but they do not document every individual health-check form label in the same depth as the Kubernetes probe documentation.
