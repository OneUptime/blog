# How to Troubleshoot Controller Network Timeout Errors in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Troubleshooting, Network Timeouts, DNS, Proxy, Connectivity

Description: Learn how to diagnose and fix network timeout errors in Flux controllers caused by DNS failures, proxy misconfigurations, firewall rules, and registry connectivity issues.

---

Flux controllers need network access to external services including Git repositories, Helm registries, OCI registries, and container registries. Network timeout errors prevent controllers from fetching sources, pulling charts, scanning images, and sending notifications. This guide explains how to diagnose and resolve network timeout errors across all Flux controllers.

## Prerequisites

Before you begin, ensure you have the following:

- A Kubernetes cluster with Flux installed
- kubectl configured to access your cluster
- Permissions to view pods, logs, services, and network policies in the flux-system namespace
- Network debugging tools like `dig`, `curl`, or `nslookup` (or a debug pod)

## Step 1: Identify Network Timeout Errors

Check controller logs for timeout-related errors:

```bash
kubectl logs -n flux-system deploy/source-controller | grep -i "timeout\|dial tcp\|connection refused\|no such host\|i/o timeout"
kubectl logs -n flux-system deploy/helm-controller | grep -i "timeout\|dial tcp\|connection refused"
kubectl logs -n flux-system deploy/notification-controller | grep -i "timeout\|dial tcp\|connection refused"
```

Check Flux resource statuses for connectivity errors:

```bash
flux get sources all --all-namespaces --status-selector ready=false
flux get helmreleases --all-namespaces --status-selector ready=false
```

## Step 2: Test Network Connectivity from the Cluster

Deploy a debug pod to test connectivity from within the cluster:

```bash
kubectl run netdebug -n flux-system --image=nicolaka/netshoot --rm -it --restart=Never -- /bin/bash
```

From inside the debug pod, test connectivity to your external services:

```bash
# Test DNS resolution
nslookup github.com
nslookup registry.example.com

# Test HTTPS connectivity
curl -v https://github.com
curl -v https://registry.example.com

# Test specific ports
nc -zv github.com 443
nc -zv github.com 22
```

## Step 3: Diagnose Common Network Issues

### DNS Resolution Failures

If DNS resolution fails, controllers cannot resolve hostnames for Git repositories and registries:

```bash
kubectl logs -n flux-system deploy/source-controller | grep -i "no such host\|dns\|resolve"
```

Check the cluster DNS configuration:

```bash
kubectl get configmap -n kube-system coredns -o yaml
kubectl get pods -n kube-system -l k8s-app=kube-dns
kubectl logs -n kube-system -l k8s-app=kube-dns --tail=50
```

Verify DNS works from the controller pod:

```bash
kubectl exec -n flux-system deploy/source-controller -- nslookup github.com
```

If DNS is failing, check CoreDNS for issues:

```bash
kubectl rollout restart deployment/coredns -n kube-system
```

### HTTP/HTTPS Proxy Configuration

In corporate environments, outbound traffic often requires a proxy. Flux controllers need proxy environment variables:

```bash
kubectl get deploy -n flux-system source-controller -o jsonpath='{.spec.template.spec.containers[0].env}' | python3 -m json.tool
```

If proxy variables are not set, add them:

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - gotk-components.yaml
patches:
  - target:
      kind: Deployment
      labelSelector: app.kubernetes.io/part-of=flux
    patch: |
      apiVersion: apps/v1
      kind: Deployment
      metadata:
        name: all
      spec:
        template:
          spec:
            containers:
            - name: manager
              env:
              - name: HTTPS_PROXY
                value: "http://proxy.example.com:8080"
              - name: HTTP_PROXY
                value: "http://proxy.example.com:8080"
              - name: NO_PROXY
                value: ".cluster.local,.svc,10.0.0.0/8,172.16.0.0/12,192.168.0.0/16"
```

Ensure `NO_PROXY` includes internal cluster addresses so that in-cluster communication bypasses the proxy.

### Firewall and Network Policy Restrictions

Check if network policies are blocking egress traffic from the flux-system namespace:

```bash
kubectl get networkpolicies -n flux-system
```

If network policies exist, ensure they allow egress to the required external services:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: flux-egress
  namespace: flux-system
spec:
  podSelector: {}
  policyTypes:
  - Egress
  egress:
  - to: []
    ports:
    - protocol: TCP
      port: 443
    - protocol: TCP
      port: 80
    - protocol: TCP
      port: 22
  - to:
    - namespaceSelector: {}
    ports:
    - protocol: UDP
      port: 53
    - protocol: TCP
      port: 53
```

Also check cloud provider firewall rules that may restrict outbound traffic from your cluster nodes.

### TLS Handshake Timeouts

Slow TLS handshakes or TLS inspection by corporate proxies can cause timeouts:

```bash
kubectl logs -n flux-system deploy/source-controller | grep -i "tls\|handshake\|x509"
```

If you have a corporate proxy performing TLS inspection, you need to add the proxy CA certificate to the controller trust store:

```bash
kubectl create configmap proxy-ca -n flux-system --from-file=ca.crt=/path/to/proxy-ca.crt
```

Then mount it in the controller deployment and set the appropriate environment variable:

```yaml
spec:
  template:
    spec:
      containers:
      - name: manager
        env:
        - name: SSL_CERT_DIR
          value: /etc/ssl/certs
        volumeMounts:
        - name: proxy-ca
          mountPath: /etc/ssl/certs/proxy-ca.crt
          subPath: ca.crt
      volumes:
      - name: proxy-ca
        configMap:
          name: proxy-ca
```

### SSH Connectivity Issues

For Git repositories accessed over SSH, verify SSH connectivity:

```bash
kubectl exec -n flux-system deploy/source-controller -- ssh -T git@github.com -o StrictHostKeyChecking=no 2>&1 || true
```

Check known hosts configuration:

```bash
kubectl get secret -n flux-system flux-system -o jsonpath='{.data.known_hosts}' | base64 -d
```

### Registry Rate Limiting

Container registries may rate-limit or temporarily block requests, causing timeouts:

```bash
kubectl logs -n flux-system deploy/source-controller | grep -i "429\|rate limit\|too many"
```

Authenticate with registries to get higher rate limits and increase reconciliation intervals to reduce request frequency.

## Step 4: Adjust Timeout Settings

If timeouts are caused by slow but functional network connections, increase the timeout values:

```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: my-repo
  namespace: flux-system
spec:
  timeout: 120s
  interval: 10m
  url: https://github.com/myorg/myrepo
```

For HelmRepository sources:

```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: my-charts
  namespace: flux-system
spec:
  timeout: 120s
  interval: 10m
  url: https://charts.example.com
```

## Step 5: Verify Connectivity After Fixes

After applying fixes, force a reconciliation:

```bash
flux reconcile source git my-repo -n flux-system
flux reconcile source helm my-charts -n flux-system
```

Check that sources are being fetched successfully:

```bash
flux get sources all --all-namespaces
```

Monitor controller logs for continued errors:

```bash
kubectl logs -n flux-system deploy/source-controller -f --tail=50
```

## Prevention Tips

- Document all network requirements for Flux controllers (required endpoints, ports, protocols)
- Test network connectivity as part of your Flux installation process
- Use monitoring to detect network timeout trends before they cause outages
- Configure proxy settings at installation time rather than retroactively
- Add custom CA certificates during initial Flux setup
- Set appropriate timeout values based on your network latency characteristics
- Use network policy templates that include the required Flux egress rules
- Authenticate with container registries to avoid rate limiting
- Consider using internal mirrors or caches for frequently accessed external registries

## Summary

Network timeout errors in Flux controllers are caused by DNS resolution failures, missing proxy configuration, firewall or network policy restrictions, TLS issues, or registry rate limiting. Diagnosing these issues requires testing connectivity from within the cluster, verifying DNS, checking proxy settings, and reviewing network policies. Proper network configuration during Flux installation and proactive connectivity monitoring are the most effective prevention strategies.
