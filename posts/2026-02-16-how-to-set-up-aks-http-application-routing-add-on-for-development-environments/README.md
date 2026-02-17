# How to Set Up AKS HTTP Application Routing Add-On for Development Environments

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AKS, Kubernetes, HTTP Routing, Ingress, Azure, Development, DNS

Description: Learn how to set up the AKS HTTP application routing add-on to quickly expose services with automatic DNS in development environments.

---

When you are building and testing applications on AKS, one of the first things you need is a way to reach your services from outside the cluster. Setting up a proper ingress controller with TLS certificates and DNS records is the right move for production, but for development environments it is overkill. You just want a URL that works.

The HTTP application routing add-on for AKS solves exactly this problem. It automatically deploys an NGINX ingress controller and an external-dns controller that creates DNS records in an Azure DNS zone. You annotate your ingress resources, and within a couple of minutes you have a working URL pointing to your service. No manual DNS configuration, no certificate management headaches - just fast, functional routing for dev and test.

## Important Caveat

Before we get into the setup, a clear warning: this add-on is not meant for production. Microsoft explicitly marks it as a development-only tool. It does not support TLS termination out of the box, the DNS zone it creates is publicly accessible, and the NGINX deployment is not hardened. Use it for dev and staging. For production, set up a proper ingress controller with cert-manager and your own DNS configuration.

## Enabling the Add-On

You can enable HTTP application routing when creating a new cluster or on an existing one. Here is how to do both.

```bash
# Enable on a new AKS cluster
az aks create \
  --resource-group dev-rg \
  --name dev-cluster \
  --node-count 2 \
  --enable-addons http_application_routing \
  --generate-ssh-keys

# Or enable on an existing cluster
az aks enable-addons \
  --resource-group dev-rg \
  --name dev-cluster \
  --addons http_application_routing
```

When the add-on is enabled, AKS does several things automatically. It creates an Azure DNS zone with a randomly generated domain name (something like `9f9c1fe7f2b34e12a.eastus.aksapp.io`). It deploys an NGINX ingress controller in the `kube-system` namespace. And it deploys an external-dns pod that watches for ingress resources and creates corresponding DNS records.

## Finding Your DNS Zone

After enabling the add-on, you need to know what DNS zone was created. This is the domain you will use for all your ingress rules.

```bash
# Get the DNS zone name created by the add-on
az aks show \
  --resource-group dev-rg \
  --name dev-cluster \
  --query addonProfiles.httpApplicationRouting.config.HTTPApplicationRoutingZoneName \
  -o tsv
```

This returns something like `9f9c1fe7f2b34e12a.eastus.aksapp.io`. Save this value - you will use it in every ingress resource you create.

## Deploying a Sample Application

Let us walk through a complete example. We will deploy a simple web application and expose it through the HTTP application routing add-on.

First, create a deployment and service.

```yaml
# app-deployment.yaml
# Simple nginx deployment for testing the routing add-on
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
  namespace: default
spec:
  replicas: 2
  selector:
    matchLabels:
      app: web-app
  template:
    metadata:
      labels:
        app: web-app
    spec:
      containers:
        - name: web
          image: nginx:1.25
          ports:
            - containerPort: 80
          resources:
            requests:
              cpu: 50m
              memory: 64Mi
            limits:
              cpu: 200m
              memory: 128Mi
---
# Service that exposes the deployment internally
apiVersion: v1
kind: Service
metadata:
  name: web-app-svc
  namespace: default
spec:
  type: ClusterIP
  ports:
    - port: 80
      targetPort: 80
  selector:
    app: web-app
```

Now create the ingress resource. This is where the add-on magic happens.

```yaml
# app-ingress.yaml
# Ingress resource that uses the HTTP application routing add-on
# Replace <DNS_ZONE> with your actual zone name from the az aks show command
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: web-app-ingress
  namespace: default
  annotations:
    # This annotation tells AKS to use the HTTP application routing add-on
    kubernetes.io/ingress.class: addon-http-application-routing
spec:
  rules:
    - host: web-app.<DNS_ZONE>
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: web-app-svc
                port:
                  number: 80
```

Apply both files.

```bash
# Deploy the application and ingress
kubectl apply -f app-deployment.yaml
kubectl apply -f app-ingress.yaml
```

Within a few minutes, the external-dns controller picks up the ingress resource, creates an A record in the Azure DNS zone, and your application becomes reachable at `web-app.<DNS_ZONE>`.

## Verifying the Setup

After deploying, check that everything is working correctly.

```bash
# Verify the ingress controller pods are running
kubectl get pods -n kube-system -l app=addon-http-application-routing-nginx-ingress

# Check the external-dns pod
kubectl get pods -n kube-system -l app=addon-http-application-routing-external-dns

# Verify your ingress resource has an address assigned
kubectl get ingress web-app-ingress

# Check the DNS record was created in Azure
az network dns record-set a list \
  --resource-group MC_dev-rg_dev-cluster_eastus \
  --zone-name <DNS_ZONE> \
  -o table
```

If the ingress shows an address but the DNS is not resolving yet, give it a few more minutes. DNS propagation can take 2-5 minutes depending on the TTL settings.

## Troubleshooting Common Issues

### Ingress Has No Address

If your ingress resource stays without an address for more than five minutes, check the ingress controller logs.

```bash
# Check ingress controller logs for errors
kubectl logs -n kube-system -l app=addon-http-application-routing-nginx-ingress --tail=50

# Check external-dns logs to see if it is picking up your ingress
kubectl logs -n kube-system -l app=addon-http-application-routing-external-dns --tail=50
```

Common causes include the annotation being wrong (it must be exactly `addon-http-application-routing`), the service name in the ingress not matching the actual service, or the external-dns pod not having permissions to modify the DNS zone.

### DNS Not Resolving

If the DNS record exists in Azure but you cannot resolve it from your machine, it is likely a propagation delay. You can verify the record exists directly.

```bash
# Query Azure DNS directly to bypass local cache
az network dns record-set a show \
  --resource-group MC_dev-rg_dev-cluster_eastus \
  --zone-name <DNS_ZONE> \
  --name web-app

# Or use dig to check resolution
dig web-app.<DNS_ZONE> +short
```

### Multiple Services on the Same Host

You can route different paths on the same hostname to different services.

```yaml
# multi-path-ingress.yaml
# Route different paths to different backend services
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: multi-service-ingress
  annotations:
    kubernetes.io/ingress.class: addon-http-application-routing
    # Rewrite target so /api requests are forwarded to / on the backend
    nginx.ingress.kubernetes.io/rewrite-target: /$2
spec:
  rules:
    - host: myapp.<DNS_ZONE>
      http:
        paths:
          - path: /api(/|$)(.*)
            pathType: ImplementationSpecific
            backend:
              service:
                name: api-service
                port:
                  number: 8080
          - path: /
            pathType: Prefix
            backend:
              service:
                name: frontend-service
                port:
                  number: 80
```

## Using with Namespaced Environments

A common pattern in development is to have one namespace per developer or per feature branch. The HTTP application routing add-on works across namespaces, so each developer can have their own hostname.

```bash
# Create a namespace for a developer
kubectl create namespace dev-alice

# Deploy the app in Alice's namespace
kubectl apply -f app-deployment.yaml -n dev-alice

# Create an ingress with Alice's subdomain
# The host would be: alice-web-app.<DNS_ZONE>
```

Here is a script that automates creating a developer environment with its own routing.

```bash
#!/bin/bash
# create-dev-env.sh
# Creates a namespaced development environment with HTTP routing
# Usage: ./create-dev-env.sh <developer-name> <dns-zone>

DEV_NAME=$1
DNS_ZONE=$2
NAMESPACE="dev-${DEV_NAME}"

# Create the namespace
kubectl create namespace "${NAMESPACE}" --dry-run=client -o yaml | kubectl apply -f -

# Deploy the application
kubectl apply -f app-deployment.yaml -n "${NAMESPACE}"

# Generate and apply the ingress with the developer-specific hostname
cat <<EOF | kubectl apply -f -
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: ${DEV_NAME}-ingress
  namespace: ${NAMESPACE}
  annotations:
    kubernetes.io/ingress.class: addon-http-application-routing
spec:
  rules:
    - host: ${DEV_NAME}.\${DNS_ZONE}
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: web-app-svc
                port:
                  number: 80
EOF

echo "Application will be available at: http://${DEV_NAME}.${DNS_ZONE}"
```

## Migrating to the Web App Routing Add-On

Microsoft has introduced a newer add-on called "Web Application Routing" that is designed to eventually replace the HTTP application routing add-on. The newer version supports TLS with Let's Encrypt, integration with Azure Key Vault for certificates, and is considered suitable for production use.

If you are starting fresh, consider using the web app routing add-on instead.

```bash
# Enable the newer web app routing add-on
az aks enable-addons \
  --resource-group dev-rg \
  --name dev-cluster \
  --addons web_application_routing
```

The newer add-on uses the `webapprouting.kubernetes.azure.com/using-default-backend` annotation instead, and integrates with the `IngressClass` resource properly.

## Disabling the Add-On

When you no longer need the HTTP application routing add-on, you can disable it cleanly.

```bash
# Disable the add-on
az aks disable-addons \
  --resource-group dev-rg \
  --name dev-cluster \
  --addons http_application_routing
```

This removes the NGINX ingress controller and external-dns pods, but it does not delete the Azure DNS zone. You can clean that up manually if needed.

```bash
# Delete the DNS zone if no longer needed
az network dns zone delete \
  --resource-group MC_dev-rg_dev-cluster_eastus \
  --name <DNS_ZONE> \
  --yes
```

## Wrapping Up

The HTTP application routing add-on is a quick and effective way to get external access to your AKS services during development. It removes the friction of setting up DNS records and ingress controllers manually, letting you focus on building and testing your application. Just remember the golden rule: keep it in dev and staging only. For production, invest the time in a proper ingress setup with TLS, rate limiting, and all the other features your users deserve. The add-on gets you moving fast when speed matters most - during the development cycle.
