# Why Does kube-hunter Report “No Vulnerabilities” but List Open Kubelet and etcd Services?

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Kubernetes Security, Kubelet, etcd

Description: Interpret kube-hunter's separate service and vulnerability results, then verify whether reachable kubelet or etcd endpoints are authenticated, authorized, and properly contained.

---

“Open service” and “confirmed vulnerability” are different output classes in kube-hunter. Its current reporter builds separate `services` and `vulnerabilities` arrays. A discovered service records its name and location. A vulnerability appears only when a registered hunter receives the discovery event and observes evidence matching its logic. Therefore an open Kubelet or etcd row alongside an empty vulnerability list is possible and not contradictory.

## What the Service Row Proves

Current port discovery attempts TCP connections to several known ports, including kubelet `10250` and etcd client `2379`. Classification strength varies by component: kubelet discovery checks `/pods` response status, while current etcd discovery labels any open `2379` as etcd before a hunter sends etcd-specific requests. A service row therefore records kube-hunter's classification, not guaranteed process identity; corroborate it with protocol and owner evidence.

It does **not** by itself prove:

- unauthenticated data access;
- authorization bypass;
- command execution or write access;
- exposure from the internet or another namespace;
- safety of the component's TLS and client-authentication configuration.

Conversely, an empty vulnerability list does not prove those properties are safe. It says no loaded hunter produced a vulnerability event for the tested path, scope, mode, and revision.

## Check the Run Context

Preserve the raw JSON rather than interpreting terminal formatting:

~~~bash
kube-hunter \
  --remote 192.0.2.40 \
  --report json \
  --log WARNING \
  > result.json

jq '{services, vulnerabilities}' result.json
~~~

Record the image digest or Git commit and run `kube-hunter --list`. Passive mode is the default; active-only hunters are not loaded unless `--active` is supplied. Do not enable active mode merely to make the report less ambiguous, especially in production.

Also verify target resolution and scanner placement. A control-plane bastion, application Pod, and internet runner can receive different results for the same cluster.

## Interpret an Open Kubelet

Kubernetes documents `10250` as the kubelet API port used by the control plane and nodes. Reachability is often necessary, but it should be limited to authorized sources. Kubelet requests pass through authentication and then authorization.

Test only a benign endpoint without credentials and retain the status, headers, and certificate details:

~~~bash
NODE_FQDN=node-1.example.invalid
KUBELET_CA=./kubelet-serving-ca.pem
curl --silent --show-error \
  --cacert "$KUBELET_CA" \
  --output response.txt \
  --dump-header headers.txt \
  --write-out '%{http_code}\n' \
  "https://${NODE_FQDN}:10250/pods"
~~~

Use a CA bundle that validates the kubelet's serving certificate and a hostname present in that certificate; do not assume the Kubernetes API serving CA also signs kubelet certificates. Kubeadm, for example, uses self-signed kubelet serving certificates by default unless signed serving certificates are configured. Establish trust through the cluster owner rather than normalizing `curl -k` into an operational test. `401` means unauthenticated, while `403` can mean the request was authenticated as anonymous but denied by authorization. A `200` response containing Pod data is much stronger evidence and requires immediate investigation.

Review the kubelet configuration through the supported management path. Kubernetes recommends disabling anonymous authentication with `authentication.anonymous.enabled: false`, enabling webhook token authentication where used, and setting authorization mode to `Webhook` instead of `AlwaysAllow`. Managed services may control these settings, so follow the provider's supported configuration rather than editing managed nodes manually.

## Interpret an Open etcd Endpoint

Kubernetes lists `2379-2380` for etcd client and peer traffic on control-plane nodes. In a secured design, client access is tightly limited and etcd uses TLS client certificate authentication. The etcd security guide documents `--client-cert-auth` with a trusted CA for client verification.

Do not probe keys or attempt a write in production. First establish ownership and network intent:

~~~bash
ETCD_HOST=192.0.2.50
timeout 5 openssl s_client \
  -connect "${ETCD_HOST}:2379" \
  -servername "$ETCD_HOST" \
  -showcerts </dev/null
~~~

A TLS handshake without a client certificate is not proof of database access. Validate firewall sources, listener addresses, peer versus client endpoints, certificate requirements, and etcd audit/connection logs. Current kube-hunter etcd code also probes legacy v2 HTTP paths; an empty finding can reflect API-version behavior rather than a complete security assessment.

## Explain the Gap Systematically

For each service, build an evidence table with: TCP reachable, TLS successful, unauthenticated HTTP status, authenticated status if separately authorized, hunter loaded, request path, response body classification, and relevant logs. Common explanations include:

- the port is reachable but authentication blocks requests;
- anonymous authentication is accepted but authorization denies useful operations;
- the hunter's expected endpoint is disabled or version-incompatible;
- a proxy or unrelated service occupies the port;
- a timeout or parsing error prevented a conclusive hunter result;
- passive mode intentionally omitted exploitation-style confirmation.

Run with `--log DEBUG` only in a controlled rerun because debug logs can be noisy or sensitive. Compare implementation, not just display text.

## Check for Version Blind Spots

Compare the component version and enabled APIs with what the pinned hunter actually requests. Current etcd logic uses legacy v2 paths, for example, so a rejected v2 request says little about an incorrectly secured v3 endpoint. Likewise, a reverse proxy may return a generic status that the classifier accepts while hiding the backend. Record mismatches as coverage limitations and validate the component with its supported administrative tools and configuration. Do not translate “this hunter did not recognize evidence” into “the service cannot be abused.”

## Conclusion

An open Kubelet or etcd service is an attack-surface observation, not automatically an exploit. Preserve it as a finding to validate: confirm the network path, inspect the exact hunter, test benign unauthenticated behavior, and verify component authentication and authorization from official configuration. Keep the service reachable only from sources that genuinely require it, even when kube-hunter reports no vulnerability.

## Official References

- [kube-hunter report structure](https://github.com/aquasecurity/kube-hunter/blob/main/kube_hunter/modules/report/base.py)
- [kube-hunter port discovery](https://github.com/aquasecurity/kube-hunter/blob/main/kube_hunter/modules/discovery/ports.py)
- [kube-hunter kubelet discovery and status handling](https://github.com/aquasecurity/kube-hunter/blob/main/kube_hunter/modules/discovery/kubelet.py)
- [kube-hunter etcd hunters](https://github.com/aquasecurity/kube-hunter/blob/main/kube_hunter/modules/hunting/etcd.py)
- [Kubernetes kubelet authentication and authorization](https://kubernetes.io/docs/reference/access-authn-authz/kubelet-authn-authz/)
- [Kubeadm certificate management and kubelet serving certificates](https://kubernetes.io/docs/tasks/administer-cluster/kubeadm/kubeadm-certs/)
- [Kubernetes ports and protocols](https://kubernetes.io/docs/reference/networking/ports-and-protocols/)
- [etcd transport security](https://etcd.io/docs/v3.6/op-guide/security/)
