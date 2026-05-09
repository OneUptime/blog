# Validation Summary: How to Test Service IP Advertisement with Calico with Live Workloads

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico
- Kubernetes Services
- Kubernetes kubectl
- BGP
- ECMP
- curl

## Sources Consulted
- Calico documentation: Advertise Kubernetes service IP addresses - https://docs.tigera.io/calico/latest/networking/configuring/advertise-service-ips
- Kubernetes documentation: Create an External Load Balancer - https://kubernetes.io/docs/tasks/access-application-cluster/create-external-load-balancer/
- Kubernetes documentation: Virtual IPs and Service Proxies - https://kubernetes.io/docs/reference/networking/virtual-ips/
- Kubernetes kubectl reference: create deployment - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_deployment/
- Kubernetes kubectl reference: expose - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_expose/
- curl documentation: write-out variables - https://ec.haxx.se/usingcurl/verbose/writeout.html

## Issues Found
- The ECMP test used `curl -w "%{remote_ip}\n"` as if it could show traffic spread across Kubernetes nodes. Curl's `remote_ip` reports the remote IP address of the connection, which is the service/load balancer IP from the client's perspective, not the backend node selected by ECMP. Changed the loop to report HTTP status and added a note to verify ECMP distribution using upstream router ECMP counters or per-node packet counters.
- The prerequisite "External test client with BGP routes" could be read as requiring the client itself to run BGP. Changed it to "External test client that can reach the advertised service IPs" because Calico documentation requires BGP peering between Calico and network infrastructure, while the test client only needs routed reachability.

## Review Notes
The `kubectl create deployment`, `kubectl expose`, `kubectl patch`, `kubectl scale`, and `kubectl rollout restart` commands use current kubectl syntax. The LoadBalancer IP lookup assumes a LoadBalancer implementation or controller has populated `status.loadBalancer.ingress[0].ip`; Calico advertises configured service IP ranges but does not itself allocate LoadBalancer IPs.
