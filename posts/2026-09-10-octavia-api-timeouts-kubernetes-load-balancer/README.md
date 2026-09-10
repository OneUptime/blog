# How to Diagnose Octavia Timeouts During Load Balancer Creation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, OpenStack, Load Balancing, Networking, Troubleshooting

Description: Separate Octavia API request failures from slow provisioning and unhealthy backends when an OpenStack Kubernetes LoadBalancer Service times out.

---

A Kubernetes Service waiting for an Octavia load balancer can time out at several different layers. The controller might fail to connect to the API, receive a slow HTTP response, or successfully create a resource that never reaches `ACTIVE`. A fourth case looks similar to users: provisioning finishes, but the backend members fail their health checks.

These cases need different repairs. Increasing a listener timeout changes application traffic behavior and does not extend the controller's wait for cloud provisioning.

## Establish the failing phase

Collect the Service state, recent events, and controller logs together:

```bash
kubectl -n production get service web -o yaml
kubectl -n production describe service web
kubectl -n kube-system logs pod/OCCM_POD --since=30m
```

Find the first relevant error, including any request ID and load balancer UUID. A message such as `dial tcp ... i/o timeout` suggests connectivity. `Client.Timeout exceeded while awaiting headers` concerns an HTTP request. A message about waiting for `ACTIVE` concerns an asynchronous cloud operation, though repeated failed status reads can also exhaust that wait.

Preserve the load balancer UUID even when Kubernetes still shows a pending external address. Creation may already have succeeded before a later listener, pool, floating IP, or status update failed. Repeatedly deleting and recreating the Service can make the evidence harder to follow and leave additional cloud resources to reconcile.

## Compare Kubernetes with Octavia's state

Use an OpenStack CLI configured for the same project and region as OCCM. The Octavia client plugin supplies the load balancer commands:

```bash
openstack loadbalancer list
openstack loadbalancer show LOAD_BALANCER_ID -f yaml
openstack loadbalancer status show LOAD_BALANCER_ID
```

Inspect `provisioning_status`, `operating_status`, provider, VIP subnet, and child resources. The [Octavia API reference](https://docs.openstack.org/api-ref/load-balancer/v2/) defines these as separate status dimensions. `ACTIVE` means the configuration operation completed. It does not guarantee that every application backend is healthy.

A load balancer stuck in `PENDING_CREATE` needs investigation of the cloud-side provisioning workflow. Depending on the provider, that can involve Amphora scheduling, image or flavor availability, management-network connectivity, or the provider driver. An `ERROR` provisioning state warrants examining the cloud error, not extending a wait indefinitely.

For an `ACTIVE` load balancer with failing members, inspect the member addresses and NodePorts. Check security groups, node routes, health monitor settings, and the Service's ready EndpointSlices. That branch of the incident is a traffic or health-check problem rather than an API creation timeout.

## Check the endpoint used by the controller

Authenticate with the intended project and inspect its catalog:

```bash
openstack catalog show load-balancer
openstack endpoint list --service load-balancer
```

The endpoint-list operation can require additional privileges. A project user can still inspect the catalog returned by authentication. Compare the selected region and interface with OCCM's `[Global] region` and `os-endpoint-type` settings.

Test DNS resolution, TCP connectivity, and certificate validation from the controller's network environment. A successful CLI call on an administrator's laptop does not prove that a host-networked CCM pod can reach the same API. Conversely, an HTTP 401 from an unauthenticated diagnostic request demonstrates HTTP reachability but does not demonstrate that the controller's credentials are valid.

Measure latency across several read-only calls rather than one successful response. Correlate API request IDs with Octavia API, worker, and provider logs when you operate the cloud. If you consume a hosted OpenStack service, those IDs and the affected project, region, and resource UUID are useful escalation data.

## Tune the setting that matches the evidence

For OCCM v1.36.0, the [provisioning wait implementation](https://github.com/kubernetes/cloud-provider-openstack/blob/v1.36.0/pkg/util/openstack/loadbalancer.go) uses an exponential backoff while reading the load balancer's state. `OCCM_WAIT_LB_ACTIVE_STEPS` changes the number of polling steps. It is a count, not seconds.

If normal, successful provisioning consistently exceeds the existing polling budget, add a measured override to the controller's managed pod template:

```yaml
env:
  - name: OCCM_WAIT_LB_ACTIVE_STEPS
    value: "28"
```

This fragment belongs in the controller container's existing `env` list. Roll out the change through Helm or your controller manifests and compare creation durations afterward. The larger budget also increases how long a failed operation can occupy the controller's reconciliation work.

There is a separate implementation detail worth checking against your exact release: v1.36.0 assigns the shared provider HTTP client's timeout from `[Metadata] request-timeout` in [NewOpenStack](https://github.com/kubernetes/cloud-provider-openstack/blob/v1.36.0/pkg/openstack/openstack.go). Despite that section's name, the assignment affects the provider HTTP client. Do not invent a `[LoadBalancer] api-timeout` key or assume the polling override changes HTTP request deadlines. Check the installed source and assess the broader impact before tuning a request timeout.

Likewise, `loadbalancer.openstack.org/timeout-client-data` and `timeout-member-connect` configure Octavia listeners. They affect traffic through the load balancer after provisioning; they do not repair cloud API reachability.

## Prove recovery on one controlled Service

After the targeted repair, observe one reconciliation through creation, `ACTIVE`, member health, Service status publication, and a real request. Record durations for each phase. A successful external request with continued API errors still leaves future node changes or Service deletion at risk.

## Conclusion

Octavia timeout diagnosis starts by identifying whether the failure is an HTTP request, an asynchronous provisioning wait, or backend health. Change the relevant setting only after that distinction is clear, and verify the complete Service lifecycle afterward.

## Official Documentation

- [Octavia v2 API and resource status](https://docs.openstack.org/api-ref/load-balancer/v2/)
- [OCCM load balancer wait implementation](https://github.com/kubernetes/cloud-provider-openstack/blob/v1.36.0/pkg/util/openstack/loadbalancer.go)
- [OCCM provider HTTP timeout initialization](https://github.com/kubernetes/cloud-provider-openstack/blob/v1.36.0/pkg/openstack/openstack.go)
