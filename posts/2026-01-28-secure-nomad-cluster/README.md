# How to Secure Nomad Cluster

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Nomad, Security, TLS, ACLs, DevOps

Description: Learn how to secure a Nomad cluster with TLS, ACLs, and secure gossip, plus hardening tips for production deployments.

---

Nomad is simple to operate, but it must be secured before production use. This guide covers TLS encryption, ACLs, and core hardening steps.

## Step 1: Enable TLS for HTTP and RPC

Configure TLS on servers and clients so all traffic is encrypted.

```hcl
tls {
  http = true
  rpc  = true

  ca_file   = "/etc/nomad/tls/ca.pem"
  cert_file = "/etc/nomad/tls/server.pem"
  key_file  = "/etc/nomad/tls/server-key.pem"

  verify_server_hostname = true
  verify_https_client    = true
}
```

Use a proper CA and rotate certificates regularly.

## Step 2: Enable ACLs

ACLs control who can read or modify jobs and cluster resources.

```hcl
acl {
  enabled = true
  default_policy = "deny"
  enable_token_persistence = true
}
```

Bootstrap the ACL system:

```bash
nomad acl bootstrap
```

Store the management token securely and use policy-scoped tokens for CI and users.

## Step 3: Secure Gossip with Serf Encryption

Nomad uses Serf for cluster membership. Encrypt the gossip layer:

```hcl
encrypt = "<32-byte-base64-key>"
```

You can generate a key with:

```bash
nomad operator keygen
```

## Step 4: Restrict Network Access

- Expose the UI and API only on internal networks.
- Use firewalls or security groups to limit access to ports 4646, 4647, and 4648.
- Avoid public exposure of Nomad clients.

## Step 5: Use mTLS Between Services (Optional)

For service-to-service communication, use Consul Connect or your service mesh. This adds identity and encryption at the workload level.

## Best Practices

- Rotate ACL tokens and TLS certs on a schedule.
- Use separate tokens per automation tool.
- Audit job submissions and changes.
- Keep Nomad and Consul up to date.

## Conclusion

Securing Nomad is straightforward once you enable TLS, ACLs, and gossip encryption. Combine those with network controls and regular rotation to keep your cluster safe and compliant.
