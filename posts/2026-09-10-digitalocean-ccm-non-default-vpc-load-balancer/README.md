# How to Fix DigitalOcean CCM Load Balancers in a Nondefault VPC

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, DigitalOcean, Load Balancing, Networking, Troubleshooting

Description: Configure the self-managed DigitalOcean CCM with the correct cluster VPC UUID and verify new load balancers use compatible regional backend networks.

---

A self-managed Kubernetes cluster can run on Droplets in a nondefault DigitalOcean VPC while its cloud controller submits load balancer creation requests without that VPC selected. The resulting resource may use an unintended network or fail when the controller adds cluster nodes as targets.

The fix belongs in the cloud controller's cluster configuration. In DigitalOcean CCM v0.1.69, `DO_CLUSTER_VPC_ID` supplies the VPC UUID used by load balancer creation. It is not an arbitrary Service annotation that each application must invent.

## Identify whether you own the controller

First distinguish a self-managed cluster from DigitalOcean Kubernetes (DOKS). DOKS manages its control-plane cloud integration. Do not install a second CCM or change hidden provider configuration to work around a managed-service VPC mismatch; collect the cluster, load balancer, and event evidence for DigitalOcean support.

For a self-managed cluster, discover the installed CCM workload and image:

```bash
kubectl -n kube-system get deployments,daemonsets,pods
kubectl -n kube-system get deployment DO_CCM_NAME \
  -o jsonpath='{.spec.template.spec.containers[*].image}{"\n"}'
kubectl -n production describe service web
```

Use the actual Deployment name, or inspect a DaemonSet if that is how the controller is deployed. Note the exact cloud API error and whether a load balancer UUID already exists.

## Compare the three network identities

Inspect the cluster nodes' provider IDs, their Droplets, and the load balancer:

```bash
kubectl get nodes \
  -o custom-columns=NAME:.metadata.name,PROVIDER:.spec.providerID

doctl compute droplet get DROPLET_ID --output json
doctl vpcs list
doctl vpcs get EXPECTED_VPC_UUID
doctl compute load-balancer get LOAD_BALANCER_ID --output json
```

Match the numeric Droplet ID from the Node's DigitalOcean provider ID. Check the VPC UUID and region for every intended target, not just the first node. Workers created from different provisioning templates can accidentally end up in different networks.

Record the expected VPC, the nodes' actual VPCs, and the load balancer's actual VPC. A mismatch in the nodes themselves must be repaired in node provisioning. Setting the controller environment variable cannot move existing Droplets between VPCs.

Also verify that the load balancer and targets have compatible regional placement. Sharing an account is not sufficient for private backend connectivity.

## Configure the UUID in the controller

The [v0.1.69 cloud initialization source](https://github.com/digitalocean/digitalocean-cloud-controller-manager/blob/v0.1.69/cloud-controller-manager/do/cloud.go) reads `DO_CLUSTER_VPC_ID` into its cluster resources configuration. The [load balancer creation code](https://github.com/digitalocean/digitalocean-cloud-controller-manager/blob/v0.1.69/cloud-controller-manager/do/loadbalancers.go) then assigns that value to the API request's `VPCUUID`.

Add this fragment to the existing controller container environment:

```yaml
env:
  - name: DO_CLUSTER_VPC_ID
    value: "EXPECTED_VPC_UUID"
```

Replace the placeholder with the real UUID, not the VPC display name or CIDR. Keep the existing API token, cluster identity, and other environment entries. Make the edit in the Helm values or manifests that own the controller so the next deployment preserves it.

For a Deployment-based installation, a direct diagnostic change can be applied as follows, then incorporated into the source of truth:

```bash
kubectl -n kube-system set env deployment/DO_CCM_NAME \
  DO_CLUSTER_VPC_ID=EXPECTED_VPC_UUID
kubectl -n kube-system rollout status deployment/DO_CCM_NAME
```

Because the pod template changes, replacement pods read the corrected value at startup. Inspect the specific environment entry on the new pod without dumping all environment variables, which may include credentials.

## Do not mistake subnet selection for VPC selection

Recent CCM versions also document `service.beta.kubernetes.io/do-loadbalancer-subnet-uuid`. In the [v0.1.69 annotation reference](https://github.com/digitalocean/digitalocean-cloud-controller-manager/blob/v0.1.69/docs/controllers/services/annotations.md), that subnet must belong to the configured cluster VPC, and the feature is described as private preview.

It is not a substitute for `DO_CLUSTER_VPC_ID`, and availability should be confirmed with DigitalOcean before depending on it. Likewise, setting a Service to use an internal load balancer changes exposure behavior, not the fundamental requirement that the correct VPC be selected.

## Validate creation and handle existing resources

After the controller restarts, create or reconcile an approved canary Service with known healthy pods. Inspect Service events, the assigned load balancer UUID, and the API response:

```bash
kubectl -n diagnostics describe service network-canary
kubectl -n diagnostics get service network-canary -o wide
doctl compute load-balancer get CANARY_LOAD_BALANCER_ID --output json
```

The new resource should show the intended VPC UUID, compatible targets, healthy backend checks, and working application traffic. This proves the creation path is using the new configuration.

Do not assume an existing load balancer in the wrong VPC is moved by changing the environment variable. Its network identity is a cloud resource property, and controller reconciliation is not a general VPC migration mechanism. Plan replacement or a provider-supported recovery path, including any public IP and DNS changes, after confirming what already exists.

If no load balancer is created, inspect authentication, region, quota, and API errors separately. A correct VPC UUID cannot compensate for missing permissions or unavailable capacity.

## Conclusion

For a self-managed DigitalOcean CCM, set `DO_CLUSTER_VPC_ID` to the cluster nodes' actual VPC and verify the value reaches new load balancer requests. Treat already misplaced resources and managed DOKS control-plane issues as separate recovery cases.

## Official Documentation

- [DigitalOcean CCM cluster VPC initialization](https://github.com/digitalocean/digitalocean-cloud-controller-manager/blob/v0.1.69/cloud-controller-manager/do/cloud.go)
- [DigitalOcean load balancer request construction](https://github.com/digitalocean/digitalocean-cloud-controller-manager/blob/v0.1.69/cloud-controller-manager/do/loadbalancers.go)
- [DigitalOcean CCM Service annotations](https://github.com/digitalocean/digitalocean-cloud-controller-manager/blob/v0.1.69/docs/controllers/services/annotations.md)
