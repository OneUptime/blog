# How to Install Istio Behind a Corporate Proxy

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Proxy, Corporate Network, Kubernetes, Service Mesh

Description: How to install and configure Istio when your Kubernetes cluster sits behind a corporate HTTP proxy with restricted internet access.

---

If your Kubernetes cluster runs behind a corporate proxy, installing Istio has some extra friction. The Istio control plane, sidecar proxies, and various components need to pull container images and sometimes reach external endpoints. When a proxy sits between your cluster and the internet, you need to configure things properly or nothing works.

## Understanding the Problem

Behind a corporate proxy, several things break:

1. **Image pulls** - Container runtime cannot pull images from Docker Hub, GCR, or other registries
2. **istioctl downloads** - The CLI tool needs to download from GitHub releases
3. **Sidecar configuration** - Envoy proxies might need to reach external services through the corporate proxy
4. **Helm chart downloads** - Helm needs to reach the Istio chart repository

## Step 1: Configure Container Runtime Proxy

Your container runtime (containerd, CRI-O) needs proxy settings to pull images. On each node:

For containerd, create or edit `/etc/systemd/system/containerd.service.d/http-proxy.conf`:

```ini
[Service]
Environment="HTTP_PROXY=http://proxy.corp.example.com:8080"
Environment="HTTPS_PROXY=http://proxy.corp.example.com:8080"
Environment="NO_PROXY=10.0.0.0/8,172.16.0.0/12,192.168.0.0/16,localhost,127.0.0.1,.svc,.cluster.local,.corp.example.com"
```

```bash
sudo systemctl daemon-reload
sudo systemctl restart containerd
```

The `NO_PROXY` setting is critical. It should include:

- Pod and service CIDRs
- Node network ranges
- Kubernetes internal domains (`.svc`, `.cluster.local`)
- Your internal corporate domains

## Step 2: Install istioctl Through the Proxy

Download `istioctl` using the proxy:

```bash
export HTTP_PROXY=http://proxy.corp.example.com:8080
export HTTPS_PROXY=http://proxy.corp.example.com:8080
export NO_PROXY=localhost,127.0.0.1

curl -L https://istio.io/downloadIstio | sh -
```

Or download manually and copy:

```bash
# On a machine with internet access
wget https://github.com/istio/istio/releases/download/1.24.0/istioctl-1.24.0-linux-amd64.tar.gz

# Copy to your corporate network
scp istioctl-1.24.0-linux-amd64.tar.gz user@jump-host:/tmp/
```

## Step 3: Mirror Container Images (Recommended)

The most reliable approach behind a corporate proxy is to mirror Istio images to an internal registry:

```bash
# List of Istio images to mirror
ISTIO_VERSION=1.24.0
IMAGES=(
  "docker.io/istio/pilot:${ISTIO_VERSION}"
  "docker.io/istio/proxyv2:${ISTIO_VERSION}"
  "docker.io/istio/install-cni:${ISTIO_VERSION}"
)

INTERNAL_REGISTRY=registry.corp.example.com/istio

for img in "${IMAGES[@]}"; do
  # Pull through proxy
  docker pull ${img}

  # Tag for internal registry
  new_tag="${INTERNAL_REGISTRY}/$(echo ${img} | cut -d'/' -f3)"
  docker tag ${img} ${new_tag}

  # Push to internal registry
  docker push ${new_tag}
done
```

Then install Istio pointing to your internal registry:

```yaml
# istio-internal-registry.yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  hub: registry.corp.example.com/istio
  tag: 1.24.0
  meshConfig:
    accessLogFile: /dev/stdout
```

```bash
istioctl install -f istio-internal-registry.yaml -y
```

With Helm:

```bash
helm install istiod istio/istiod -n istio-system \
  --set global.hub=registry.corp.example.com/istio \
  --set global.tag=1.24.0
```

## Step 4: Configure Helm to Use the Proxy

If you are downloading charts from the Istio Helm repository through the proxy:

```bash
export HTTP_PROXY=http://proxy.corp.example.com:8080
export HTTPS_PROXY=http://proxy.corp.example.com:8080

helm repo add istio https://istio-release.storage.googleapis.com/charts
helm repo update
```

Or download the charts once and store them in an internal chart repository:

```bash
# Download charts
helm pull istio/base --version 1.24.0
helm pull istio/istiod --version 1.24.0
helm pull istio/gateway --version 1.24.0

# Push to internal ChartMuseum or similar
curl --data-binary "@base-1.24.0.tgz" http://chartmuseum.corp.example.com/api/charts
```

## Step 5: Configure Envoy Proxy for External Services

If your mesh services need to call external APIs through the corporate proxy, you have two options.

### Option A: ServiceEntry with Corporate Proxy

Route external traffic through the corporate proxy using Envoy's HTTP CONNECT:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: corporate-proxy
  namespace: istio-system
spec:
  hosts:
    - proxy.corp.example.com
  ports:
    - number: 8080
      name: tcp
      protocol: TCP
  location: MESH_EXTERNAL
  resolution: DNS
---
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: external-api
  namespace: my-app
spec:
  hosts:
    - api.external-service.com
  ports:
    - number: 443
      name: https
      protocol: HTTPS
  location: MESH_EXTERNAL
  resolution: DNS
```

### Option B: Set Proxy Environment Variables on Sidecars

You can set HTTP_PROXY on the Envoy sidecar containers:

```yaml
meshConfig:
  defaultConfig:
    proxyMetadata:
      HTTP_PROXY: "http://proxy.corp.example.com:8080"
      HTTPS_PROXY: "http://proxy.corp.example.com:8080"
      NO_PROXY: "10.0.0.0/8,172.16.0.0/12,192.168.0.0/16,.svc,.cluster.local,.corp.example.com"
```

Be careful with this approach. These environment variables affect all outbound traffic from the sidecar. Make sure `NO_PROXY` covers all your internal services.

## Step 6: Handle TLS Inspection

Many corporate proxies perform TLS inspection (MITM). If your proxy does this, the proxy's CA certificate needs to be trusted by:

1. **The container runtime** - For image pulls
2. **istioctl** - For connecting to the API server
3. **istiod** - For any external connections

Add the corporate CA to the istiod deployment:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  components:
    pilot:
      k8s:
        env:
          - name: SSL_CERT_FILE
            value: /etc/corporate-certs/ca.crt
        volumes:
          - name: corporate-certs
            configMap:
              name: corporate-ca
        volumeMounts:
          - name: corporate-certs
            mountPath: /etc/corporate-certs
            readOnly: true
```

Create the ConfigMap with your corporate CA:

```bash
kubectl create configmap corporate-ca \
  -n istio-system \
  --from-file=ca.crt=/path/to/corporate-ca.crt
```

## Step 7: Configure Egress Gateway for Controlled External Access

In a corporate environment, you might want all external traffic to go through a single egress point:

```yaml
# Install egress gateway
# values-egress.yaml
service:
  type: ClusterIP

resources:
  requests:
    cpu: 100m
    memory: 128Mi
```

```bash
kubectl create namespace istio-egress
kubectl label namespace istio-egress istio-injection=enabled
helm install istio-egress istio/gateway -n istio-egress -f values-egress.yaml
```

Route traffic through the egress gateway:

```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: egress-gateway
  namespace: istio-egress
spec:
  selector:
    istio: egressgateway
  servers:
    - port:
        number: 443
        name: https
        protocol: HTTPS
      hosts:
        - "*.external-service.com"
      tls:
        mode: PASSTHROUGH
```

## Troubleshooting

**Image pull failures**: Check that the container runtime has the proxy configured and the NO_PROXY list does not accidentally exclude your registry.

```bash
kubectl describe pod -n istio-system -l app=istiod | grep -A 5 "Events"
```

**istioctl cannot reach the cluster**: Set KUBECONFIG and proxy variables:

```bash
export HTTPS_PROXY=http://proxy.corp.example.com:8080
export NO_PROXY=kubernetes.default.svc,10.0.0.0/8
istioctl version
```

**Sidecar cannot reach istiod**: Make sure the proxy NO_PROXY includes the Kubernetes service CIDR:

```bash
kubectl exec -n my-app deploy/my-app -c istio-proxy -- env | grep -i proxy
```

## Wrapping Up

Installing Istio behind a corporate proxy is mainly about making sure every component can reach the images and endpoints it needs. Mirror images to an internal registry for reliability, set the right NO_PROXY exclusions for internal traffic, and handle TLS inspection if your proxy does MITM. Once these pieces are in place, Istio works the same as it would on an unrestricted network.
