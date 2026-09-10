# How to Rotate Hetzner CCM Credentials and Verify the New Token

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Hetzner, Security, Cloud, Troubleshooting

Description: Rotate the Hetzner cloud controller API token through a new Kubernetes Secret, replace controller pods, and verify cloud reconciliation before revoking the old token.

---

Updating a Kubernetes Secret does not prove a running Hetzner Cloud Controller Manager has started using the new API token. When the token is supplied through an environment variable, existing containers retain the value they received at startup. The controller also initializes its API client from configuration, so credential rotation needs an explicit process restart and a real cloud operation to verify it.

Use an overlap period: create the new token, deploy it, verify controller activity, and only then revoke the old token. This makes the rollback path straightforward while the change is still being tested.

## Identify the installed credential reference

Discover the controller Deployment and inspect how it receives `HCLOUD_TOKEN`:

```bash
kubectl -n kube-system get deployments,pods
kubectl -n kube-system get deployment hcloud-cloud-controller-manager \
  -o json | jq '.spec.template.spec.containers[] |
    {name: .name,
     tokenReference: [.env[]? |
       select(.name == "HCLOUD_TOKEN" or .name == "HCLOUD_TOKEN_FILE") |
       {name: .name, valueFrom: .valueFrom}]}'
```

Use the actual release name. This query shows references without printing a token stored directly in an environment value. The upstream chart commonly references a Secret key named `token`, but your deployment may use an external secrets operator or a file-mounted credential instead.

Inspect the authoritative Helm values or manifests as well. Changing the live Secret while an external controller is configured to restore the old value produces a rotation that lasts only until its next reconciliation.

The [HCCM v1.36.0 configuration source](https://github.com/hetznercloud/hcloud-cloud-controller-manager/blob/v1.36.0/internal/config/config.go) reads token configuration when initializing the process. Do not infer hot reload merely because a projected Secret file eventually changes on disk.

## Create a token in the correct project

Generate a new Hetzner Cloud API token in the same project as the nodes, networks, and load balancers managed by this controller. Follow the [Hetzner token creation guide](https://docs.hetzner.com/cloud/api/getting-started/generating-api-token/) and select the access needed for the controller's resource management.

A read-only token can succeed at listing servers while failing on load balancer or route reconciliation. Therefore a successful manual list call is useful evidence but does not complete validation.

Keep the old token active temporarily. Store the new token through your secret manager, or place it in a local protected file for the following Kubernetes operation. Avoid command-line literals that expose the token through shell history or process arguments.

## Use a versioned Secret for a reviewable switch

A separate Secret makes it clear which credential reference the new pods use and avoids accidentally replacing other keys in an existing `hcloud` Secret, such as a network identifier.

```bash
kubectl -n kube-system create secret generic hcloud-token-20260910 \
  --from-file=token=./hetzner-new-token.txt
```

The file should contain only the token value, without an accidental trailing newline. Remove the local copy through your normal secret-handling process after the managed secret store has the authoritative value.

Update the controller's existing pod template or Helm values to reference the new Secret:

```yaml
env:
  - name: HCLOUD_TOKEN
    valueFrom:
      secretKeyRef:
        name: hcloud-token-20260910
        key: token
```

Merge this entry into the existing environment configuration. Keep `HCLOUD_NETWORK` and unrelated settings intact. Apply the change through the deployment system that owns the controller.

A pod-template change normally triggers replacement pods. If the installation instead updates the contents of the existing Secret, restart the Deployment explicitly after updating it:

```bash
kubectl -n kube-system rollout restart deployment/hcloud-cloud-controller-manager
kubectl -n kube-system rollout status deployment/hcloud-cloud-controller-manager
```

The [Kubernetes Secrets documentation](https://kubernetes.io/docs/concepts/configuration/secret/) explains the distinction between environment-based consumption and projected files. Neither a new Secret resource version nor a green Deployment alone establishes successful cloud authentication.

## Verify all replicas and the active controller

List the new pods, confirm their creation times and Secret references, and inspect recent logs:

```bash
kubectl -n kube-system get pods -o wide
kubectl -n kube-system logs deployment/hcloud-cloud-controller-manager --since=10m
```

Check every controller replica that could become leader, not only the current leader. An old replica retaining the old token can appear harmless until failover occurs after the token is revoked.

Perform a small approved reconciliation that requires cloud API access. A dedicated canary LoadBalancer Service is useful because you can verify creation, target updates, and cleanup without modifying production listeners. Use your existing diagnostic application and standard location/network annotations; creating the canary allocates a real cloud resource, so include its cleanup in the check.

Inspect the Service events, confirm the load balancer exists in the correct project, and test its backend health. Then delete the canary Service and verify normal controller cleanup. This exercises write and deletion permissions that a server-list call does not test.

## Revoke the old token and check again

After all pods use the new Secret reference and reconciliation succeeds, revoke the old token in Hetzner. Observe another controller reconciliation and inspect logs for authentication or authorization errors. Retain the versioned Secret name and rotation time in the deployment record, not the token itself.

If verification fails before revocation, restore the prior Secret reference and replace the pods. Diagnose the new token's project, permissions, formatting, and source-of-truth configuration before retrying.

## Conclusion

Hetzner CCM credential rotation is complete when replacement controller pods use the new credential and can manage cloud resources after the old token is revoked. Verify the process lifecycle and actual reconciliation, rather than relying on a Secret update alone.

## Official Documentation

- [Hetzner Cloud API token creation](https://docs.hetzner.com/cloud/api/getting-started/generating-api-token/)
- [HCCM configuration initialization](https://github.com/hetznercloud/hcloud-cloud-controller-manager/blob/v1.36.0/internal/config/config.go)
- [Kubernetes Secret consumption](https://kubernetes.io/docs/concepts/configuration/secret/)
