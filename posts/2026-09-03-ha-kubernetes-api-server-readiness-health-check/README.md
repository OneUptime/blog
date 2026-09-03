# Health-Check an HA Kubernetes API Server Without Routing to Unready Nodes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Kubernetes API Server, High Availability, Load Balancer, Health Check, HTTP Health Checks, TLS

Description: Design per-replica TLS-verified readiness checks so an HA Kubernetes API endpoint removes unready control-plane nodes before routing client traffic.

---

An HA API endpoint is only as reliable as its backend selection. A control-plane node can accept a TCP connection while kube-apiserver is still initializing, cannot reach etcd, is waiting for watch caches, or has entered graceful shutdown. A port-open check sees all of those states as healthy.

Kubernetes' kubeadm HA guide uses TCP forwarding and describes a TCP check on the API server port as a broadly compatible baseline. If the requirement is stricter-never intentionally select a replica that Kubernetes reports unready-the load balancer must evaluate `/readyz`, either directly or through a narrowly scoped health-check agent.

## Keep the Data Path and Probe Path Distinct

For a TLS-pass-through design, normal client traffic should remain end-to-end encrypted to kube-apiserver. The shared address should match kubeadm's `controlPlaneEndpoint` and appear in each API server serving certificate's SANs.

The health checker should contact each backend directly:

```text
Clients -> api.example.net:6443 -> load balancer -> selected API server
                                      |
                                      +-> api-1.example.net:6443/readyz
                                      +-> api-2.example.net:6443/readyz
                                      +-> api-3.example.net:6443/readyz
```

Do not probe the shared virtual address to decide whether one backend is healthy. That request can land on a different node and falsely mark the failing target healthy.

## Define a Strict Readiness Contract

A production check should:

1. connect to the individual backend's secure API port;
2. perform TLS with a backend hostname or IP that is in that certificate's SANs;
3. verify the certificate against the cluster CA;
4. send `GET /readyz` with any required authentication;
5. accept exactly HTTP `200`; and
6. treat timeouts, TLS errors, 401, 403, redirects, and 5xx responses as failures.

Use the body only during diagnosis. Kubernetes documents the status code as the machine-readable contract and `?verbose` as an operator aid.

A direct operator test can preserve the certified hostname while selecting a particular address:

```bash
http_status="$(
  curl --silent --show-error --output /dev/null --write-out '%{http_code}' \
    --resolve api-1.example.net:6443:10.0.0.11 \
    --cacert /secure/cluster-ca.crt \
    --cert /secure/health-check.crt \
    --key /secure/health-check.key \
    https://api-1.example.net:6443/readyz
)" && test "$http_status" = 200
```

The certificate and key locations are examples. Never copy `/etc/kubernetes/admin.conf` or another cluster-admin credential onto a load balancer merely to run a health check.

## Authorize Only the Health Path

Whether `/readyz` permits unauthenticated access depends on the API server's anonymous-authentication and authorization configuration. Do not make every anonymous API request broadly permissible for monitoring convenience.

When the load balancer can send a credential, bind a dedicated identity only to the non-resource readiness URL:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: api-readiness-reader
rules:
  - nonResourceURLs: ["/readyz"]
    verbs: ["get"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: api-readiness-reader
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: api-readiness-reader
subjects:
  - apiGroup: rbac.authorization.k8s.io
    kind: User
    name: load-balancer-health-check
```

The subject must match the identity produced by your actual authentication method. Protect and rotate its credential. If the load-balancer product cannot attach authentication to HTTPS checks, use a supported, local health agent that authenticates to the local API server and exposes only a network-restricted boolean result. Monitor that agent too; it becomes part of the decision path.

## Configure TLS Checking Deliberately

An L4 load balancer can pass client TLS through while using a separate TLS-enabled HTTP transaction for active checks. The product must support backend TLS, SNI or an equivalent server-name selection, CA verification, a custom path, and exact status matching. HAProxy, for example, documents HTTP checks, TLS connection arguments, expected statuses, rise/fall thresholds, and server-side certificate verification.

Avoid `verify none`, `curl -k`, or a probe hostname absent from the SANs. An unverified check can succeed against the wrong service after an addressing or routing mistake. Also ensure the probe source is allowed by host firewalls and network policy; a blocked health checker makes healthy servers look down.

## Choose Thresholds Around Kubernetes Shutdown

A single dropped packet should not flap a control plane, but a long failure window can continue routing to an unready node. Set and test:

- a connection and response timeout shorter than the probe interval;
- a small consecutive-failure threshold for removal;
- a consecutive-success threshold before re-entry; and
- a check interval appropriate to the API error budget.

Coordinate those values with kube-apiserver's `--shutdown-delay-duration`. During that delay, `/readyz` fails immediately while `/livez` stays successful and normal serving continues temporarily. The delay exists so readiness-aware load balancers can withdraw the backend before termination and request draining.

Do not use `/livez` for backend admission. It answers whether the process should be restarted, not whether it should receive normal traffic.

## Test Failure Modes, Not Just the Happy Path

Before relying on the design, exercise one backend at a time while the others remain healthy:

- start a controlled kube-apiserver restart and measure time to removal;
- verify a TLS name or CA error marks only that backend down;
- confirm a 401 or 403 is not accepted as “HTTP reachable”;
- observe readiness during API server startup and graceful shutdown;
- ensure long-lived watches reconnect through another ready backend; and
- confirm the node returns only after sustained `200` responses.

Compare direct probes with the load balancer's backend state and an authenticated request through the shared endpoint. Monitor ready backend count, transition frequency, probe latency, connection errors, and API request latency. Alert before the pool reaches one healthy member; an HA endpoint with one backend has no remaining fault tolerance.

During maintenance, verify at least two other replicas are ready, remove or drain the target, wait for connections according to the load balancer's documented behavior, perform the change, then require stable readiness before returning it. Work one control-plane node at a time.

## Conclusion

TCP reachability is a useful bootstrap check, but it cannot enforce Kubernetes readiness. Probe each backend's TLS-verified `/readyz`, authorize the probe narrowly, require exactly `200`, and align load-balancer thresholds with graceful shutdown. Validate the full behavior under restart, dependency failure, and credential failure before calling the HA endpoint safe.

## Official References

- [Kubernetes: Creating Highly Available Clusters with kubeadm](https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/high-availability/)
- [Kubernetes: API Health Endpoints](https://kubernetes.io/docs/reference/using-api/health-checks/)
- [Kubernetes: kube-apiserver Command-Line Reference](https://kubernetes.io/docs/reference/command-line-tools-reference/kube-apiserver/)
- [Kubernetes: Using RBAC Authorization](https://kubernetes.io/docs/reference/access-authn-authz/rbac/)
- [HAProxy: Health Checks](https://www.haproxy.com/documentation/haproxy-configuration-tutorials/reliability/health-checks/)
- [HAProxy: Server-Side TLS Certificate Verification](https://www.haproxy.com/documentation/haproxy-configuration-tutorials/security/ssl-tls/server-side-encryption/)
