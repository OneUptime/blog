# Why `kops validate cluster` Cannot Resolve the API DNS Name-and How to Fix It

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: kOps, Kubernetes, DNS, Amazon Route 53, API Server, Troubleshooting

Description: Diagnose kOps API name-resolution failures by separating endpoint selection, public or private DNS visibility, Route 53 delegation, and control-plane health.

---

`kops validate cluster` needs more than a readable state store. It also needs to reach the Kubernetes API server. A failure such as `lookup api.prod.example.com: no such host` happens before Kubernetes can authenticate the client or report node health.

Fix the resolution path first. Changing credentials, restarting kubelets, or forcing a rolling update cannot repair an API name that the operator’s resolver cannot answer.

## Identify the Endpoint kOps Is Actually Using

Current `kops validate cluster` supports three endpoint-selection controls:

- the endpoint inferred from the named cluster;
- `--use-kubeconfig`, which uses the server in the local kubeconfig;
- `--api-server`, which explicitly overrides the server.

Start with explicit cluster and state values, then compare the inferred design with kubeconfig:

```bash
CLUSTER_NAME=prod.example.com
STATE_STORE=s3://company-kops-state

kops get cluster "${CLUSTER_NAME}" \
  --state "${STATE_STORE}" \
  -o yaml

kubectl config view --context "${CLUSTER_NAME}" --minify \
  -o jsonpath='{.clusters[0].cluster.server}{"\n"}'
```

In the cluster spec, inspect `spec.api` and the DNS configuration. kOps can expose the API directly through DNS or through a load balancer. Its boot documentation describes conventional external and internal names such as `api.<cluster-name>` and `api.internal.<cluster-name>`.

Run validation both ways only to expose a selection difference:

```bash
kops validate cluster "${CLUSTER_NAME}" \
  --state "${STATE_STORE}" \
  --wait 2m

kops validate cluster "${CLUSTER_NAME}" \
  --state "${STATE_STORE}" \
  --use-kubeconfig \
  --wait 2m
```

If the first fails DNS resolution and the second reaches the API, the cluster may be healthy while kOps inference and the exported kubeconfig point to different names. Do not make `--use-kubeconfig` a permanent disguise until you understand why.

## Classify the DNS Answer

Query from the same machine and network where kOps runs:

```bash
API_NAME=api.prod.example.com

dig "${API_NAME}" A
dig "${API_NAME}" AAAA
```

The failure class narrows the investigation:

| Result | Likely layer |
| --- | --- |
| `NXDOMAIN` | Name or delegation is absent from the visible DNS hierarchy |
| `SERVFAIL` | Authoritative-server, DNSSEC, or resolver-chain failure |
| Timeout | Resolver, firewall, VPN, or Route 53 Resolver path |
| Correct answer, connection timeout | Routing, security group, private endpoint, or load balancer |
| Wrong or old answer | Stale cache, duplicate zone, or old record |
| TLS hostname error | Endpoint and certificate identity do not match |

DNS success only proves name resolution. It does not prove that the load balancer has healthy targets or that the API server is ready.

## Check Public Delegation from the Parent Down

For a public Route 53 zone, verify the delegated zone before inspecting the API record:

```bash
dig NS prod.example.com
dig +trace api.prod.example.com
```

If `prod.example.com` has its own hosted zone, the parent `example.com` zone must contain NS records matching the four name servers Route 53 assigned to the child zone. Creating the child hosted zone without adding that parent delegation leaves its records invisible to normal public resolvers.

Inspect the AWS side without changing it:

```bash
aws route53 list-hosted-zones-by-name \
  --dns-name prod.example.com \
  --max-items 5
```

After identifying the intended hosted-zone ID, list the relevant records:

```bash
aws route53 list-resource-record-sets \
  --hosted-zone-id ZONE_ID \
  --query 'ResourceRecordSets[?Name==`api.prod.example.com.`]'
```

Compare the hosted zone’s name servers with the parent delegation. Do not create a second hosted zone with the same name as a quick fix; duplicate public or private zones often make diagnosis harder.

The kOps AWS guide explicitly says to validate NS records before building the cluster and calls DNS a critical dependency when the API does not come up.

## Respect Private DNS and Private API Boundaries

A private hosted zone is answered only through associated VPCs and their Route 53 Resolver path. An internal API load balancer is routable only from the connected private network. Running kOps from an unrelated laptop can therefore produce either a DNS failure or a private-address connection timeout while the cluster remains healthy.

Test from an approved location with both:

- network connectivity to the VPC, such as a corporate VPN or managed administration host;
- DNS forwarding that can resolve the associated private hosted zone.

Check the result from inside the intended VPC and from the operator workstation. Different answers indicate split-horizon DNS, which may be correct by design.

`--use-kubeconfig` changes the endpoint kOps selects; it does not create a VPN, associate a private hosted zone, or make an internal load balancer public.

## Handle Gossip and None-DNS Clusters Correctly

kOps gossip clusters use a name ending in `.k8s.local` and do not depend on an externally hosted DNS zone for API discovery. The official gossip documentation requires a load balancer and says kOps writes that load balancer’s DNS name into the generated kubeconfig.

Gossip is deprecated in kOps 1.36. kOps 1.37 rejects new gossip clusters, and kOps 1.38 requires existing gossip clusters to migrate before upgrading. Migrate existing gossip clusters to None DNS or a hosted DNS zone. A None-DNS cluster, including one whose name ends in `.k8s.local`, is not a gossip cluster.

Neither gossip nor None DNS publishes an API record in a hosted zone. On AWS, kOps uses the API load balancer endpoint directly in the generated client configuration.

For gossip or a deliberately None-DNS design, inspect the generated kubeconfig and validate with it:

```bash
kops export kubeconfig "${CLUSTER_NAME}" \
  --state "${STATE_STORE}" \
  --admin=1h \
  --kubeconfig ./cluster-endpoint.kubeconfig

KUBECONFIG=./cluster-endpoint.kubeconfig \
  kops validate cluster "${CLUSTER_NAME}" \
  --state "${STATE_STORE}" \
  --use-kubeconfig \
  --wait 10m
```

The isolated example uses a one-hour administrator credential because a new kubeconfig file has no existing user to reuse. Protect and remove that privileged file after diagnosis. In an established kubeconfig, `--user EXISTING_USER` can reuse the organization’s configured identity instead of minting an administrator certificate.

## If the Record Is Missing, Check Control-Plane Creation

With `spec.api.dns`, `dns-controller` creates direct API records from the API server pod annotations. A missing direct record can therefore be a symptom of a control plane that never came up.

With `spec.api.loadBalancer`, kOps creates the Route 53 records that point to the load balancer as part of infrastructure reconciliation; `dns-controller` does not create those load-balancer records. If such a record is missing, inspect the cluster spec and the most recent `kops update cluster --yes` result. Treat load-balancer target health as a separate check.

Use cloud-side evidence:

```bash
kops get instances "${CLUSTER_NAME}" \
  --state "${STATE_STORE}"

kops validate cluster "${CLUSTER_NAME}" \
  --state "${STATE_STORE}" \
  --api-server "https://known-valid-api-hostname" \
  --wait 2m
```

Pass `--api-server` a full URL that routes to the correct API. When kOps generates the client configuration, it keeps the cluster’s internal API name as the TLS server name even if the override URL uses another hostname or a raw IP. A raw-IP override can therefore be useful for diagnosis, but it is not a DNS repair and must not become the permanent endpoint.

If control-plane instances never bootstrapped, inspect `kops-configuration.service`, API server, etcd, and dns-controller logs as directed by the kOps troubleshooting guide. If a load balancer exists, check its target health and security groups. Repairing Route 53 alone cannot make an unhealthy API serve requests.

## Fix in Dependency Order

Use this order to avoid chasing secondary errors:

1. Confirm the exact state store and cluster object.
2. Determine the intended API exposure and hostname.
3. Confirm the operator is on a network allowed to resolve and route to it.
4. Repair public delegation or private-zone association.
5. Confirm the API record targets the current load balancer or control-plane addresses.
6. Confirm API targets are healthy and TCP 443 is reachable.
7. Confirm TLS trust and hostname identity.
8. Only then diagnose authentication and cluster validation results.

Do not use `insecure-skip-tls-verify`, `/etc/hosts`, or a permanent raw-IP override as the production fix. Those workarounds bypass the identity and lifecycle controls kOps is expected to manage.

The recovery is complete when the intended DNS view returns the intended endpoint, the endpoint presents the expected certificate, and `kops validate cluster` can reach the same API server as the reviewed kubeconfig.

## Official Documentation

- [kOps CLI: `kops validate cluster`](https://kops.sigs.k8s.io/cli/kops_validate_cluster/)
- [kOps: Getting Started on AWS-Testing DNS](https://kops.sigs.k8s.io/getting_started/aws/#testing-your-dns-setup)
- [kOps: Cluster Resource API Exposure](https://kops.sigs.k8s.io/cluster_spec/#api)
- [kOps: Gossip DNS](https://kops.sigs.k8s.io/gossip/)
- [kOps 1.36 Release Notes](https://kops.sigs.k8s.io/releases/1.36-notes/)
- [kOps: Troubleshooting](https://kops.sigs.k8s.io/operations/troubleshoot/)
- [Amazon Route 53: Routing Traffic for Subdomains](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/dns-routing-traffic-for-subdomains.html)
- [Amazon Route 53: Checking DNS Responses](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/dns-test.html)
