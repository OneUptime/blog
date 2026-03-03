# How to Use Talos Linux with DigitalOcean Managed Load Balancers

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, DigitalOcean, Load Balancer, Kubernetes, Cloud

Description: Learn how to integrate DigitalOcean Managed Load Balancers with Talos Linux Kubernetes clusters for automatic traffic distribution.

---

DigitalOcean is a popular choice for teams that want cloud infrastructure without the complexity of the hyperscalers. Their managed load balancers integrate natively with Kubernetes through the DigitalOcean Cloud Controller Manager, and Talos Linux runs well on DigitalOcean Droplets. This guide covers setting up the integration so that creating a Kubernetes Service of type LoadBalancer automatically provisions a DigitalOcean Load Balancer.

## DigitalOcean and Talos Linux

DigitalOcean supports custom images, which means you can upload a Talos Linux image and use it to create Droplets. The Talos project also publishes images directly to DigitalOcean in some cases, making it even easier to get started.

The key integration point is the DigitalOcean Cloud Controller Manager (CCM). This component runs inside your cluster and watches for Services, Nodes, and other resources. When you create a LoadBalancer Service, the CCM calls the DigitalOcean API to create a managed load balancer and configure it to forward traffic to your nodes.

## Prerequisites

You need:

- A DigitalOcean account with API access
- A personal access token with read/write permissions
- `talosctl`, `kubectl`, and `doctl` installed
- A Talos Linux image uploaded to DigitalOcean (or use the published one)

## Uploading the Talos Image

If there is no pre-published Talos image for DigitalOcean, upload one:

```bash
# Download the Talos DigitalOcean image
curl -LO https://github.com/siderolabs/talos/releases/download/v1.7.0/digital-ocean-amd64.raw.gz

# Upload the image to DigitalOcean using the API
doctl compute image create talos-v1.7.0 \
  --image-url https://github.com/siderolabs/talos/releases/download/v1.7.0/digital-ocean-amd64.raw.gz \
  --region nyc1 \
  --image-description "Talos Linux v1.7.0"
```

Note the image ID that gets returned. You will need it when creating Droplets.

## Creating the Cluster Infrastructure

Generate your Talos configuration and create the Droplets:

```bash
# Generate Talos configuration
talosctl gen config do-cluster https://<load-balancer-ip>:6443 \
  --config-patch='[
    {"op": "add", "path": "/cluster/externalCloudProvider", "value": {"enabled": true}},
    {"op": "add", "path": "/machine/kubelet/extraArgs", "value": {
      "cloud-provider": "external"
    }}
  ]'

# Create control plane Droplets
for i in 1 2 3; do
  doctl compute droplet create talos-cp-$i \
    --image <talos-image-id> \
    --size s-4vcpu-8gb \
    --region nyc1 \
    --vpc-uuid <vpc-uuid> \
    --user-data-file controlplane.yaml \
    --tag-names talos-cp,kubernetes
done

# Create worker Droplets
for i in 1 2 3; do
  doctl compute droplet create talos-worker-$i \
    --image <talos-image-id> \
    --size s-4vcpu-8gb \
    --region nyc1 \
    --vpc-uuid <vpc-uuid> \
    --user-data-file worker.yaml \
    --tag-names talos-worker,kubernetes
done
```

## Deploying the DigitalOcean Cloud Controller Manager

First, create a Kubernetes secret with your DigitalOcean API token:

```bash
# Create the secret for the DO CCM
kubectl create secret generic digitalocean \
  --namespace kube-system \
  --from-literal=access-token=<your-do-api-token>
```

Then deploy the CCM:

```bash
# Deploy the DigitalOcean Cloud Controller Manager
kubectl apply -f https://raw.githubusercontent.com/digitalocean/digitalocean-cloud-controller-manager/master/releases/v0.1.47/manifest.yaml
```

Verify it is running:

```bash
# Check CCM pods
kubectl get pods -n kube-system -l app=digitalocean-cloud-controller-manager

# Check that nodes get initialized with provider IDs
kubectl get nodes -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.spec.providerID}{"\n"}{end}'
```

## Creating a Load Balancer Service

With the CCM running, create a Service of type LoadBalancer:

```yaml
# web-service.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web
spec:
  replicas: 3
  selector:
    matchLabels:
      app: web
  template:
    metadata:
      labels:
        app: web
    spec:
      containers:
        - name: nginx
          image: nginx:latest
          ports:
            - containerPort: 80
---
apiVersion: v1
kind: Service
metadata:
  name: web-lb
  annotations:
    # Configure the load balancer protocol
    service.beta.kubernetes.io/do-loadbalancer-protocol: "http"
    # Set the health check path
    service.beta.kubernetes.io/do-loadbalancer-healthcheck-path: "/"
    # Set the health check protocol
    service.beta.kubernetes.io/do-loadbalancer-healthcheck-protocol: "http"
spec:
  type: LoadBalancer
  selector:
    app: web
  ports:
    - port: 80
      targetPort: 80
```

```bash
# Apply and watch for the external IP
kubectl apply -f web-service.yaml
kubectl get svc web-lb --watch
```

Within a few minutes, the service will receive an external IP address corresponding to a DigitalOcean Load Balancer.

## TLS Termination

DigitalOcean Load Balancers can terminate TLS using certificates managed through the DigitalOcean console or API:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: web-https
  annotations:
    # Use HTTPS on the load balancer
    service.beta.kubernetes.io/do-loadbalancer-protocol: "https"
    # Specify the certificate ID from DigitalOcean
    service.beta.kubernetes.io/do-loadbalancer-certificate-id: "<certificate-id>"
    # Redirect HTTP to HTTPS
    service.beta.kubernetes.io/do-loadbalancer-redirect-http-to-https: "true"
    # Backend protocol (traffic from LB to nodes)
    service.beta.kubernetes.io/do-loadbalancer-tls-passthrough: "false"
spec:
  type: LoadBalancer
  selector:
    app: web
  ports:
    - name: https
      port: 443
      targetPort: 80
    - name: http
      port: 80
      targetPort: 80
```

Upload your certificate to DigitalOcean first:

```bash
# Upload a TLS certificate
doctl compute certificate create \
  --name my-cert \
  --private-key-path server.key \
  --leaf-certificate-path server.crt \
  --certificate-chain-path ca.crt
```

## Configuring Proxy Protocol

If your application needs the real client IP address, enable Proxy Protocol:

```yaml
annotations:
  service.beta.kubernetes.io/do-loadbalancer-enable-proxy-protocol: "true"
```

Your application or ingress controller must be configured to parse Proxy Protocol headers to extract the client IP.

## Sticky Sessions

For applications that need session affinity:

```yaml
annotations:
  service.beta.kubernetes.io/do-loadbalancer-sticky-sessions-type: "cookies"
  service.beta.kubernetes.io/do-loadbalancer-sticky-sessions-cookie-name: "DO-LB"
  service.beta.kubernetes.io/do-loadbalancer-sticky-sessions-cookie-ttl: "300"
```

## Load Balancer Sizing

DigitalOcean Load Balancers have a default size, but you can select a larger size for higher throughput:

```yaml
annotations:
  service.beta.kubernetes.io/do-loadbalancer-size-slug: "lb-medium"
```

Available sizes are `lb-small`, `lb-medium`, and `lb-large`, with increasing connection and throughput limits.

## Internal Load Balancers

DigitalOcean does not currently support internal (VPC-only) load balancers. All managed load balancers get a public IP. If you need internal-only load balancing, consider using an in-cluster solution like MetalLB or simply ClusterIP services with an ingress controller.

## Monitoring Load Balancer Health

Check the status of your load balancers:

```bash
# List all load balancers
doctl compute load-balancer list --format ID,Name,IP,Status

# Get detailed info about a specific load balancer
doctl compute load-balancer get <lb-id>
```

You can also see the load balancer status through the DigitalOcean console, which shows health check results and traffic metrics.

## Troubleshooting

If the load balancer is not being created, check the CCM logs:

```bash
# Check CCM logs for errors
kubectl logs -n kube-system -l app=digitalocean-cloud-controller-manager --tail=100
```

Common issues include invalid API tokens, Droplets not being tagged correctly, and firewall rules blocking health check traffic. Make sure your Droplets allow traffic on the NodePort range (30000-32767) from the load balancer health check IPs.

## Conclusion

DigitalOcean Managed Load Balancers work well with Talos Linux through the DigitalOcean Cloud Controller Manager. The integration is straightforward: deploy the CCM with your API token, and every LoadBalancer Service gets a real DigitalOcean Load Balancer. TLS termination, proxy protocol, and sticky sessions are all configurable through annotations. For teams that want simple, managed infrastructure without the complexity of the hyperscalers, this combination delivers a solid Kubernetes experience.
