# How to Set Up Flux CD Behind a Corporate Proxy

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Corporate Proxy, Enterprise, Networking, DevOps

Description: Learn how to configure Flux CD to work behind corporate HTTP/HTTPS proxies, including environment variable configuration, certificate handling, and troubleshooting.

---

Many enterprise environments route all outbound traffic through corporate proxy servers for security, compliance, and auditing. Flux CD needs outbound connectivity to reach Git repositories, Helm registries, and container registries. This guide explains how to configure Flux CD to work correctly behind a corporate HTTP or HTTPS proxy.

## Prerequisites

- A Kubernetes cluster with outbound access routed through a corporate proxy
- The Flux CLI installed on a workstation that can reach the cluster
- Your corporate proxy URL (e.g., `http://proxy.corp.example.com:8080`)
- The proxy's CA certificate if it performs TLS inspection
- A GitHub or GitLab personal access token with `repo` permissions

## Understanding the Proxy Requirements

Flux CD controllers make outbound HTTPS connections to:

- **Git providers** (GitHub, GitLab, Bitbucket) for source reconciliation
- **Helm registries** for chart downloads
- **Container registries** for image scanning (if using image automation)
- **Kubernetes API server** (internal, typically does not go through the proxy)

Each Flux controller is a standard Go application that respects the `HTTP_PROXY`, `HTTPS_PROXY`, and `NO_PROXY` environment variables.

## Step 1: Install the Flux CLI

If your workstation also sits behind the proxy, configure the proxy before installing the Flux CLI.

```bash
# Set proxy environment variables on your workstation
export HTTP_PROXY=http://proxy.corp.example.com:8080
export HTTPS_PROXY=http://proxy.corp.example.com:8080
export NO_PROXY=localhost,127.0.0.1,10.0.0.0/8,.cluster.local

# Install the Flux CLI
curl -s https://fluxcd.io/install.sh | sudo bash
```

## Step 2: Export Credentials

Set up your Git provider credentials.

```bash
# Export GitHub credentials
export GITHUB_TOKEN=<your-github-personal-access-token>
export GITHUB_USER=<your-github-username>
```

## Step 3: Bootstrap with Proxy Environment Variables

The recommended approach is to bootstrap Flux and then patch the controller deployments to include proxy environment variables. First, run the standard bootstrap.

```bash
# Bootstrap Flux CD
flux bootstrap github \
  --owner=$GITHUB_USER \
  --repository=fleet-infra \
  --branch=main \
  --path=./clusters/production \
  --personal
```

If the bootstrap fails because the Flux CLI cannot reach GitHub through the proxy, ensure `HTTPS_PROXY` is set in your shell environment before running the command.

## Step 4: Patch Flux Controllers with Proxy Settings

After bootstrapping, create a patch file that injects proxy environment variables into all Flux controllers. Add this file to your `fleet-infra` repository in the `flux-system` directory.

```yaml
# flux-system/proxy-patch.yaml
# Inject corporate proxy environment variables into Flux controllers
apiVersion: apps/v1
kind: Deployment
metadata:
  name: source-controller
  namespace: flux-system
spec:
  template:
    spec:
      containers:
        - name: manager
          env:
            - name: HTTPS_PROXY
              value: "http://proxy.corp.example.com:8080"
            - name: HTTP_PROXY
              value: "http://proxy.corp.example.com:8080"
            - name: NO_PROXY
              # Exclude internal cluster traffic from the proxy
              value: ".cluster.local,.svc,10.0.0.0/8,172.16.0.0/12,192.168.0.0/16,localhost,127.0.0.1"
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: kustomize-controller
  namespace: flux-system
spec:
  template:
    spec:
      containers:
        - name: manager
          env:
            - name: HTTPS_PROXY
              value: "http://proxy.corp.example.com:8080"
            - name: HTTP_PROXY
              value: "http://proxy.corp.example.com:8080"
            - name: NO_PROXY
              value: ".cluster.local,.svc,10.0.0.0/8,172.16.0.0/12,192.168.0.0/16,localhost,127.0.0.1"
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: helm-controller
  namespace: flux-system
spec:
  template:
    spec:
      containers:
        - name: manager
          env:
            - name: HTTPS_PROXY
              value: "http://proxy.corp.example.com:8080"
            - name: HTTP_PROXY
              value: "http://proxy.corp.example.com:8080"
            - name: NO_PROXY
              value: ".cluster.local,.svc,10.0.0.0/8,172.16.0.0/12,192.168.0.0/16,localhost,127.0.0.1"
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: notification-controller
  namespace: flux-system
spec:
  template:
    spec:
      containers:
        - name: manager
          env:
            - name: HTTPS_PROXY
              value: "http://proxy.corp.example.com:8080"
            - name: HTTP_PROXY
              value: "http://proxy.corp.example.com:8080"
            - name: NO_PROXY
              value: ".cluster.local,.svc,10.0.0.0/8,172.16.0.0/12,192.168.0.0/16,localhost,127.0.0.1"
```

Update the `flux-system/kustomization.yaml` file to include this patch.

```yaml
# flux-system/kustomization.yaml
# Add the proxy patch to the Flux system kustomization
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - gotk-components.yaml
  - gotk-sync.yaml
patches:
  - path: proxy-patch.yaml
    target:
      kind: Deployment
```

Commit and push these changes. Flux will apply the proxy configuration to its own controllers.

## Step 5: Handle TLS-Intercepting Proxies

Many corporate proxies perform TLS inspection by terminating and re-encrypting HTTPS connections using a corporate CA certificate. Flux controllers will reject these connections unless the corporate CA is trusted.

Create a ConfigMap with your corporate CA certificate.

```bash
# Create a ConfigMap with the corporate CA certificate
kubectl create configmap corporate-ca \
  --from-file=ca.crt=/path/to/corporate-ca.crt \
  -n flux-system
```

Then mount the CA certificate into the source-controller (which handles all outbound Git and Helm connections) by adding a volume mount patch.

```yaml
# flux-system/ca-patch.yaml
# Mount corporate CA certificate into the source-controller
apiVersion: apps/v1
kind: Deployment
metadata:
  name: source-controller
  namespace: flux-system
spec:
  template:
    spec:
      containers:
        - name: manager
          # Tell Go to use the custom CA bundle
          env:
            - name: SSL_CERT_DIR
              value: "/etc/ssl/certs"
          volumeMounts:
            - name: corporate-ca
              mountPath: /etc/ssl/certs/corporate-ca.crt
              subPath: ca.crt
              readOnly: true
      volumes:
        - name: corporate-ca
          configMap:
            name: corporate-ca
```

## Step 6: Configure NO_PROXY Correctly

The `NO_PROXY` variable is critical. Incorrect configuration can cause Flux controllers to route internal Kubernetes traffic through the proxy, leading to failures.

Always include these in your `NO_PROXY` setting:

| Entry | Purpose |
|-------|---------|
| `.cluster.local` | Internal Kubernetes DNS |
| `.svc` | Kubernetes service DNS |
| `10.0.0.0/8` | Common pod/service CIDR |
| `172.16.0.0/12` | Common pod/service CIDR |
| `192.168.0.0/16` | Common pod/service CIDR |
| `localhost` | Loopback |
| `127.0.0.1` | Loopback |

Adjust the CIDR ranges to match your cluster's pod and service CIDRs.

```bash
# Find your cluster's service CIDR
kubectl cluster-info dump | grep -m 1 service-cluster-ip-range

# Find your cluster's pod CIDR
kubectl cluster-info dump | grep -m 1 cluster-cidr
```

## Step 7: Verify Proxy Configuration

After the controllers restart with the new environment variables, verify they can reach external resources.

```bash
# Check that source-controller can pull from your Git repository
flux get sources git

# Check the controller logs for proxy-related errors
kubectl logs -n flux-system deploy/source-controller | grep -i proxy

# Force a reconciliation to test connectivity
flux reconcile source git flux-system
```

## Proxy Authentication

If your corporate proxy requires authentication, include the credentials in the proxy URL.

```yaml
# Example with proxy authentication
env:
  - name: HTTPS_PROXY
    value: "http://username:password@proxy.corp.example.com:8080"
```

For better security, store the proxy credentials in a Kubernetes Secret and reference them via environment variable references.

```yaml
# proxy-secret.yaml
# Store proxy credentials securely
apiVersion: v1
kind: Secret
metadata:
  name: proxy-credentials
  namespace: flux-system
type: Opaque
stringData:
  HTTPS_PROXY: "http://username:password@proxy.corp.example.com:8080"
  HTTP_PROXY: "http://username:password@proxy.corp.example.com:8080"
```

Then reference the secret in the deployment patch.

```yaml
# Reference proxy credentials from a Secret
env:
  - name: HTTPS_PROXY
    valueFrom:
      secretKeyRef:
        name: proxy-credentials
        key: HTTPS_PROXY
  - name: HTTP_PROXY
    valueFrom:
      secretKeyRef:
        name: proxy-credentials
        key: HTTP_PROXY
```

## Troubleshooting

Common issues when running Flux CD behind a proxy:

- **"connection refused" or "connection timed out"**: The proxy environment variables are not set or the proxy URL is incorrect. Check `kubectl describe deploy -n flux-system source-controller` to verify the env vars.
- **"x509: certificate signed by unknown authority"**: The proxy performs TLS inspection and the corporate CA is not trusted. Follow Step 5 to mount the CA certificate.
- **"proxyconnect tcp: dial tcp: lookup proxy.corp.example.com: no such host"**: The proxy hostname cannot be resolved from within the cluster. Use the proxy IP address instead of hostname, or ensure cluster DNS can resolve the proxy hostname.
- **Internal services failing**: `NO_PROXY` is not configured correctly, causing internal traffic to be routed through the proxy. Review Step 6.

## Conclusion

Configuring Flux CD behind a corporate proxy requires injecting the appropriate environment variables into each Flux controller and handling TLS inspection certificates if applicable. The key is getting `HTTPS_PROXY`, `HTTP_PROXY`, and `NO_PROXY` set correctly, with special attention to excluding internal cluster traffic from the proxy. Once configured, Flux CD operates normally, pulling from Git repositories and Helm registries through the proxy while keeping internal Kubernetes communication direct.
