# Validation Summary: How to Configure Ingress in Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Kubernetes
- Kubernetes Ingress
- Ingress controllers
- RKE2
- K3s
- `kubectl`

## Sources Consulted
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- Kubernetes Ingress controllers documentation: https://kubernetes.io/docs/concepts/services-networking/ingress-controllers/
- Rancher Adding Ingresses: https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/kubernetes-resources-setup/load-balancer-and-ingress-controller/add-ingresses
- Rancher Workload with Ingress Quick Start: https://ranchermanager.docs.rancher.com/v2.14/getting-started/quick-start-guides/deploy-workloads/workload-ingress
- Rancher Install/Upgrade on a Kubernetes Cluster: https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/install-upgrade-on-a-kubernetes-cluster
- RKE2 Networking Services: https://docs.rke2.io/networking/networking_services
- K3s Networking Services: https://docs.k3s.io/networking/networking-services
- ingress-nginx rewrite annotation example: https://kubernetes.github.io/ingress-nginx/examples/rewrite/
- HashiCorp `http-echo` README: https://github.com/hashicorp/http-echo

## Issues Found
- The prerequisites implied Rancher generally deploys an ingress controller by default. I corrected this to reflect the documented defaults for Rancher distributions: RKE2 installs `ingress-nginx` by default, while K3s installs Traefik by default. This avoids implying that imported or hosted clusters automatically have an ingress controller.
- The ingress-controller verification step assumed an `ingress-nginx` namespace. I replaced it with controller-agnostic checks using `kubectl get ingressclass` and `kubectl get pods -A`, because current Rancher environments may use different controllers and namespaces.
- The YAML examples hardcoded `ingressClassName: nginx`, which is not portable to Traefik or other controllers. I changed the examples to use a `YOUR_INGRESS_CLASS` placeholder tied to the output of `kubectl get ingressclass`.
- The main Ingress example included the NGINX-specific `nginx.ingress.kubernetes.io/rewrite-target` annotation even though the example only routed `/` to a service that already serves `/`. I removed the annotation because it was unnecessary and made the example incorrectly controller-specific.
- The verification step stated that an address would be assigned immediately. I corrected this to note that the address may be `<pending>` while the controller or load balancer is still provisioning, which matches the Kubernetes documentation.
- The troubleshooting section assumed `ingress-nginx` for log collection and limited conflict checks to the same namespace. I generalized the log command and updated the conflict guidance to focus on the same host or path.
- The summary overstated Rancher’s responsibility by saying it ensures the underlying infrastructure is properly configured. I corrected this to reflect that Rancher provides the management UI while the ingress controller performs the actual traffic handling.

## Review Notes
- Kubernetes recommends Gateway API instead of Ingress for new designs, but Ingress remains supported and is still valid for this tutorial.
- RKE2 documents that `ingress-nginx` reached end-of-life in March 2026. The updated post remains valid because the examples no longer depend on NGINX-specific annotations or class names.
- `kubectl` was not installed in the local review environment, so command validation was performed against official documentation rather than local `kubectl --help` output.
