# How to Download and Configure the Istio Release Bundle

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Kubernetes, Installation, Service Mesh, Configuration

Description: Complete guide to downloading the Istio release bundle, understanding its contents, and configuring it for your environment.

---

Before you can install Istio, you need to download the release bundle. This bundle contains the istioctl binary, sample configurations, Helm charts, and everything else you need for installation. Understanding what's in the bundle and how to configure it saves you time and avoids common mistakes.

## Downloading the Release

### Using the Official Script

The easiest method is the official download script:

```bash
curl -L https://istio.io/downloadIstio | sh -
```

This downloads the latest stable release for your operating system and architecture. The script detects whether you're on Linux or macOS (including Linux under WSL) and grabs the right binary.

### Specifying a Version

Pin a specific version instead of using latest:

```bash
curl -L https://istio.io/downloadIstio | ISTIO_VERSION=1.24.0 sh -
```

This is important for production environments where you want reproducible installations.

### Specifying Target Architecture

If you're downloading for a different architecture (like ARM):

```bash
curl -L https://istio.io/downloadIstio | ISTIO_VERSION=1.24.0 TARGET_ARCH=arm64 sh -
```

### Direct Download

If you prefer downloading directly without running a script, grab the tarball from GitHub:

```bash
# Linux amd64

wget https://github.com/istio/istio/releases/download/1.24.0/istio-1.24.0-linux-amd64.tar.gz
tar -xzf istio-1.24.0-linux-amd64.tar.gz

# macOS amd64
wget https://github.com/istio/istio/releases/download/1.24.0/istio-1.24.0-osx.tar.gz
tar -xzf istio-1.24.0-osx.tar.gz

# macOS arm64 (Apple Silicon)
wget https://github.com/istio/istio/releases/download/1.24.0/istio-1.24.0-osx-arm64.tar.gz
tar -xzf istio-1.24.0-osx-arm64.tar.gz
```

## What's Inside the Release Bundle

Once extracted, the directory structure looks like this:

```text
istio-1.24.0/
├── bin/
│   └── istioctl
├── manifests/
│   ├── charts/
│   │   ├── base/
│   │   ├── default/
│   │   ├── gateway/
│   │   ├── gateways/
│   │   ├── istio-cni/
│   │   ├── istio-control/
│   │   └── ztunnel/
│   └── profiles/
│       ├── ambient.yaml
│       ├── default.yaml
│       ├── demo.yaml
│       ├── empty.yaml
│       ├── minimal.yaml
│       ├── openshift-ambient.yaml
│       ├── openshift.yaml
│       ├── preview.yaml
│       ├── remote.yaml
│       └── stable.yaml
├── samples/
│   ├── addons/
│   │   ├── grafana.yaml
│   │   ├── jaeger.yaml
│   │   ├── kiali.yaml
│   │   ├── loki.yaml
│   │   └── prometheus.yaml
│   ├── bookinfo/
│   ├── curl/
│   ├── helloworld/
│   ├── httpbin/
│   └── sleep/
├── tools/
└── LICENSE
```

### The bin/ Directory

Contains the istioctl binary for your platform. This is the main CLI tool for installing, managing, and debugging Istio.

### The manifests/ Directory

Contains Helm charts and installation profiles. The `charts/` subdirectory has the Helm charts you'd use for Helm-based installation. The `profiles/` subdirectory has the predefined configuration profiles.

### The samples/ Directory

Contains sample applications and addon configurations. The most commonly used ones:

- **bookinfo/** - The classic Istio demo app with multiple microservices
- **addons/** - Prometheus, Grafana, Kiali, and Jaeger manifests
- **httpbin/** - A simple HTTP testing service
- **sleep/** - A minimal pod for testing outbound traffic

## Setting Up istioctl

After downloading, add istioctl to your PATH:

```bash
cd istio-1.24.0
export PATH=$PWD/bin:$PATH
```

For a permanent setup:

```bash
# Copy to a system-wide location
sudo cp bin/istioctl /usr/local/bin/

# Or add to your shell profile
echo 'export PATH="$HOME/istio-1.24.0/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc
```

Verify it works:

```bash
istioctl version
```

### Shell Completion

istioctl supports tab completion for bash and zsh:

```bash
# Bash
istioctl completion bash | sudo tee /etc/bash_completion.d/istioctl > /dev/null

# Zsh
istioctl completion zsh > "${fpath[1]}/_istioctl"
```

## Understanding Installation Profiles

The release bundle includes several predefined profiles. Each profile is a YAML file that specifies which components to install and how to configure them.

View the available profiles:

```bash
ls manifests/profiles | sed 's/\.yaml$//' | sort
```

Compare two profile files:

```bash
diff -u manifests/profiles/default.yaml manifests/profiles/demo.yaml
```

Render a profile to see the Kubernetes manifests it would apply:

```bash
istioctl manifest generate --set profile=default
```

This outputs the complete generated Kubernetes manifest for that profile. You can redirect it to a file for review or GitOps workflows:

```bash
istioctl manifest generate --set profile=default > generated-manifest.yaml
```

### Profile Summary

| Profile | istiod | Ingress GW | Egress GW | Use Case |
|---------|--------|------------|-----------|----------|
| default | Yes | Yes | No | Production |
| demo | Yes | Yes | Yes | Testing |
| minimal | Yes | No | No | Control plane only |
| empty | No | No | No | Base for custom |
| remote | No | No | No | Multi-cluster remote |

## Configuring Before Installation

You can create a custom configuration file that overrides any profile setting:

```yaml
# my-istio-config.yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  profile: default

  # Mesh-wide configuration
  meshConfig:
    accessLogFile: /dev/stdout
    accessLogFormat: |
      [%START_TIME%] "%REQ(:METHOD)% %REQ(X-ENVOY-ORIGINAL-PATH?:PATH)% %PROTOCOL%"
      %RESPONSE_CODE% %RESPONSE_FLAGS% %BYTES_RECEIVED% %BYTES_SENT%
      %DURATION% "%REQ(X-FORWARDED-FOR)%" "%REQ(USER-AGENT)%"
    enableTracing: true
    defaultConfig:
      holdApplicationUntilProxyStarts: true
      proxyMetadata:
        ISTIO_META_DNS_CAPTURE: "true"
        ISTIO_META_DNS_AUTO_ALLOCATE: "true"
    outboundTrafficPolicy:
      mode: REGISTRY_ONLY

  # Component-level configuration
  components:
    pilot:
      k8s:
        resources:
          requests:
            cpu: 200m
            memory: 256Mi
          limits:
            cpu: 1000m
            memory: 1Gi
        hpaSpec:
          minReplicas: 2
          maxReplicas: 5

    ingressGateways:
      - name: istio-ingressgateway
        enabled: true
        k8s:
          resources:
            requests:
              cpu: 100m
              memory: 128Mi

  # Values passed to Helm charts
  values:
    global:
      proxy:
        resources:
          requests:
            cpu: 50m
            memory: 64Mi
          limits:
            cpu: 500m
            memory: 256Mi
      logAsJson: true
```

Render your configuration before applying to catch configuration errors and inspect the generated manifest:

```bash
istioctl manifest generate -f my-istio-config.yaml > generated-manifest.yaml
```

Install with it:

```bash
istioctl install -f my-istio-config.yaml --verify -y
```

## Working with Multiple Configurations

For different environments (dev, staging, production), maintain separate configuration files:

```bash
istio-configs/
├── base.yaml          # Shared settings
├── dev.yaml           # Dev overrides
├── staging.yaml       # Staging overrides
└── production.yaml    # Production overrides
```

You can layer configurations by passing multiple files:

```bash
istioctl install -f base.yaml -f production.yaml -y
```

Later files override earlier ones.

## Verifying the Downloaded Bundle

Check the SHA256 checksum to verify the download integrity:

```bash
sha256sum istio-1.24.0-linux-amd64.tar.gz
```

Compare it with the checksum published on the Istio releases page.

## Air-Gapped Environments

For environments without internet access, you need to:

1. Download the release bundle on a machine with internet
2. Pull all required Docker images
3. Push images to your private registry
4. Configure Istio to use the private registry

List the images Istio needs:

```bash
istioctl manifest generate --set profile=default | grep "image:" | sort -u
```

Pull and retag them:

```bash
# Example for the pilot image
docker pull docker.io/istio/pilot:1.24.0
docker tag docker.io/istio/pilot:1.24.0 my-registry.example.com/istio/pilot:1.24.0
docker push my-registry.example.com/istio/pilot:1.24.0
```

Then install with the custom hub:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  hub: my-registry.example.com/istio
  tag: 1.24.0
```

## Keeping the Bundle Updated

Subscribe to Istio release notifications on GitHub to know when new versions are available. For automated environments, you can script the download and verification:

```bash
#!/bin/bash
VERSION="1.24.0"
OS=$(uname -s | tr '[:upper:]' '[:lower:]')
ARCH=$(uname -m)

if [ "$OS" = "darwin" ]; then
  OS="osx"
fi

case "$ARCH" in
  x86_64|amd64)
    ARCH="amd64"
    ;;
  arm64|aarch64)
    ARCH="arm64"
    ;;
esac

if [ "$OS" = "osx" ] && [ "$ARCH" = "amd64" ]; then
  URL="https://github.com/istio/istio/releases/download/${VERSION}/istio-${VERSION}-${OS}.tar.gz"
else
  URL="https://github.com/istio/istio/releases/download/${VERSION}/istio-${VERSION}-${OS}-${ARCH}.tar.gz"
fi

curl -L "$URL" -o "istio-${VERSION}.tar.gz"
tar -xzf "istio-${VERSION}.tar.gz"
```

Understanding the Istio release bundle is the foundation for everything else you do with Istio. Whether you're installing with istioctl, Helm, or a GitOps tool, the bundle contents and configuration options are the same. Take the time to explore the profiles and samples - they're well-documented and provide solid starting points for any deployment scenario.
