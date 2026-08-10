# Why Load Balancer Health Checks Fail After CCM Provisioning—and Which Service Annotations to Inspect

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Cloud Controller Manager, LoadBalancer, Health Checks, Service Annotations, Troubleshooting

Description: Diagnose a provisioned Kubernetes cloud load balancer whose backends stay unhealthy by tracing Service ownership, endpoint readiness, target mode, traffic policy, firewalls, and provider annotations.

---

When a `LoadBalancer` Service already has an external address but the provider marks every backend unhealthy, provisioning has progressed farther than a Service stuck at `<pending>`. The cloud-controller-manager (CCM) or selected load-balancer controller created infrastructure; now the health-check path from that infrastructure to the selected backend is failing.

Kubernetes intentionally does not standardize provider load-balancer health checks. Protocol, port, path, thresholds, target type, and annotations are implementation-specific. Use the installed controller's exact versioned documentation rather than treating annotations from AWS, Google Cloud, Azure, or another provider as portable.

## Map the Complete Path

First determine which path the controller built:

```text
health checker
  -> firewall / security group / network policy boundary
  -> node address + healthCheckNodePort or Service NodePort
     OR pod IP + target port
  -> kube-proxy / CNI data plane where applicable
  -> ready application endpoint
```

A public address proves the front end exists. It does not prove targets are registered, probes can traverse the network, or the application answers the configured check.

## Capture Service Ownership and Status

```bash
NS=app
SVC=web

kubectl get service -n "$NS" "$SVC" -o yaml
kubectl describe service -n "$NS" "$SVC"
kubectl get endpointslice -n "$NS" \
  -l kubernetes.io/service-name="$SVC" -o yaml
```

Record:

- `spec.loadBalancerClass` and every annotation;
- controller Events and their source;
- `.status.loadBalancer`;
- `externalTrafficPolicy` and `internalTrafficPolicy`;
- `allocateLoadBalancerNodePorts`;
- each Service `port`, `targetPort`, `nodePort`, protocol, and `appProtocol`;
- `healthCheckNodePort` if present;
- selector and ready EndpointSlice addresses; and
- `loadBalancerSourceRanges`, IP families, and traffic distribution settings.

Identify the controller from class, Events, installed admission webhooks, and logs. A cluster can have a default CCM Service controller plus a specialized provider load-balancer controller. Reading the wrong controller's annotation guide wastes time and can introduce conflicting ownership.

## 1. Prove the Application Endpoint Is Ready

Health checks cannot succeed when the Service has no ready endpoints:

```bash
kubectl get pods -n "$NS" -l app=web -o wide
kubectl describe pod -n "$NS" WEB_POD
kubectl get endpointslice -n "$NS" -l kubernetes.io/service-name="$SVC"
```

Verify the Service selector matches the intended Pods, readiness probes succeed, `targetPort` resolves to the actual listening container port, and the application listens on the Pod interface rather than only `127.0.0.1`.

Test from inside the cluster using an approved diagnostic image:

```bash
kubectl run -n "$NS" lb-debug --rm -it --restart=Never \
  --image=curlimages/curl -- \
  curl -fsS http://SERVICE_CLUSTER_IP:SERVICE_PORT/HEALTH_PATH
```

Use the real protocol, port, and path. An HTTP probe usually expects a success status; redirects, authentication challenges, host-header requirements, or TLS name mismatch may mark an otherwise functional application unhealthy.

## 2. Understand `externalTrafficPolicy`

With `externalTrafficPolicy: Cluster`, provider traffic can normally arrive at a Node and be forwarded to a ready endpoint elsewhere, depending on the implementation. With `Local`, traffic is kept on Nodes that have local ready endpoints to preserve source IP and avoid an extra hop. The load balancer must stop sending application traffic to Nodes without local endpoints.

Kubernetes supports a `healthCheckNodePort` for `LoadBalancer` Services using `externalTrafficPolicy: Local`. The provider can probe that port to decide which Nodes have local endpoints.

```bash
kubectl get service -n "$NS" "$SVC" \
  -o jsonpath='{.spec.externalTrafficPolicy}{"\t"}{.spec.healthCheckNodePort}{"\n"}'
```

Common failures include:

- the health-check source ranges cannot reach `healthCheckNodePort`;
- kube-proxy or its replacement does not program the port correctly;
- no ready endpoint is local to a registered Node;
- a controller expects instance targets but the manifest disables NodePort allocation; or
- the provider target set includes Nodes that should not receive traffic.

Do not switch to `Cluster` merely to make the health check green without evaluating client IP preservation, traffic path, and provider behavior.

## 3. Check Target Mode and NodePort Allocation

Provider controllers may register Nodes/instances or Pod IPs as targets.

For instance targets, verify:

- the Service has the required NodePort or health-check port;
- every registered Node address is correct and reachable;
- firewalls or security groups allow health-check sources to that port; and
- kube-proxy/CNI can forward to a ready endpoint.

For Pod/IP targets, verify:

- provider networking can route directly to Pod CIDRs;
- the selected Pods are registered and ready;
- security policy allows probe traffic to the target port;
- the CNI and provider controller agree on address family; and
- the controller version supports the chosen target type.

`spec.allocateLoadBalancerNodePorts: false` is valid only when the load-balancer implementation can route without NodePorts. If an annotation selects instance targets while NodePorts are disabled, the design is internally inconsistent.

## 4. Compare the Actual Provider Health Check

Use the provider console or official CLI to record:

- protocol: TCP, HTTP, HTTPS, HTTP/2, or another supported type;
- destination port and whether it is a fixed port, traffic port, NodePort, or health-check NodePort;
- HTTP path, method, host, and accepted response range;
- interval, timeout, healthy and unhealthy thresholds;
- registered targets and their exact addresses;
- source ranges or provider health-check service identity; and
- per-target failure reason.

Then compare that resource with the desired Service annotations and controller logs. Do not edit the provider-created health check manually unless the controller documentation explicitly allows it; reconciliation can revert the change or replace the resource.

## 5. Inspect Only Annotations Owned by This Controller

Provider annotations commonly select or configure:

- internal versus internet-facing scheme;
- load-balancer implementation or SKU;
- instance versus Pod/IP target mode;
- backend and health-check protocol;
- health-check port and path;
- probe interval, timeout, and thresholds;
- backend protocol and TLS termination;
- proxy protocol or client IP preservation;
- subnet/network placement;
- security-group or firewall management; and
- cross-zone or regional behavior.

The names, accepted values, defaults, deprecations, and mutability differ by controller version. Export the live Service, render the chart or manifest that produced it, and compare each annotation to the exact official guide. Check for:

- a typo that the controller ignores;
- a deprecated annotation replaced by a field or policy resource;
- string versus integer formatting;
- conflicting old and new annotations;
- an admission webhook that mutates `loadBalancerClass` or annotations; and
- an annotation belonging to a different controller.

Avoid copying a multi-cloud annotation block. Unknown annotations are often silently ignored, which makes an incorrect default look like a networking failure.

## 6. Test the Network from the Correct Origin

A successful curl from a developer laptop does not prove the provider health checker can reach the backend. Check provider-documented source ranges or managed security rules and the actual target port.

For instance targets, test the NodePort from a network with equivalent routing and policy. For IP targets, test the Pod IP only from a network that is legitimately routed to Pod CIDRs. Use flow logs, firewall logs, CNI observability, or packet capture under your security procedures to determine whether probes arrive and whether replies leave through a symmetric path.

Also inspect:

- Node `InternalIP` accuracy;
- return routes and network ACLs;
- `loadBalancerSourceRanges` interaction with implementation behavior;
- NetworkPolicy support for host/NodePort versus Pod-IP traffic;
- IPv4/IPv6 family mismatch; and
- source NAT or direct-server-return assumptions.

## 7. Separate Health Checks from User Traffic

If targets are healthy but users fail, inspect listeners, certificates, DNS, source restrictions, and application protocol. If health checks fail but direct user traffic sometimes works, the probe may use a different port, path, host, or protocol.

Build a health endpoint that is cheap and reflects the dependency boundary the load balancer should use. Do not require end-user authentication on it. Avoid a deep dependency check that removes every replica during a shared downstream outage unless that fail-closed behavior is intentional.

## A Safe Repair Loop

1. Save Service YAML, Events, controller logs, and provider target-health details.
2. Identify the single owning controller and its exact version.
3. Prove ready EndpointSlices and application listening behavior.
4. Validate target mode, traffic policy, NodePort allocation, and Node addresses.
5. Compare provider health-check settings to supported Service annotations.
6. Fix the declarative Service or policy resource, not the generated provider object.
7. Watch controller logs, Events, target health, and user traffic converge.
8. Create a disposable canary Service to prove future provisioning uses the corrected defaults.

## Official Documentation

- [Kubernetes: Service type LoadBalancer and health checks](https://kubernetes.io/docs/concepts/services-networking/service/#loadbalancer)
- [Kubernetes: Traffic policies](https://kubernetes.io/docs/reference/networking/virtual-ips/#traffic-policies)
- [Kubernetes: EndpointSlices](https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/)
- [AWS Load Balancer Controller: Service annotations](https://kubernetes-sigs.github.io/aws-load-balancer-controller/latest/guide/service/annotations/)
- [Google Kubernetes Engine: LoadBalancer Service parameters](https://cloud.google.com/kubernetes-engine/docs/concepts/service-load-balancer-parameters)
- [Azure Kubernetes Service: Customize the load balancer health probe](https://learn.microsoft.com/en-us/azure/aks/load-balancer-standard#customize-the-load-balancer-health-probe)

## Conclusion

Once an external address exists, troubleshoot backend health as a path problem: controller ownership, ready endpoints, target type, traffic policy, health-check port and protocol, firewall reachability, and provider-specific annotations. Kubernetes does not define one portable health-check annotation set. Change the declarative object owned by the installed controller, then prove both target health and real traffic.
