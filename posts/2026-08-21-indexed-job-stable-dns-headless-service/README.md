# How to Give Indexed Job Pods Stable DNS with a Headless Service

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Indexed Job, Headless Service, Pod DNS, Batch Workloads, Peer Communication

Description: Combine Indexed completion mode, a matching Pod subdomain, and a headless Service to address active Job workers by completion index.

---

Indexed Jobs give each completion a deterministic integer from `0` through `completions - 1`. Kubernetes makes that index available in the Pod hostname using this pattern:

~~~text
<job-name>-<completion-index>
~~~

To make the hostname resolvable, pair the Job with a same-namespace headless Service and set the Job Pod template's `subdomain` to the Service name. For a Job named `render` and Service named `render-peers`, worker 2 can then be addressed as:

~~~text
render-2.render-peers.batch.svc.<cluster-domain>
~~~

This gives the logical completion index a predictable name while its Pod is active. It does not turn a finite Job into a long-lived Service or preserve DNS after the worker completes.

## Create the Headless Service First

Select the Job's automatically applied label:

~~~yaml
apiVersion: v1
kind: Service
metadata:
  name: render-peers
  namespace: batch
spec:
  clusterIP: None
  publishNotReadyAddresses: true
  selector:
    batch.kubernetes.io/job-name: render
~~~

Current Jobs label their Pods with `batch.kubernetes.io/job-name`. Kubernetes' task example also documents the older unprefixed `job-name` label; prefer the current prefixed label and confirm it on your target Kubernetes version.

`publishNotReadyAddresses: true` is useful when workers need to discover one another before an application readiness probe can succeed. It exposes booting workers to all consumers of the Service's endpoint data, so use this Service only for internal worker discovery.

## Set Indexed Mode and the Matching Subdomain

~~~yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: render
  namespace: batch
spec:
  completions: 4
  parallelism: 4
  completionMode: Indexed
  backoffLimitPerIndex: 2
  activeDeadlineSeconds: 600
  template:
    spec:
      subdomain: render-peers
      restartPolicy: Never
      containers:
        - name: worker
          image: bash:5.2
          command:
            - bash
            - -ceu
            - |
              echo "worker index: ${JOB_COMPLETION_INDEX}"
              for i in 0 1 2 3; do
                peer="render-${i}.render-peers"
                until ping -c 1 "${peer}" >/dev/null 2>&1; do
                  echo "waiting for ${peer}"
                  sleep 1
                done
                echo "reached ${peer}"
              done
~~~

The required pieces are:

- `completions` is non-null and sets the index range;
- `completionMode: Indexed` gives each completion an index;
- `subdomain: render-peers` exactly matches the headless Service name;
- Service and Job share the `batch` namespace;
- the Service selector matches the Job Pods;
- normal cluster DNS policy remains in effect.

Kubernetes also exposes the index through the `batch.kubernetes.io/job-completion-index` annotation, through a label on current releases, and as `JOB_COMPLETION_INDEX` in the container. The bounded example follows the official Pod-to-Pod communication pattern: each worker retries the deterministic peer names, and the Job-level deadline prevents a permanent DNS or scheduling problem from looping forever. `ping` checks reachability as well as name resolution; replace it with a DNS-only lookup or the application's real connection check in environments that block ICMP.

## Construct the Worker FQDNs

For four completions, the names are:

~~~text
render-0.render-peers.batch.svc.<cluster-domain>
render-1.render-peers.batch.svc.<cluster-domain>
render-2.render-peers.batch.svc.<cluster-domain>
render-3.render-peers.batch.svc.<cluster-domain>
~~~

Inside the same namespace with the default `ClusterFirst` DNS policy, `render-2.render-peers` normally resolves through the search list. Use the complete FQDN in cross-namespace configuration, certificates, or code that should not depend on resolver search behavior.

Do not assume `cluster.local`. Inspect a Job Pod's `/etc/resolv.conf` or obtain the cluster domain from cluster configuration, then supply it as application configuration when building absolute names.

## Verify Hostname, Labels, and DNS

List the Job Pods and their indexes:

~~~bash
kubectl -n batch get pods \
  -l batch.kubernetes.io/job-name=render \
  -L batch.kubernetes.io/job-completion-index \
  -o wide
~~~

The Pod **resource names** include controller-generated suffixes, but the hostnames inside Indexed Job Pods follow `render-<index>`:

~~~bash
kubectl -n batch exec <pod-resource-name> -- hostname
kubectl -n batch exec <pod-resource-name> -- printenv JOB_COMPLETION_INDEX
~~~

Inspect EndpointSlices:

~~~bash
kubectl -n batch get endpointslice \
  -l kubernetes.io/service-name=render-peers \
  -o yaml
~~~

Then query from a running Pod that has `dig` installed and uses cluster DNS:

~~~bash
dig +noall +answer \
  render-2.render-peers.batch.svc.cluster.local. A
~~~

Replace the cluster domain as needed. The per-worker A or AAAA name comes from the Indexed Job hostname and matching subdomain. Address records do not require a Service port; add a named Service port that matches a real worker listener only when clients also need SRV port discovery.

## Make the Peer Loop Bounded

Workers may start at different times, DNS updates can take time, and scheduling does not guarantee all `parallelism` Pods are running simultaneously. Peer code should retry missing names and connections with backoff and a deadline rather than loop forever.

A shell sketch can derive the names from a known completion count:

~~~bash
cluster_domain="${CLUSTER_DOMAIN:?set CLUSTER_DOMAIN}"
completion_count="${COMPLETION_COUNT:?set COMPLETION_COUNT}"

i=0
while [ "$i" -lt "$completion_count" ]; do
  peer="render-${i}.render-peers.batch.svc.${cluster_domain}"
  echo "peer ${i}: ${peer}"
  i=$((i + 1))
done
~~~

Name construction is deterministic; availability is not. Add connection timeouts, jittered retry, and an overall bootstrap deadline in the real application.

## Understand Retry and Completion Semantics

The stable portion is the logical index hostname, not a particular Pod object or IP. If a worker fails, the Job controller can create another Pod for the same index. The replacement uses the same index-derived hostname but has a different Pod UID and may have a different IP.

Kubernetes documents that, in rare failure scenarios, more than one Pod can run for the same index temporarily. Only the first successful completion counts, and the controller removes duplicates when it detects them. A distributed protocol must therefore not treat the index hostname as proof that exactly one process has ever claimed that identity. Use application-level fencing, attempt identifiers, leases, or idempotent work when duplicate execution could corrupt results.

When a Job Pod reaches a terminal phase, it is no longer a ready serving endpoint and its DNS record should not be treated as a durable archive. `ttlSecondsAfterFinished`, manual deletion, or garbage collection can remove the Job and Pods entirely.

## Diagnose a Missing Worker Name

Check these links:

~~~bash
kubectl -n batch get job render \
  -o jsonpath='{.spec.completionMode}{"\n"}{.spec.template.spec.subdomain}{"\n"}'

kubectl -n batch get service render-peers -o yaml

kubectl -n batch get pods \
  -l batch.kubernetes.io/job-name=render \
  --show-labels

kubectl -n batch get endpointslice \
  -l kubernetes.io/service-name=render-peers \
  -o yaml
~~~

A common mistake is expecting the Pod resource name shown by `kubectl get pods` to be the DNS hostname. For Indexed mode, query `<job-name>-<index>.<service>...`. Also check that the Pod is still running, the Service selector matches, `subdomain` matches the Service, the namespace and cluster domain are correct, and the Pod uses `ClusterFirst` DNS rather than `Default` or a `None` policy whose `dnsConfig` does not configure cluster DNS.

## Official Documentation

- [Kubernetes Jobs and Indexed completion mode](https://kubernetes.io/docs/concepts/workloads/controllers/job/#completion-mode)
- [Kubernetes Job with Pod-to-Pod communication](https://kubernetes.io/docs/tasks/job/job-with-pod-to-pod-communication/)
- [Kubernetes DNS Pod hostname and subdomain fields](https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/#pod-hostname-and-subdomain-field)
- [Kubernetes headless Services](https://kubernetes.io/docs/concepts/services-networking/service/#headless-services)
- [Kubernetes automatic cleanup for finished Jobs](https://kubernetes.io/docs/concepts/workloads/controllers/ttlafterfinished/)

## Conclusion

Indexed Job DNS needs three aligned identities: the Job supplies `<job-name>-<index>`, the Pod template supplies a subdomain, and the same-namespace headless Service owns that subdomain and selects the Job Pods. Treat the resulting name as a stable active-worker index, while still designing for scheduling delay, retries, duplicate attempts, changing IPs, and eventual Job cleanup.
