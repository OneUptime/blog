# How to Run kube-hunter Against Private EKS, AKS, or GKE Endpoints from CI

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Kubernetes Security, EKS, AKS, GKE, CI/CD

Description: Place ephemeral CI runners on provider-supported private network paths to scan EKS, AKS, or GKE without opening control-plane or node endpoints publicly.

---

A CI runner with only a public-internet path cannot reach a private cluster endpoint. Some CI platforms offer deliberate private-network connectivity, but the safe solution is not to temporarily publish the endpoint. Run an ephemeral self-hosted runner or supported private-network runner inside an approved VPC/VNet or connected network, give it private DNS and routes, and restrict its egress to the authorized cluster targets.

Also decide what “against the cluster” means. kube-hunter's remote mode can target API endpoints, node addresses, or a CIDR. Reaching a private Kubernetes API does not automatically make private kubelet or etcd endpoints reachable. Each target type needs its own route and firewall approval.

## Common CI Architecture

Use a short-lived runner image in a dedicated security subnet with:

- no public inbound access;
- workload identity or a short-lived cloud identity for artifact and registry access;
- private DNS for the cluster endpoint;
- routes through the same VPC/VNet, peering, VPN, or dedicated connectivity;
- egress allowlists for explicit cluster targets and required control services;
- a digest-pinned kube-hunter image mirrored into a trusted private registry;
- automatic destruction and log retention after the job.

Remote passive scanning does not require a Kubernetes admin credential. Do not fetch a cluster-admin kubeconfig unless a separate authenticated test needs it. Network reachability and API authorization are distinct.

## Amazon EKS

AWS documents that when EKS public endpoint access is disabled, the Kubernetes API endpoint accepts requests only from the cluster VPC or a connected network. Put the runner in that VPC, or provide deliberate connectivity with peering, Transit Gateway, VPN, or Direct Connect. Ensure VPC DNS support and the relevant security group rules permit the private endpoint.

Do not confuse an EKS interface VPC endpoint with the cluster's Kubernetes API endpoint. AWS explicitly says the EKS PrivateLink interface endpoint serves EKS management API actions, not Kubernetes API access; the cluster private endpoint is separate.

Inspect without changing configuration:

~~~bash
aws eks describe-cluster \
  --name "$CLUSTER" \
  --region "$REGION" \
  --query 'cluster.{endpoint:endpoint,access:resourcesVpcConfig}'
~~~

Run DNS and route checks from the job container itself, because the host and nested container can differ.

## Azure Kubernetes Service

AKS private clusters expose the API server through Azure Private Link and private DNS. Microsoft documents that management requires a VM or container with VNet access; private DNS must also resolve from that network. In hub-and-spoke designs, link the private DNS zone to the runner VNet or configure the documented conditional forwarding path.

Microsoft also states that Azure DevOps Microsoft-hosted agents are not supported for private AKS access; use a self-hosted agent with network connectivity. GitHub-hosted or other public runners have the same fundamental reachability issue unless a supported private-network feature is intentionally configured.

Do not delete or replace the AKS-managed private endpoint. Use supported VNet peering, Private Endpoint connectivity, VPN, ExpressRoute, Bastion/VM, or AKS command-invoke patterns according to the security model. For a scanner that must reach node services as an attacker vantage point, a VNet runner is clearer than tunneling only Kubernetes API commands.

## Google Kubernetes Engine

GKE can expose DNS-based and IP-based control-plane endpoints. Current Google guidance recommends the DNS-based endpoint and supports IAM-based reachability controls; private clients may reach Google APIs through Private Google Access, Cloud NAT, or Private Service Connect depending on design. For a private IP endpoint, place the runner on an allowed VPC path and configure authorized networks where used.

Inspect the cluster configuration through the supported CLI:

~~~bash
gcloud container clusters describe "$CLUSTER" \
  --location "$LOCATION" \
  --format='yaml(endpoint,privateClusterConfig,controlPlaneEndpointsConfig,masterAuthorizedNetworksConfig)'
~~~

Fields vary by cluster generation and CLI release, so treat the output as inventory rather than scripting against every field blindly. Private nodes, private control-plane IP access, and DNS endpoint access are separate settings.

## Run the Scan Reproducibly

After provider-specific DNS and routing checks, use explicit approved targets:

~~~bash
IMAGE='aquasec/kube-hunter@sha256:<approved-digest>'
TARGET='api.example.invalid'

docker run --rm \
  --read-only \
  --cap-drop ALL \
  "$IMAGE" \
  --remote "$TARGET" \
  --report json \
  --log WARNING \
  > kube-hunter.json
~~~

Do not publish container ports or use `--active`. If the runner must scan node addresses, enumerate them from approved inventory and pass exact hosts; do not widen to an entire shared VPC CIDR. Enforce the same allowlist in security groups or firewall rules.

Separate scanner failure from findings. Validate the JSON shape and archive it even when a policy gate fails. Store the provider, cluster ID, region, target kind, runner subnet, observed source address, DNS answers, image digest, and exact command alongside the report.

## Troubleshoot in Order

Resolve the endpoint, inspect returned addresses, check the route, test TCP/TLS, and only then run kube-hunter. A private DNS answer on a public runner often produces a timeout; a public answer may indicate the wrong endpoint mode. A TLS success followed by `401` or `403` means networking works and authentication/authorization is the next layer.

Never “fix” a timeout by enabling the public endpoint for `0.0.0.0/0`. Move the runner or repair the private path. If a temporary public exception is unavoidable under policy, restrict it to the runner's stable egress address, set automatic expiry, monitor it, and recognize that it changes the vantage point being measured.

## Conclusion

Private-cluster scanning from CI is solved by runner placement, DNS, and routing. Use an ephemeral self-hosted runner on the provider-supported private path, keep targets explicit, separate management APIs from Kubernetes endpoints, and remain passive. That preserves the private boundary while producing reproducible attacker-view evidence.

## Official References

- [Amazon EKS cluster endpoint access](https://docs.aws.amazon.com/eks/latest/userguide/config-cluster-endpoint.html)
- [Amazon EKS PrivateLink considerations](https://docs.aws.amazon.com/eks/latest/userguide/vpc-interface-endpoints.html)
- [Create a private AKS cluster](https://learn.microsoft.com/en-us/azure/aks/private-clusters)
- [Connect to a private AKS cluster](https://learn.microsoft.com/en-us/azure/aks/private-cluster-connect)
- [GKE network isolation](https://cloud.google.com/kubernetes-engine/docs/how-to/latest/network-isolation)
- [kube-hunter remote scanning documentation](https://github.com/aquasecurity/kube-hunter/blob/main/docs/index.md)
