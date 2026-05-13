# Validation Summary: How to Configure Network Policies for Flux Inter-Controller Communication

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flux
- Kubernetes
- Kubernetes NetworkPolicy
- kubectl
- Prometheus metrics scraping

## Sources Consulted
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Flux optional components and network policies documentation: https://fluxcd.io/flux/installation/configuration/optional-components/
- Flux notification-controller documentation: https://fluxcd.io/flux/components/notification/
- Flux latest generated install manifests: https://github.com/fluxcd/flux2/releases/latest/download/install.yaml
- Flux CLI command documentation: https://fluxcd.io/flux/cmd/

## Issues Found
- The post stated that any pod in the cluster can reach Flux internal endpoints by default. I qualified this because Kubernetes allows pod-to-pod traffic by default, but Flux installs baseline NetworkPolicies when installed with the default `--network-policy=true` option.
- The inter-controller communication table used port 9090 without noting that Flux Services expose port 80 and target the controllers' `http` container port 9090. I updated the table and policies to use the named `http` port.
- The post claimed notification-controller reads source-controller artifact metadata over port 9090. I removed that row because Flux notification-controller receives emitted events and webhook events; it does not need artifact HTTP access for that purpose.
- The post stated that controller health checks use port 8080. I corrected this to metrics on 8080 and health probes on 9440, with source-controller readiness also using its artifact HTTP endpoint.
- The Kubernetes API egress example used the `kubernetes` Endpoints address. I changed it to the `kubernetes` Service ClusterIP, which is the stable in-cluster API endpoint pods normally use.
- The strict egress default-deny policy would have blocked required external access to Git, Helm, OCI, cloud storage, and alert-provider endpoints. I added an external egress policy example and noted that production users should restrict it to their real destinations.
- The combined policy set omitted several policies described earlier, including controller egress to source-controller, controller egress to notification-controller, Kubernetes API egress, external egress, and Prometheus scraping. I updated the combined script to include the missing policies.
- The health-check troubleshooting section suggested allowing kubelet access to port 8080. I corrected it to cover port 9440 and source-controller's `http` readiness endpoint, and noted that standard Kubernetes NetworkPolicy does not block resident-node traffic.

## Review Notes
The examples still depend on cluster-specific details such as DNS pod labels, Prometheus labels, CNI handling of Service NAT with NetworkPolicy, and the external endpoints Flux must reach. These are appropriate caveats for a NetworkPolicy tutorial, but production users should test the policies with their actual CNI and source/provider endpoints.
