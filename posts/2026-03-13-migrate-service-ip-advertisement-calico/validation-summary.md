# Validation Summary: How to Migrate to Service IP Advertisement with Calico Safely

## Status
validated

## Post Type
Technical migration guide

## Technologies Covered
- Calico Open Source
- Kubernetes Services
- BGP service IP advertisement
- Calico LoadBalancer IPAM
- kubectl
- DNS migration

## Sources Consulted
- Calico documentation: Advertise Kubernetes service IP addresses, https://docs.tigera.io/calico/latest/networking/configuring/advertise-service-ips
- Calico documentation: LoadBalancer IP address management, https://docs.tigera.io/calico/latest/networking/ipam/service-loadbalancer
- Calico documentation: BGPConfiguration resource, https://docs.tigera.io/calico/latest/reference/resources/bgpconfig
- Kubernetes documentation: Service, https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes documentation: kubectl patch, https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/

## Issues Found
- The prerequisites said only that a LoadBalancer IP pool was "created and advertised." Calico requires a LoadBalancer IPPool with `allowedUses: LoadBalancer` for Calico IPAM allocation, and BGP advertisement is configured separately with `BGPConfiguration.spec.serviceLoadBalancerIPs`. Updated the prerequisites to distinguish those requirements.
- The Service example did not set `spec.loadBalancerClass`. On clusters with a cloud-provider load balancer implementation, an unclassified `LoadBalancer` Service can be handled by the provider default. Added `loadBalancerClass: calico` so the example targets Calico's LoadBalancer handling.
- The DNS migration text implied precise split traffic from generic DNS changes. Updated it to say weighted DNS is required if the DNS provider supports split traffic.
- The cleanup command attempted to remove `/spec/ports/1`, but the sample Service has only one port and NodePort allocation is stored under each Service port's `nodePort` field. Replaced it with a merge patch setting `allocateLoadBalancerNodePorts: false` and a JSON patch removing `/spec/ports/0/nodePort`, matching Kubernetes guidance for deallocating LoadBalancer Service NodePorts.

## Review Notes
The post is technically relevant and the corrected examples use current Kubernetes Service APIs. `spec.loadBalancerClass` is immutable once set, so in a real migration from an existing Service, teams should plan whether they are creating a replacement Service or applying the type/class change before the Service becomes a `LoadBalancer`.
