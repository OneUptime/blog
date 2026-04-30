# How to Configure Flux CD Source Controllers with IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Flux CD, GitOps, Kubernetes, Source Controller, HelmRepository

Description: Configure Flux CD source controllers (GitRepository, HelmRepository, OCIRepository) to pull from IPv6-addressed Git servers, Helm registries, and OCI repositories in dual-stack or IPv6-only...

## Introduction

Flux CD uses Source Controllers to synchronize configuration from Git repositories, Helm chart repositories, and OCI registries. When these sources are hosted on IPv6 networks, Flux Source Controllers must connect via IPv6. Configuration involves creating source objects with IPv6 URLs, configuring TLS trust for HTTPS endpoints, and ensuring Flux components have IPv6 connectivity in the cluster network.

## GitRepository with IPv6 HTTPS Endpoint

```yaml
# git-repo-ipv6.yaml

# Secret with Git credentials for IPv6 server

apiVersion: v1
kind: Secret
metadata:
  name: git-credentials
  namespace: flux-system
type: Opaque
stringData:
  username: git
  password: "your-access-token"

---
# GitRepository source pointing to IPv6 Git server
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: myapp
  namespace: flux-system
spec:
  interval: 5m
  # URL with IPv6 literal address
  url: "https://[2001:db8::10]:443/org/myapp.git"
  ref:
    branch: main
  secretRef:
    name: git-credentials
```

```bash
# Apply the source
kubectl apply -f git-repo-ipv6.yaml

# Watch the GitRepository reconcile
flux get sources git -n flux-system --watch

# Check for errors
kubectl describe gitrepository myapp -n flux-system | grep -A10 "Status:"
```

## GitRepository with SSH over IPv6

```yaml
# flux-ssh-source.yaml

apiVersion: v1
kind: Secret
metadata:
  name: git-ssh-key
  namespace: flux-system
type: Opaque
stringData:
  identity: |
    -----BEGIN OPENSSH PRIVATE KEY-----
    ...
    -----END OPENSSH PRIVATE KEY-----
  identity.pub: "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5..."
  known_hosts: |
    2001:db8::10 ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAA...

---
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: myapp-ssh
  namespace: flux-system
spec:
  interval: 5m
  url: "ssh://git@[2001:db8::10]/org/myapp.git"
  ref:
    branch: main
  secretRef:
    name: git-ssh-key
```

```bash
# Get the SSH host key from the IPv6 Git server
# (run from a machine that can reach the server)
ssh-keyscan -6 2001:db8::10

# Add the exact output to the known_hosts field in the secret above
```

## HelmRepository with IPv6 Endpoint

```yaml
# helm-repo-ipv6.yaml

apiVersion: v1
kind: Secret
metadata:
  name: helm-credentials
  namespace: flux-system
type: Opaque
stringData:
  username: helm-user
  password: "helm-password"

---
apiVersion: v1
kind: Secret
metadata:
  name: helm-tls
  namespace: flux-system
type: Opaque
stringData:
  # CA certificate for the IPv6 Helm repo
  ca.crt: |
    -----BEGIN CERTIFICATE-----
    ...
    -----END CERTIFICATE-----

---
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: internal-charts
  namespace: flux-system
spec:
  interval: 10m
  url: "https://[2001:db8::20]:443/charts"
  secretRef:
    name: helm-credentials
  certSecretRef:
    name: helm-tls
```

## OCIRepository with IPv6 Registry

```yaml
# oci-source-ipv6.yaml

apiVersion: v1
kind: Secret
metadata:
  name: oci-credentials
  namespace: flux-system
type: kubernetes.io/dockerconfigjson
stringData:
  .dockerconfigjson: |
    {
      "auths": {
        "[2001:db8::30]:5000": {
          "username": "registry-user",
          "password": "registry-password",
          "auth": "cmVnaXN0cnktdXNlcjpyZWdpc3RyeS1wYXNzd29yZA=="
        }
      }
    }

---
apiVersion: source.toolkit.fluxcd.io/v1
kind: OCIRepository
metadata:
  name: myapp-charts
  namespace: flux-system
spec:
  interval: 5m
  url: "oci://[2001:db8::30]:5000/myorg/myapp"
  ref:
    semver: ">=1.0.0"
  secretRef:
    name: oci-credentials
```

## Flux Kustomization Using IPv6 Source

```yaml
# kustomization-ipv6.yaml

apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: myapp
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: myapp             # References the GitRepository above
  path: "./kubernetes/production"
  prune: true
  timeout: 5m
  # Health checks for the deployed resources
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: myapp
      namespace: production
```

## Verify Flux Source Controllers on IPv6

```bash
# Check all Flux sources
flux get sources all -n flux-system

# Watch GitRepository sync status
flux get sources git -A --watch

# Check source controller logs for IPv6 connection attempts
kubectl logs -n flux-system deployment/source-controller | \
    grep -E "ipv6|2001:|fd00:|connect|error" | tail -30

# Check Service IP families for source-controller
kubectl get svc -n flux-system source-controller \
    -o jsonpath='{.spec.ipFamilies}{"\t"}{.spec.clusterIPs}{"\n"}'

# Check Pod IPs for Flux controllers
kubectl get pods -n flux-system \
    -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{range .status.podIPs[*]}{.ip}{" "}{end}{"\n"}{end}'
```

## Flux in IPv6-Only Kubernetes Cluster

```bash
# Flux does not require IPv6-specific install flags; it uses the cluster network
flux install

# Check Flux Services
kubectl get svc -n flux-system
# In IPv6-only clusters, ClusterIPs should be IPv6.
# On dual-stack clusters, inspect ipFamilies/clusterIPs to see which families were assigned.

# Check the source-controller Service IP family assignment
kubectl get svc -n flux-system source-controller \
    -o jsonpath='{.spec.ipFamilies}{"\t"}{.spec.clusterIPs}{"\n"}'
```

## Troubleshoot Flux IPv6 Source Issues

```bash
# Source not ready: check status
kubectl describe gitrepository myapp -n flux-system

# Common errors:
# "x509: cannot validate certificate for 2001:db8::10 because it doesn't contain any IP SANs"
# → When using an IPv6 literal URL, the certificate is missing that IPv6 address in the SAN IP field
# Fix: regenerate the cert with an IP SAN for 2001:db8::10,
#      or use a hostname with a matching DNS SAN and AAAA record

# "dial tcp [2001:db8::10]:443: connect: connection refused"
# → Server not listening on IPv6
# Fix: check Git server binds to [::]:443

# "no such host" for hostname-based URLs
# → DNS not returning AAAA record
# Fix: add AAAA record to DNS, or use literal IPv6 in URL

# Reconcile manually to force retry
flux reconcile source git myapp -n flux-system
```

## Conclusion

Flux CD Source Controllers connect to IPv6 Git servers, Helm chart repositories, and OCI registries using URLs with bracketed IPv6 literals (`https://[2001:db8::10]:443/`) or hostnames with AAAA DNS records. The `known_hosts` field in SSH secrets must include the host key entry returned by `ssh-keyscan` for the IPv6 address or hostname you use. If you use an IPv6 literal in an HTTPS URL, the server certificate must include that IPv6 address as a Subject Alternative Name (SAN) IP entry. The source-controller must have IPv6 reachability in the cluster network - verify from source status, controller logs, and the Pod IPs and Service IP families reported by the Kubernetes API. For IPv6-only clusters, Flux does not need IPv6-specific install flags, but the cluster CNI, DNS, and Service IP family configuration must already support IPv6.
