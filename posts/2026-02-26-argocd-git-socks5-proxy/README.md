# How to Configure Git SOCKS5 Proxy in ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Git, Networking

Description: Learn how to configure SOCKS5 proxy settings for Git operations in ArgoCD to route SSH and HTTPS traffic through SOCKS proxies in restricted network environments.

---

While HTTP/HTTPS proxies are the most common way to route traffic through corporate firewalls, some environments use SOCKS5 proxies instead. SOCKS5 proxies are more versatile because they work at a lower network layer and can proxy both TCP and UDP traffic. This makes them suitable for both HTTPS and SSH Git operations, which is particularly useful when your ArgoCD installation needs to reach Git repositories through an SSH tunnel or a bastion host.

This guide covers how to configure ArgoCD to use a SOCKS5 proxy for Git operations over both HTTPS and SSH.

## SOCKS5 vs HTTP Proxy for Git Operations

Before configuring, it helps to understand why you might use SOCKS5 over a standard HTTP proxy:

```mermaid
flowchart TD
    subgraph "HTTP Proxy"
        A1[ArgoCD] -->|HTTPS only| B1[HTTP Proxy]
        B1 -->|CONNECT tunnel| C1[Git Server HTTPS]
    end

    subgraph "SOCKS5 Proxy"
        A2[ArgoCD] -->|Any TCP traffic| B2[SOCKS5 Proxy]
        B2 -->|SSH port 22| C2[Git Server SSH]
        B2 -->|HTTPS port 443| D2[Git Server HTTPS]
    end
```

The key difference is that SOCKS5 proxies can handle SSH connections natively, while HTTP proxies are typically used for Git HTTP(S) remotes and CONNECT tunnels. If your team uses SSH keys for Git authentication, SOCKS5 is often the better choice.

## Configuring SOCKS5 for HTTPS Git Operations

For Git over HTTPS, configure the SOCKS5 proxy using the ALL_PROXY environment variable or Git's built-in proxy settings:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: argocd-repo-server
  namespace: argocd
spec:
  template:
    spec:
      containers:
      - name: argocd-repo-server
        env:
        # SOCKS5 proxy for all traffic
        - name: ALL_PROXY
          value: "socks5://socks-proxy.corp.example.com:1080"
        # Bypass proxy for internal traffic
        - name: NO_PROXY
          value: "kubernetes.default.svc,10.0.0.0/8,172.16.0.0/12,192.168.0.0/16,.corp.example.com"
```

Alternatively, configure it via the Git system configuration file for more control:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-repo-server-gitconfig
  namespace: argocd
data:
  gitconfig: |
    [http]
      proxy = socks5://socks-proxy.corp.example.com:1080

    [http "https://internal-git.corp.example.com"]
      proxy = ""
```

Mount the gitconfig into the repo server as the system Git config. ArgoCD runs Git with `HOME` set to `/dev/null`, so mounting a global config at `/home/argocd/.gitconfig` will not be used by repo-server Git operations:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: argocd-repo-server
  namespace: argocd
spec:
  template:
    spec:
      containers:
      - name: argocd-repo-server
        volumeMounts:
        - name: gitconfig
          mountPath: /etc/gitconfig
          subPath: gitconfig
      volumes:
      - name: gitconfig
        configMap:
          name: argocd-repo-server-gitconfig
```

## Configuring SOCKS5 for SSH Git Operations

SSH Git operations require a different configuration path. Git's `http.proxy` configuration only applies to HTTP(S) remotes. For ArgoCD-managed SSH repositories, configure the proxy on the repository Secret:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: github-ssh-repo
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repository
type: Opaque
stringData:
  type: git
  url: ssh://git@github.com/argoproj/argocd-example-apps
  proxy: socks5://socks-proxy.corp.example.com:1080
  noProxy: "git.internal.corp.com"
  sshPrivateKey: |
    -----BEGIN OPENSSH PRIVATE KEY-----
    ...
    -----END OPENSSH PRIVATE KEY-----
```

The `proxy` field supports SOCKS5 proxy URLs for SSH repositories. Use `noProxy` for hosts that ArgoCD should reach directly.

You can also configure the same setting with the ArgoCD CLI:

```bash
argocd repo add ssh://git@github.com/argoproj/argocd-example-apps \
  --ssh-private-key-path ~/id_rsa \
  --proxy socks5://socks-proxy.corp.example.com:1080
```

## SOCKS5 with Authentication

If your SOCKS5 proxy requires username and password authentication:

For HTTPS operations, include credentials in the URL:

```yaml
env:
  - name: ALL_PROXY
    value: "socks5://username:password@socks-proxy.corp.example.com:1080"
```

For SSH operations, include the credentials in the ArgoCD repository proxy URL:

```yaml
stringData:
  type: git
  url: ssh://git@github.com/argoproj/argocd-example-apps
  proxy: socks5://username:password@socks-proxy.corp.example.com:1080
  sshPrivateKey: |
    -----BEGIN OPENSSH PRIVATE KEY-----
    ...
    -----END OPENSSH PRIVATE KEY-----
```

For better security, store the credentials in a Kubernetes Secret:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: socks-proxy-credentials
  namespace: argocd
type: Opaque
stringData:
  ALL_PROXY: "socks5://username:password@socks-proxy.corp.example.com:1080"
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: argocd-repo-server
  namespace: argocd
spec:
  template:
    spec:
      containers:
      - name: argocd-repo-server
        envFrom:
        - secretRef:
            name: socks-proxy-credentials
        env:
        - name: NO_PROXY
          value: "kubernetes.default.svc,10.0.0.0/8,172.16.0.0/12,192.168.0.0/16"
```

## Using SSH Tunnels as SOCKS5 Proxies

A common pattern in restricted environments is using an SSH tunnel to a bastion host as a SOCKS5 proxy. This is useful when your Kubernetes cluster cannot reach Git servers directly but can reach a bastion host that has internet access.

You can create a sidecar container that establishes the SSH tunnel:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: argocd-repo-server
  namespace: argocd
spec:
  template:
    spec:
      containers:
      - name: argocd-repo-server
        env:
        - name: ALL_PROXY
          value: "socks5://127.0.0.1:1080"
        - name: NO_PROXY
          value: "kubernetes.default.svc,10.0.0.0/8,172.16.0.0/12,192.168.0.0/16"

      # Sidecar that creates a SOCKS5 proxy via SSH tunnel
      - name: ssh-tunnel
        image: alpine:3.20
        command:
        - sh
        - -c
        - |
          apk add --no-cache openssh-client
          ssh -N -D 0.0.0.0:1080 \
            -o StrictHostKeyChecking=no \
            -o ServerAliveInterval=60 \
            -o ServerAliveCountMax=3 \
            -i /ssh-key/id_rsa \
            tunnel-user@bastion.corp.example.com
        ports:
        - containerPort: 1080
          name: socks5
        volumeMounts:
        - name: ssh-key
          mountPath: /ssh-key
          readOnly: true

      volumes:
      - name: ssh-key
        secret:
          secretName: bastion-ssh-key
          defaultMode: 0400
```

This sidecar approach keeps the tunnel running alongside the repo server. The repo server connects to `127.0.0.1:1080` to use the local SOCKS5 proxy, which tunnels traffic through the bastion host.

## SOCKS5h vs SOCKS5

There is an important distinction between `socks5://` and `socks5h://`:

- `socks5://` - DNS resolution happens locally (on the repo server pod)
- `socks5h://` - DNS resolution happens on the SOCKS proxy server

In environments where the Git server's DNS name is only resolvable from the proxy server (not from within the Kubernetes cluster), use `socks5h://`:

```yaml
env:
  - name: ALL_PROXY
    value: "socks5h://socks-proxy.corp.example.com:1080"
```

In the Git system configuration:

```ini
[http]
  proxy = socks5h://socks-proxy.corp.example.com:1080
```

## Verifying SOCKS5 Proxy Configuration

After setting up the SOCKS5 proxy, verify connectivity:

```bash
# Verify environment variables are set

kubectl exec -n argocd deployment/argocd-repo-server -- env | grep -i proxy

# Test HTTPS Git connectivity through the proxy
kubectl exec -n argocd deployment/argocd-repo-server -- \
  git ls-remote https://github.com/argoproj/argocd-example-apps.git

# Test SSH repository connectivity through ArgoCD's repository proxy setting
argocd repo add ssh://git@github.com/argoproj/argocd-example-apps \
  --ssh-private-key-path ~/id_rsa \
  --proxy socks5://socks-proxy.corp.example.com:1080 \
  --upsert

# Check for proxy-related errors in logs
kubectl logs -n argocd deployment/argocd-repo-server --tail=100 | grep -i "socks\|proxy\|connect"
```

## Troubleshooting SOCKS5 Issues

**"SOCKS5 connect to ... failed: general SOCKS server failure"**

The proxy server rejected the connection. Check if the proxy requires authentication or if the destination host/port is blocked by proxy rules.

**"nc: proxy connect failed"**

The netcat command cannot reach the SOCKS5 proxy. Verify the proxy hostname and port are correct, and that network policies in your cluster allow outbound connections to the proxy.

**"SSH connection timed out through proxy"**

The SOCKS5 proxy might be blocking port 22. Some proxies only allow HTTP/HTTPS ports. Check with your network team or use HTTPS Git URLs instead.

**DNS resolution failures with socks5://**

Switch to `socks5h://` to delegate DNS resolution to the proxy server, especially when the Git server's hostname is only resolvable from the proxy's network.

SOCKS5 proxy configuration in ArgoCD is slightly more complex than HTTP proxy because it can handle both HTTPS and SSH traffic. Once configured, it provides a more versatile tunneling solution that works well in environments where SSH-based Git access is required alongside HTTPS.
