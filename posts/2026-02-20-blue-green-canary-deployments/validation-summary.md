# Validation Summary: How to Implement Blue-Green and Canary Deployment Strategies

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Kubernetes Deployments
- Kubernetes Services
- Kubernetes Ingress
- NGINX Ingress Controller canary annotations
- kubectl patch and annotate commands
- Bash deployment scripts
- OneUptime observability

## Sources Consulted
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes Deployment API reference: https://kubernetes.io/docs/reference/kubernetes-api/apps/deployment-v1/
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- NGINX Ingress Controller canary annotations: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/
- NGINX Ingress Controller canary deployment example: https://kubernetes.github.io/ingress-nginx/examples/canary/
- kubectl patch reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/
- kubectl annotate reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_annotate/
- AWS blue/green deployment schema-change guidance: https://docs.aws.amazon.com/whitepapers/latest/blue-green-deployments/best-practices-for-managing-data-synchronization-and-schema-changes.html
- OneUptime website: https://oneuptime.com

## Issues Found
- The post said Kubernetes rolling updates replace pods "one at a time." Kubernetes Deployments roll out gradually according to rollout settings such as surge and availability limits, so this was changed to avoid implying a fixed one-pod-at-a-time behavior.
- The rollback drawback for rolling updates implied Kubernetes lacks an easy rollback path. Kubernetes supports rollback, but it is another rollout rather than an instant traffic switch, so the wording was corrected.
- The NGINX Ingress canary example omitted the requirement that a canary Ingress is paired with an existing primary Ingress using the same host and path. Added that prerequisite before the example.
- The canary rollout script used a cluster DNS service URL without stating where the script must run. Added a note that the script needs to run from a pod or CI runner with cluster DNS access.
- The canary rollout script printed "promoting to stable" but did not update the stable Deployment or remove the canary Ingress. Changed the message to state that the canary is receiving all traffic.
- The comparison table listed blue-green as best for "Database migrations, breaking changes." This was too broad because shared database schema changes often need backward compatibility. Changed it to "Fast cutovers, full-environment validation."

## Review Notes
The Kubernetes manifests use current stable APIs and valid field names. The NGINX canary annotations are current, but a production rollout would normally also include explicit promotion cleanup after 100% canary traffic, such as updating the stable workload and removing the canary Ingress.
