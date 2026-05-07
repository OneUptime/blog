# How to Configure SSL/TLS Termination for Ingress in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Ingress, SSL, TLS

Description: Learn how to configure SSL/TLS termination for Ingress resources in Rancher using certificates, cert-manager, and Let's Encrypt.

Securing your applications with SSL/TLS is essential for production deployments. Rancher makes it straightforward to configure TLS termination at the ingress level, supporting manual certificates, cert-manager automation, and Let's Encrypt integration. This guide covers all approaches.

## Prerequisites

- A running Rancher instance (v2.6 or later)
- A managed Kubernetes cluster with an ingress controller
- A domain name pointing to your cluster's ingress IP
- kubectl access to your cluster

## Step 1: Create a TLS Secret with a Manual Certificate

If you have an existing SSL certificate, create a Kubernetes secret:

```bash
kubectl create secret tls my-tls-secret \
  --cert=fullchain.pem \
  --key=privkey.pem \
  -n default
```

Verify the secret was created:

```bash
kubectl get secret my-tls-secret -n default
```

## Step 2: Configure Ingress with the TLS Secret

Reference the TLS secret in your Ingress resource:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: secure-ingress
  namespace: default
spec:
  ingressClassName: nginx
  tls:
  - hosts:
    - myapp.example.com
    secretName: my-tls-secret
  rules:
  - host: myapp.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: my-app-service
            port:
              number: 80
```

Apply it:

```bash
kubectl apply -f secure-ingress.yaml
```

## Step 3: Install cert-manager

cert-manager automates certificate management. Install it via Rancher Apps:

1. Navigate to your cluster in Rancher.
2. Go to **Apps** > **Charts**.
3. Search for **cert-manager**.
4. Click **Install** and follow the prompts.

Or install via Helm:

```bash
helm repo add jetstack https://charts.jetstack.io
helm repo update

helm install cert-manager jetstack/cert-manager \
  --namespace cert-manager \
  --create-namespace \
  --set crds.enabled=true
```

Verify the installation:

```bash
kubectl get pods -n cert-manager
```

## Step 4: Create a ClusterIssuer for Let's Encrypt

Set up a ClusterIssuer for automatic certificate provisioning:

```yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@yourdomain.com
    privateKeySecretRef:
      name: letsencrypt-prod-key
    solvers:
    - http01:
        ingress:
          ingressClassName: nginx
```

For testing, use the staging server first:

```yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-staging
spec:
  acme:
    server: https://acme-staging-v02.api.letsencrypt.org/directory
    email: admin@yourdomain.com
    privateKeySecretRef:
      name: letsencrypt-staging-key
    solvers:
    - http01:
        ingress:
          ingressClassName: nginx
```

Apply the ClusterIssuer:

```bash
kubectl apply -f clusterissuer.yaml
```

## Step 5: Create an Ingress with Automatic TLS

Use annotations to trigger automatic certificate generation:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: auto-tls-ingress
  namespace: default
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  ingressClassName: nginx
  tls:
  - hosts:
    - myapp.example.com
    secretName: myapp-tls
  rules:
  - host: myapp.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: my-app-service
            port:
              number: 80
```

cert-manager will automatically request a certificate from Let's Encrypt and store it in the `myapp-tls` secret.

## Step 6: Configure DNS-01 Challenge

For wildcard certificates or when HTTP-01 is not suitable, use DNS-01:

```yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-dns
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@yourdomain.com
    privateKeySecretRef:
      name: letsencrypt-dns-key
    solvers:
    - dns01:
        cloudflare:
          apiTokenSecretRef:
            name: cloudflare-api-token
            key: api-token
```

Create the Cloudflare API token secret:

```bash
kubectl create secret generic cloudflare-api-token \
  --from-literal=api-token=YOUR_API_TOKEN \
  -n cert-manager
```

## Step 7: Force HTTPS Redirect

Configure the ingress to redirect HTTP to HTTPS:

For NGINX:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: force-https-ingress
  namespace: default
  annotations:
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/force-ssl-redirect: "true"
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  ingressClassName: nginx
  tls:
  - hosts:
    - myapp.example.com
    secretName: myapp-tls
  rules:
  - host: myapp.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: my-app-service
            port:
              number: 80
```

## Step 8: Monitor Certificate Status

Check the status of your certificates:

```bash
kubectl get certificates --all-namespaces
kubectl describe certificate myapp-tls -n default
kubectl get certificaterequest --all-namespaces
kubectl get orders --all-namespaces
kubectl get challenges --all-namespaces
```

A healthy certificate will show `Ready: True` in its status.

## Step 9: Configure TLS via the Rancher UI

1. Navigate to your cluster in Rancher.
2. Go to **Service Discovery** > **Ingresses**.
3. Click **Create** or edit an existing Ingress.
4. Under **Certificates**, click **Add Certificate**.
5. Select an existing certificate secret.
6. Map the certificate to your host.
7. Click **Save**.

## Troubleshooting

- Check cert-manager logs: `kubectl logs -n cert-manager deployment/cert-manager`
- Review certificate status: `kubectl describe certificate <name> -n <namespace>`
- Check for failed challenges: `kubectl get challenges --all-namespaces`
- Verify DNS resolution: `nslookup myapp.example.com`
- Test TLS: `curl -vk https://myapp.example.com`
- Check secret contents: `kubectl get secret myapp-tls -n default -o yaml`

## Summary

SSL/TLS termination at the ingress level is critical for securing your applications. Rancher supports manual certificate management through Kubernetes secrets and automated certificate lifecycle management through cert-manager with Let's Encrypt. By combining ingress controllers with cert-manager, you can achieve fully automated certificate provisioning and renewal for all your services.
