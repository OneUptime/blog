# How to Harden Rancher for Production

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Security

Description: Learn how to apply security hardening best practices to your Rancher deployment for production environments.

Running Rancher in production requires more than a default installation. Security hardening reduces your attack surface and protects your Kubernetes infrastructure from common threats. This guide covers the essential hardening steps for a production Rancher deployment.

## Prerequisites

- A currently supported Rancher release
- kubectl and Helm 3 access
- Admin privileges on the Rancher management cluster
- A valid TLS certificate for the Rancher hostname

## Step 1: Use a Hardened Kubernetes Distribution

Deploy Rancher on a hardened Kubernetes distribution such as RKE2, which is designed for security-focused environments. RKE2 is hardened by default, and the `cis` profile enables the controls needed for the applicable CIS benchmark on supported RKE2 releases.

Install RKE2 with the current CIS hardening profile:

```bash
curl -sfL https://get.rke2.io | INSTALL_RKE2_TYPE=server sh -

mkdir -p /etc/rancher/rke2

cat > /etc/rancher/rke2/config.yaml << 'EOF'
profile: cis
selinux: true
secrets-encryption: true
EOF

systemctl enable rke2-server
systemctl start rke2-server
```

## Step 2: Configure TLS with a Trusted Certificate

Never use self-signed certificates in production. Add the stable Rancher Helm repository first:

```bash
helm repo add rancher-stable https://releases.rancher.com/server-charts/stable
helm repo update
```

Then use a certificate from a trusted CA or Let's Encrypt. If you use Let's Encrypt, cert-manager must already be installed and port 80 must be reachable for the HTTP-01 challenge:

```bash
helm install rancher rancher-stable/rancher \
  -n cattle-system \
  --create-namespace \
  --set hostname=rancher.yourdomain.com \
  --set ingress.tls.source=letsEncrypt \
  --set letsEncrypt.email=admin@yourdomain.com \
  --set letsEncrypt.ingress.class=nginx \
  --set replicas=3
```

For a custom certificate:

```bash
kubectl create secret tls tls-rancher-ingress \
  -n cattle-system \
  --cert=tls.crt \
  --key=tls.key

helm install rancher rancher-stable/rancher \
  -n cattle-system \
  --create-namespace \
  --set hostname=rancher.yourdomain.com \
  --set ingress.tls.source=secret \
  --set replicas=3
```

If the certificate is signed by a private CA, also create the `tls-ca` secret and set `--set privateCA=true`.

## Step 3: Restrict Network Access

Limit who can reach the Rancher UI and API by using load balancer or firewall allowlists, and use NetworkPolicies to restrict in-cluster traffic to Rancher pods.

For example, if Rancher is exposed through the `ingress-nginx` controller, allow ingress to the Rancher pods only from that namespace:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: restrict-rancher-access
  namespace: cattle-system
spec:
  podSelector:
    matchLabels:
      app: rancher
  policyTypes:
  - Ingress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          kubernetes.io/metadata.name: ingress-nginx
    ports:
    - protocol: TCP
      port: 80
```

Adjust the namespace selector if you use a different ingress controller.

## Step 4: Enable Audit Logging

Enable Kubernetes API audit logging by placing an audit policy on the RKE2 server nodes and pointing the API server at it:

```yaml
# /etc/rancher/rke2/audit-policy.yaml
apiVersion: audit.k8s.io/v1
kind: Policy
metadata:
  name: rancher-audit-policy
rules:
- level: Metadata
  resources:
  - group: ""
    resources: ["secrets", "configmaps"]
- level: RequestResponse
  resources:
  - group: ""
    resources: ["pods", "services"]
- level: Request
  verbs: ["create", "update", "patch", "delete"]
  resources:
  - group: "management.cattle.io"
```

```yaml
# Add to /etc/rancher/rke2/config.yaml
audit-policy-file: /etc/rancher/rke2/audit-policy.yaml
```

```bash
systemctl restart rke2-server
```

Configure Rancher's built-in audit log:

```bash
helm upgrade rancher rancher-stable/rancher \
  -n cattle-system \
  --set auditLog.enabled=true \
  --set auditLog.level=2 \
  --set auditLog.destination=hostPath \
  --set auditLog.hostPath=/var/log/rancher/audit
```

## Step 5: Configure RBAC with Least Privilege

Avoid using the default admin account for daily operations. Create role-based access:

1. In Rancher, go to **Users & Authentication** > **Users**.
2. Create individual user accounts.
3. Go to **Cluster Management** and assign users to specific clusters or projects with appropriate roles:
   - **Cluster Owner**: Full control of a single cluster.
   - **Cluster Member**: View most cluster-level resources and create new projects.
   - **Read-Only**: View project resources without making changes.

After the first login, reset the local admin password and reserve local users for break-glass access only.

## Step 6: Enable External Authentication

Configure an external identity provider for day-to-day access instead of relying only on local accounts:

1. Go to **Users & Authentication** > **Auth Provider**.
2. Select your provider (LDAP, Active Directory, SAML, GitHub, Google OAuth, etc.).
3. Configure the connection details.
4. Test the configuration.
5. Enable the provider.

Keep a small number of local users for emergency access if your external provider is unavailable. Rancher does not provide a generic Helm setting for LDAP, AD, SAML, or OIDC configuration; configure the provider in the Rancher UI or Rancher API after installation.

## Step 7: Restrict the Rancher API

Limit API access using API keys with scoped permissions:

1. Go to **API & Keys** in the user menu.
2. Create API keys with specific scopes and expiration times.
3. Never use admin-level API keys in automation; use scoped keys instead.
4. In **Global Settings**, set `auth-token-max-ttl-minutes` to bound the maximum lifetime of API and kubeconfig tokens.

## Step 8: Secure etcd

RKE2 enables mutual TLS for embedded etcd by default. Keep etcd inaccessible from untrusted networks and do not expose ports `2379` or `2380` publicly. The embedded etcd configuration already enables `client-cert-auth=true` and `peer-client-cert-auth=true`.

Enable Kubernetes secret encryption at rest by keeping `secrets-encryption: true` in the RKE2 config shown earlier.

## Step 9: Run Security Scans

Use Rancher's compliance scanning feature:

1. Navigate to the cluster.
2. If Compliance is not installed yet, go to **Apps** > **Charts** and install **Compliance**.
3. Go to **Compliance** > **Scan**.
4. Create a scan and choose a profile.
5. Review and remediate findings.

## Step 10: Keep Rancher Updated

Stay current with security patches:

```bash
helm repo update
helm search repo rancher-stable/rancher --versions | head -5
```

Subscribe to Rancher security advisories and apply updates promptly.

## Security Hardening Checklist

- [ ] Use RKE2 or a hardened Kubernetes distribution
- [ ] Deploy with trusted TLS certificates
- [ ] Enable audit logging
- [ ] Configure RBAC with least privilege
- [ ] Use external authentication (LDAP/SAML)
- [ ] Restrict network access to Rancher
- [ ] Enable Kubernetes secret encryption at rest
- [ ] Run compliance scans
- [ ] Set API key expiration
- [ ] Keep Rancher and Kubernetes up to date
- [ ] Enable Pod Security Standards
- [ ] Configure backup encryption

## Conclusion

Hardening Rancher for production is an ongoing process that involves multiple layers of security. By following these steps, you significantly reduce the attack surface of your Rancher management server and the clusters it manages. Combine these hardening measures with regular security scanning and prompt patching to maintain a strong security posture.
