# Validation Summary: How to Set Up Traffic Splitting in Rancher

## Status
validated

## Post Type
Guide / tutorial

## Technologies Covered
- Rancher
- Kubernetes
- Istio
- ingress-nginx
- Service Mesh Interface (SMI) / TrafficSplit
- Linkerd
- Open Service Mesh (OSM)
- kubectl / istioctl

## Sources Consulted
- Rancher: Set up Istio's Components for Traffic Management — https://ranchermanager.docs.rancher.com/v2.14/how-to-guides/advanced-user-guides/istio-setup-guide/set-up-traffic-management
- Rancher: Istio integration overview — https://ranchermanager.docs.rancher.com/v2.10/integrations-in-rancher/istio
- Istio VirtualService reference — https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio DestinationRule reference — https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio command reference (`istioctl`) — https://istio.io/latest/docs/reference/commands/istioctl/
- Istio standard metrics reference — https://istio.io/latest/docs/reference/config/metrics/
- ingress-nginx canary deployment guide — https://kubernetes.github.io/ingress-nginx/examples/canary/
- ingress-nginx annotations reference — https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/
- Linkerd SMI extension docs — https://linkerd.io/2/tasks/linkerd-smi/
- Linkerd traffic shifting docs — https://linkerd.io/2.15/tasks/traffic-shifting/
- Open Service Mesh traffic splitting guide — https://release-v1-2.docs.openservicemesh.io/docs/guides/traffic_management/traffic_split/
- Kubernetes `kubectl patch` reference — https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/
- Kubernetes `kubectl exec` reference — https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes `kubectl run` reference — https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/

## Issues Found
- The Istio manifests used `networking.istio.io/v1beta1` and `LEAST_CONN`. Updated them to `networking.istio.io/v1` and `LEAST_REQUEST` to match the current Istio API and enum values.
- The Istio examples did not create the `backend` Kubernetes `Service` that the `DestinationRule` and `VirtualService` target. Added the missing `Service` so the examples resolve against the service registry correctly.
- The canary script and monitoring section assumed a `prometheus` deployment in `istio-system`, which is not a safe Rancher assumption and is not required by current docs. Replaced that with a deployment health gate, a Kiali dashboard command, and a corrected `istioctl experimental describe pod` example.
- The monitoring example used `kubectl get pod ... -o name`, which produces `pod/<name>` and does not match `istioctl experimental describe pod <pod-name>`. Changed it to use `jsonpath` so only the pod name is passed.
- The SMI example used the root service short name and implied generic Linkerd/OSM support without caveats. Updated the root service to an FQDN, clarified that Linkerd needs the SMI extension and now prefers HTTPRoute, and noted that some meshes such as OSM also require access-policy resources like `TrafficTarget`.
- The ingress example only defined the canary Ingress. Added the required primary Ingress with the same host and path and specified `ingressClassName: nginx`, which matches current ingress-nginx canary guidance.

## Review Notes
- Rancher-Istio is deprecated in Rancher v2.12.0; the traffic-management resources in this post are still valid on Rancher-managed clusters running a supported Istio distribution.
- The Kiali monitoring command assumes Kiali is installed. That is consistent with Rancher-Istio defaults, but plain Istio installations may require installing Kiali separately.
