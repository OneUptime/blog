# Validation Summary: How to Deploy IPv6-Only Services in Kubernetes

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Kubernetes
- Kubernetes Services
- IPv6
- Dual-stack Kubernetes networking
- CoreDNS / Kubernetes service DNS
- `kubectl`
- `curl`

## Sources Consulted
- Kubernetes: IPv4/IPv6 dual-stack: https://kubernetes.io/docs/concepts/services-networking/dual-stack/
- Kubernetes: DNS for Services and Pods: https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/
- Kubernetes: Service: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes: Hello Minikube: https://kubernetes.io/docs/tutorials/hello-minikube/
- Kubernetes: `kubectl run` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes: `kubectl exec` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- curl man page: https://curl.se/docs/manpage.html

## Issues Found
- The backend Deployment used `nginx:latest` with `containerPort: 8080` and a `LISTEN_ADDRESS` environment variable. That would not work as written because the stock NGINX image does not use that environment variable and does not serve HTTP on port `8080` by default. I replaced it with the Kubernetes-documented `registry.k8s.io/e2e-test-images/agnhost:2.53` test image running `/agnhost netexec --http-port=8080`.
- The walkthrough did not actually deploy the backend workload before the connectivity tests. I added `kubectl apply -f backend-deployment.yaml` so the later `curl` examples have endpoints to reach.
- The client pod examples used `sleep infinity` in `alpine`. I changed those to `sleep 3600` and added `--restart=Never` so the commands use a portable one-off test pod pattern supported by current `kubectl run` behavior.
- The isolation test used `curl -4` against an IPv6 literal. According to curl's documentation, `-4` and `-6` constrain hostname resolution, so that was not a correct demonstration of IPv4-only access behavior. I changed the example to query the Service hostname, show that it has an AAAA record and no A record, and then demonstrate that `curl -4` against the hostname fails.
- The conclusion implied that an IPv4-only client could use the Service hostname as an alternative path. I corrected that statement to explain that the hostname also resolves only to the IPv6 Service address, so clients still need IPv6 connectivity.

## Review Notes
- The article is technically sound after the fixes above.
- The `LoadBalancer` dual-stack example assumes the underlying cloud provider or load balancer implementation supports IPv4/IPv6 load balancers, which Kubernetes documents as a prerequisite.
- The post assumes the cluster is already configured for dual-stack networking with an IPv6 Service CIDR available.
