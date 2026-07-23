# ACR ImagePullBackOff in AKS: A Systematic Troubleshooting Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, AKS, Azure Container Registry, Kubernetes, Troubleshooting

Description: Trace an AKS ACR image-pull failure through the pod event, kubelet identity, registry authorization, image manifest, DNS, and layer endpoint.

---

`ImagePullBackOff` is Kubernetes retry behavior, not the root cause. The useful evidence is the earlier `ErrImagePull` event: it normally identifies an authorization error, missing image, platform mismatch, blocked endpoint, or throttling response. Start with that message, then follow the pull in the order AKS performs it.

## Capture the Pod Event First

Set the workload coordinates and inspect the pod before recreating it:

```bash
NAMESPACE=orders
POD_NAME='<failing-pod-name>'

kubectl describe pod "$POD_NAME" --namespace "$NAMESPACE"
kubectl get events --namespace "$NAMESPACE" \
  --field-selector involvedObject.name="$POD_NAME" \
  --sort-by='.lastTimestamp'
```

Record:

- the complete image reference;
- the node name and node pool;
- every `Failed to pull image` and `Back-off pulling image` message;
- whether an `imagePullSecrets` name is present; and
- the first failure timestamp.

Use the event signature to choose the branch:

| Event fragment | Investigate first |
| --- | --- |
| `failed to fetch oauth token`, `401 Unauthorized`, `no basic auth credentials` | kubelet identity, role, or pull secret |
| repository, tag, or manifest `not found` | exact image reference and replication state |
| `no match for platform in manifest`, `exec format error` | node and image architecture |
| `403 Forbidden` | ACR firewall, public access, or private DNS |
| `dial tcp ...:443: i/o timeout` | private endpoint path, peering, route, NSG, or firewall |
| layer download timeout after manifest resolution | ACR data endpoint path |
| `pull QPS exceeded` | kubelet pull rate or rollout fan-out |

## Understand the Three Pull Stages

An AKS pull crosses three distinct stages:

1. **Authentication and authorization.** Kubelet obtains a token for its managed identity, cluster service principal, or image pull secret and requests repository pull access.
2. **Registry endpoint.** The node resolves and reaches the ACR login endpoint, normally `<registry-login-server>/v2/`, to read the manifest.
3. **Data endpoint.** The node downloads layers from Azure Storage or, when enabled, the registry's dedicated regional data endpoint.

A successful manifest request does not prove that layer downloads are reachable. Conversely, an unauthenticated request to `/v2/` that returns HTTP 401 proves the login endpoint responded; 401 is expected when no credential was sent.

## Run the Supported End-to-End Checks

Check ACR from the operator environment:

```bash
ACR_NAME=contosoplatformacr

az acr check-health \
  --name "$ACR_NAME" \
  --ignore-errors \
  --yes
```

Then ask AKS to test its path to the exact ACR login server:

```bash
AKS_RESOURCE_GROUP=rg-platform-aks
AKS_NAME=aks-production

ACR_LOGIN_SERVER=$(az acr show \
  --name "$ACR_NAME" \
  --query loginServer --output tsv)

az aks check-acr \
  --resource-group "$AKS_RESOURCE_GROUP" \
  --name "$AKS_NAME" \
  --acr "$ACR_LOGIN_SERVER"
```

`az aks check-acr` is more useful than a successful laptop pull because it tests from the cluster context. Keep its full output. A platform mismatch can surface there as an `exec format error`, which is not fixed by changing ACR roles.

## Confirm the Exact Image Exists

Extract the reference Kubernetes is using:

```bash
kubectl get pod "$POD_NAME" --namespace "$NAMESPACE" \
  -o jsonpath='{range .spec.containers[*]}{.name}{"\t"}{.image}{"\n"}{end}'
```

Check the repository and tag with an authorized operator identity:

```bash
az acr repository show-tags \
  --name "$ACR_NAME" \
  --repository orders/api \
  --orderby time_desc \
  --output table

az acr manifest list-metadata \
  --registry "$ACR_NAME" \
  --name orders/api \
  --output table
```

The `az acr manifest` command group is currently Preview. Keep the Azure CLI current and use `az acr repository show-tags` as the stable first check if a preview command is unavailable in your environment.

Common mistakes include:

- using the Azure resource name instead of the actual DNL-protected `loginServer`;
- omitting a repository namespace such as `orders/`;
- deploying a tag before the pipeline pushed its manifest;
- relying on `latest` when it was never published; and
- referencing the global endpoint differently from the hostname authorized or resolved in the cluster.

Prefer immutable version tags or manifest digests in deployments. A digest removes tag movement as a variable during an incident.

## Check Image and Node Architecture

Find the scheduled node's architecture:

```bash
NODE_NAME=$(kubectl get pod "$POD_NAME" --namespace "$NAMESPACE" \
  -o jsonpath='{.spec.nodeName}')

kubectl get node "$NODE_NAME" \
  -o jsonpath='{.metadata.name}{"\t"}{.status.nodeInfo.architecture}{"\n"}'
```

Inspect the published image index or manifest from a trusted builder:

```bash
docker buildx imagetools inspect \
  "$ACR_LOGIN_SERVER/orders/api:2026.07.23.1"
```

An ARM64-only image cannot run on an AMD64 node, and the reverse is also true. Publish a multi-platform image or schedule the workload onto a matching node pool. Do not grant broader ACR access to solve `no match for platform in manifest`.

## Identify the Identity That Actually Pulls

For a managed-identity AKS cluster, the kubelet identity associated with the agent pools pulls application images. The control-plane identity and the human who deployed the manifest are not the pull identity.

Inspect it:

```bash
az aks show \
  --resource-group "$AKS_RESOURCE_GROUP" \
  --name "$AKS_NAME" \
  --query identityProfile.kubeletidentity \
  --output json
```

Capture the kubelet object ID:

```bash
KUBELET_OBJECT_ID=$(az aks show \
  --resource-group "$AKS_RESOURCE_GROUP" \
  --name "$AKS_NAME" \
  --query identityProfile.kubeletidentity.objectId \
  --output tsv)

ACR_ID=$(az acr show --name "$ACR_NAME" --query id --output tsv)
```

List its assignments at the registry:

```bash
az role assignment list \
  --assignee-object-id "$KUBELET_OBJECT_ID" \
  --scope "$ACR_ID" \
  --include-inherited \
  --all \
  --output table
```

If `identityProfile.kubeletidentity` is empty, inspect `servicePrincipalProfile.clientId`; older clusters can use the cluster service principal. Do not assume an identity type from the cluster's age-query it.

## Use the Correct Role for the Registry Mode

Check the registry's role-assignment mode:

```bash
az acr show \
  --name "$ACR_NAME" \
  --query roleAssignmentMode \
  --output tsv
```

`AbacRepositoryPermissions` identifies ABAC-enabled mode; `LegacyRegistryPermissions` identifies legacy RBAC mode. The shorter `rbac-abac` and `rbac` values are accepted by create/update commands but are not returned here.

### Legacy RBAC registry

For a registry in `RBAC Registry Permissions` mode, AKS integration assigns `AcrPull` to the kubelet identity. Attach it by resource ID:

```bash
az aks update \
  --resource-group "$AKS_RESOURCE_GROUP" \
  --name "$AKS_NAME" \
  --attach-acr "$ACR_ID"
```

### ABAC-enabled registry

`az aks update --attach-acr` is not supported for a registry in `RBAC Registry + ABAC Repository Permissions` mode because that integration attempts the legacy role. Assign `Container Registry Repository Reader` manually:

```bash
az role assignment create \
  --assignee-object-id "$KUBELET_OBJECT_ID" \
  --assignee-principal-type ServicePrincipal \
  --role 'Container Registry Repository Reader' \
  --scope "$ACR_ID"
```

Without an ABAC condition, this allows pulls from every repository in the registry. For stronger isolation, add a repository-name condition for `orders/api` or a carefully terminated prefix such as `orders/`.

Legacy `AcrPull` is not honored in ABAC-enabled mode. `Owner` and `Contributor` also do not provide repository data access there. After correcting an assignment, wait for Azure RBAC propagation and let kubelet obtain a fresh token before judging the result.

## Inspect `imagePullSecrets` Only When They Are Part of the Design

AKS-to-ACR managed identity integration normally does not need a Kubernetes Docker-registry secret. Pull secrets remain appropriate for external registries and some explicitly designed tenant scenarios.

Check whether the pod or service account references one:

```bash
kubectl get pod "$POD_NAME" --namespace "$NAMESPACE" \
  -o jsonpath='{.spec.imagePullSecrets}{"\n"}'

SERVICE_ACCOUNT=$(kubectl get pod "$POD_NAME" --namespace "$NAMESPACE" \
  -o jsonpath='{.spec.serviceAccountName}')

kubectl get serviceaccount "$SERVICE_ACCOUNT" --namespace "$NAMESPACE" \
  -o jsonpath='{.imagePullSecrets}{"\n"}'
```

The secret must exist in the same namespace as the pod. If it contains a service principal, verify its client ID, secret value, expiry, registry hostname, and repository role. Recreate it through the approved secret workflow rather than printing `.dockerconfigjson` into CI logs.

Do not add an admin-user pull secret on top of a broken managed-identity integration. That creates a long-lived, registry-wide credential in the cluster and makes the eventual cleanup easy to miss.

## Trace Private Endpoint and Firewall Failures

For a private ACR, the AKS node network must resolve the registry's public name through the `privatelink.azurecr.io` private zone to its private IP. Link that zone to the AKS virtual network, or make the equivalent records available through the organization's DNS forwarders.

From a network that shares the node DNS path, check both endpoint classes:

```bash
nslookup "$ACR_LOGIN_SERVER"
az acr show-endpoints --name "$ACR_NAME" --output table
```

When a private endpoint exists, ACR automatically has dedicated regional data endpoints. The private DNS configuration needs the registry record and each required `<registry>.<region>.data.azurecr.io` record. Geo-replicated registries need data endpoint records for their replicas as well.

`az acr show-endpoints` is GA but was added to the core CLI in Azure CLI 2.86.0. Upgrade the CLI if an older operator image does not recognize it.

Interpret network symptoms carefully:

- A `403` can mean the node egress public IP is not on an ACR allowlist or public access is disabled.
- An `i/o timeout` to a private IP points to peering, routing, NSG, firewall, or private endpoint approval.
- Manifest resolution followed by a layer timeout points to the data endpoint path.
- A private DNS zone linked to the wrong virtual network can work from an operator VM while failing from AKS.

Do not add the cluster service IP. If public access is intentionally selected, allow the actual stable outbound IP used by AKS and verify it against the cluster's outbound design. Private Link is preferable when the registry must not be publicly reachable.

## Account for Pull Rate and Rollout Shape

If events say `pull QPS exceeded`, the failure is local pull-rate behavior, not an identity issue. Large rollouts can also reach ACR request limits and receive HTTP 429.

Reduce avoidable fan-out:

- use rolling update limits appropriate for the node count;
- avoid restarting every workload simultaneously;
- keep images small and layer reuse high;
- place the registry near the cluster or use Premium geo-replication for multi-region deployments; and
- monitor both kubelet events and ACR metrics before changing a limit.

Retries should honor backoff. Repeatedly deleting every failing pod can amplify registry authentication and manifest traffic.

## Verify the Repair

Kubelet will retry automatically. To create a controlled new attempt for a Deployment after the fix:

```bash
kubectl rollout restart deployment/orders-api --namespace "$NAMESPACE"
kubectl rollout status deployment/orders-api --namespace "$NAMESPACE" --timeout=5m

kubectl get pods --namespace "$NAMESPACE" -o wide
kubectl get events --namespace "$NAMESPACE" --sort-by='.lastTimestamp' | tail -n 30
```

Test more than one node pool if their architectures or network paths differ. Then verify the negative boundary: the kubelet identity should pull its authorized image, should not push, and-when an ABAC condition is used-should not pull unrelated repositories.

## Official Documentation

- [Troubleshoot image pull failures from ACR to AKS](https://learn.microsoft.com/en-us/troubleshoot/azure/azure-kubernetes/connectivity/cannot-pull-image-from-acr-to-aks-cluster)
- [Integrate Azure Container Registry with AKS](https://learn.microsoft.com/en-us/azure/aks/cluster-container-registry-integration)
- [Authentication options for Kubernetes with ACR](https://learn.microsoft.com/en-us/azure/container-registry/authenticate-kubernetes-options)
- [Microsoft Entra ABAC repository permissions in ACR](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-rbac-abac-repository-permissions)
- [Connect privately to ACR with Azure Private Link](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-private-endpoints)
- [Check the health of an Azure Container Registry](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-check-health)
