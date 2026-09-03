# Why Does kube-hunter Time Out While kubectl Works? Troubleshooting DNS, Routing, and API Endpoint Access

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Kubernetes Security, Troubleshooting, DNS, Routing

Description: Diagnose differences between kubectl and kube-hunter by comparing target, runtime network namespace, DNS, proxy, route, TLS, authentication, and scanner timeouts.

---

`kubectl` working proves that one client can reach the API server URL in its selected kubeconfig and authenticate. kube-hunter may run in another container or Pod, resolve another address, target nodes instead of the API, bypass a proxy, or probe ports that a Kubernetes API request never uses. A timeout is usually a path mismatch, not a reason to increase every timeout.

## Compare the Exact Questions

First capture what `kubectl` is contacting without printing credentials:

~~~bash
kubectl config current-context
kubectl config view --minify \
  -o jsonpath='{.clusters[0].cluster.server}{"\n"}'
kubectl get --raw='/readyz?verbose'
~~~

The readiness request is authenticated according to the active kubeconfig. kube-hunter `--remote` accepts the hosts you provide and its current port-discovery source probes a fixed list of Kubernetes-associated ports. If you passed node IPs, a CIDR, or a load balancer rather than the kubeconfig API hostname, the tools are not testing the same destination.

Record exact target, port, protocol, source runtime, UTC time, kube-hunter revision, and proxy environment for both commands.

## Test Inside the Scanner Runtime

Do not debug only from the laptop or CI host when kube-hunter runs in Docker. Containers have their own DNS, routes, proxy variables, and certificate files. Start the exact approved image with a shell only if it contains one; otherwise use a separate diagnostic container attached to the same network namespace and policy.

At minimum, collect from the scanner environment:

~~~bash
getent ahosts api.example.invalid
ip address
ip route
env | rg -i '^(http|https|no)_proxy='
~~~

Compare DNS answers with the `kubectl` environment. Private cluster names may resolve to private IPs only in a linked VPC/VNet. Split-horizon DNS, search suffixes, stale caches, and IPv6-first answers commonly produce a timeout from one runtime but not another.

Never paste proxy variables if they contain credentials. Check that `NO_PROXY` contains the API hostname and relevant private CIDRs when direct access is required. CIDR matching behavior differs across clients, so prefer explicit hostnames plus a verified runtime test.

## Walk the Path in Layers

### DNS

Resolve A and AAAA records from both environments. Confirm every address belongs to the expected cluster. If IPv6 is returned but the runner has no IPv6 route, fix DNS or routing rather than disabling certificate checks.

### Route and firewall

For each resolved address:

~~~bash
TARGET_IP=192.0.2.40
ip route get "$TARGET_IP"
nc -vz -w 3 "$TARGET_IP" 6443
~~~

Inspect security groups, VPC/VNet firewall rules, Kubernetes egress NetworkPolicies, network ACLs, VPN/peering, NAT, and the return path. `kubectl` may traverse a corporate VPN or authenticated proxy that is absent in CI.

### TLS

~~~bash
openssl s_client \
  -connect 192.0.2.40:6443 \
  -servername api.example.invalid \
  -CAfile ./api-serving-ca.pem \
  -verify_hostname api.example.invalid \
  -verify_return_error </dev/null
~~~

A connection timeout precedes TLS. A certificate error means routing worked; repair CA trust or server-name use. Do not convert a trust failure into `verify=false` as a permanent workaround.

### HTTP and authentication

An HTTP `401` or `403` is not a network timeout. It proves the request reached an API. kube-hunter remote scanning is normally unauthenticated, while `kubectl` may execute a cloud credential plugin and send a valid token. If the purpose is attack-surface testing, the unauthenticated denial is expected evidence—not something to bypass with an admin token.

## Understand kube-hunter Timeout Controls

Current parser source provides `--network-timeout` for network operations and `--num-worker-threads` for concurrency. However, current port-discovery source uses its own `1.5` second socket timeout for the initial TCP probe. Raising `--network-timeout` therefore cannot fix every missed port in that revision.

In a high-latency lab, a diagnostic run might be:

~~~bash
kube-hunter \
  --remote api.example.invalid \
  --network-timeout 10 \
  --num-worker-threads 50 \
  --log DEBUG \
  --report json \
  > report.json
~~~

Use debug logs only in a protected environment. Lower concurrency can help resource-constrained runners, but it does not create routes, DNS, or firewall permissions. Pin the revision because implementation timeouts can change.

## Check Managed Private Endpoints

For EKS private-only APIs, AWS requires access from the VPC or a connected network. AKS private clusters depend on Private Link and private DNS visible to the client VNet. GKE private IP and DNS endpoints have distinct reachability controls. A cloud management CLI successfully describing a cluster does not prove access to its Kubernetes API; management APIs are separate services.

Move the CI runner onto a supported private path instead of briefly enabling public access. Test DNS from the runner after any VPC/VNet link change.

## Decide Whether the Run Was Complete

A scanner that timed out against expected targets is `inconclusive`, even if its JSON contains no vulnerabilities. Preserve target coverage, connection errors, and raw output. Once the path is fixed, repeat with the same target list and image digest. Compare discovered services first; only then interpret vulnerability differences.

## Conclusion

When `kubectl` works and kube-hunter times out, align destination and runtime before tuning. Compare API URL, DNS answers, routes, proxies, TLS, and credentials from inside the scanner environment. Remember that kube-hunter's timeout controls may not govern every discovery socket. Treat missing coverage as failure, not a clean security result.

## Official References

- [kube-hunter parser and timeout options](https://github.com/aquasecurity/kube-hunter/blob/main/kube_hunter/conf/parser.py)
- [kube-hunter port discovery implementation](https://github.com/aquasecurity/kube-hunter/blob/main/kube_hunter/modules/discovery/ports.py)
- [Kubernetes troubleshooting kubectl](https://kubernetes.io/docs/tasks/debug/debug-cluster/troubleshoot-kubectl/)
- [Kubernetes API health endpoints](https://kubernetes.io/docs/reference/using-api/health-checks/)
- [Amazon EKS endpoint access](https://docs.aws.amazon.com/eks/latest/userguide/config-cluster-endpoint.html)
- [Private AKS clusters](https://learn.microsoft.com/en-us/azure/aks/private-clusters)
- [GKE network isolation](https://cloud.google.com/kubernetes-engine/docs/how-to/latest/network-isolation)
