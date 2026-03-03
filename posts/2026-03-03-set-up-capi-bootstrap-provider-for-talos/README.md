# How to Set Up CAPI Bootstrap Provider for Talos

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, CAPI, Bootstrap Provider, Kubernetes, CABPT

Description: A detailed guide to installing and configuring the CAPI Bootstrap Provider for Talos (CABPT) to generate machine configurations for CAPI-managed clusters.

---

The CAPI Bootstrap Provider for Talos, known as CABPT, is the component responsible for generating Talos machine configurations when Cluster API provisions new machines. Without it, CAPI would not know how to turn a bare VM into a functioning Talos Kubernetes node. This guide covers the installation, configuration, and customization of CABPT in detail.

## What the Bootstrap Provider Does

In Cluster API, the bootstrap provider is responsible for generating the data that turns a blank machine into a Kubernetes node. For traditional Linux distributions, this might be cloud-init scripts or ignition configs. For Talos Linux, the bootstrap data is a Talos machine configuration file.

When CAPI creates a new Machine resource, the following happens:

1. The infrastructure provider creates the VM
2. CABPT generates a Talos machine configuration based on the TalosConfig or TalosConfigTemplate resource
3. The configuration is stored as a Secret in the management cluster
4. The infrastructure provider passes this configuration to the VM as bootstrap data (user-data in cloud environments)
5. The Talos node boots, reads the configuration, and joins the cluster

CABPT handles generating the full configuration including cluster secrets, certificates, and any custom patches you have specified.

## Installing CABPT

The standard way to install CABPT is through `clusterctl`:

```bash
# Install CABPT along with other providers
clusterctl init --bootstrap talos --control-plane talos --infrastructure aws

# Verify CABPT is running
kubectl get pods -n cabpt-system
kubectl get deployment -n cabpt-system
```

For manual installation:

```bash
# Install CABPT from release manifests
CABPT_VERSION=v0.6.5
kubectl apply -f https://github.com/siderolabs/cluster-api-bootstrap-provider-talos/releases/download/${CABPT_VERSION}/bootstrap-components.yaml

# Verify the CRDs are installed
kubectl get crds | grep talos
# Should show:
# talosconfigs.bootstrap.cluster.x-k8s.io
# talosconfigtemplates.bootstrap.cluster.x-k8s.io

# Wait for the controller to be ready
kubectl wait --for=condition=Available --timeout=120s \
  deployment/cabpt-controller-manager -n cabpt-system
```

## CABPT Custom Resources

CABPT introduces two custom resource types:

### TalosConfig

A TalosConfig is a one-to-one mapping with a Machine. It defines the bootstrap configuration for a specific machine:

```yaml
apiVersion: bootstrap.cluster.x-k8s.io/v1alpha3
kind: TalosConfig
metadata:
  name: my-machine-bootstrap
  namespace: default
spec:
  generateType: controlplane  # or "worker", "init"
  talosVersion: v1.7.0
  configPatches:
    - op: add
      path: /machine/time
      value:
        servers:
          - time.google.com
    - op: add
      path: /machine/network/hostname
      value: cp-0
```

### TalosConfigTemplate

A TalosConfigTemplate is used by MachineDeployments to generate TalosConfigs for each machine in the deployment:

```yaml
apiVersion: bootstrap.cluster.x-k8s.io/v1alpha3
kind: TalosConfigTemplate
metadata:
  name: my-cluster-workers
  namespace: default
spec:
  template:
    spec:
      generateType: worker
      talosVersion: v1.7.0
      configPatches:
        - op: add
          path: /machine/kubelet/extraArgs
          value:
            max-pods: "250"
            cloud-provider: external
```

## The generateType Field

The `generateType` field tells CABPT what kind of Talos configuration to generate:

- **`controlplane`** - Generates a control plane configuration with etcd, API server, controller manager, and scheduler
- **`worker`** - Generates a worker configuration with kubelet only
- **`init`** - Generates a configuration for the first control plane node that bootstraps the cluster (typically handled automatically by CACPPT)

In most cases, you use `controlplane` for TalosControlPlane resources and `worker` for MachineDeployment bootstrap configs. The control plane provider handles the `init` type internally.

## Configuration Patches

Config patches are the primary way to customize the generated Talos configurations. They use JSON Patch (RFC 6902) syntax:

```yaml
spec:
  configPatches:
    # Add a new field
    - op: add
      path: /machine/time/servers
      value:
        - time.google.com
        - time.cloudflare.com

    # Replace an existing value
    - op: replace
      path: /machine/install/disk
      value: /dev/nvme0n1

    # Add kubelet extra arguments
    - op: add
      path: /machine/kubelet/extraArgs
      value:
        cloud-provider: external
        max-pods: "250"
        image-gc-high-threshold: "85"

    # Configure logging
    - op: add
      path: /machine/logging
      value:
        destinations:
          - endpoint: "tcp://logs.example.com:5044"
            format: json_lines

    # Add custom sysctls
    - op: add
      path: /machine/sysctls
      value:
        net.core.somaxconn: "65535"
        vm.max_map_count: "262144"
        fs.inotify.max_user_watches: "524288"

    # Configure network interfaces
    - op: add
      path: /machine/network/interfaces
      value:
        - interface: eth0
          dhcp: true
          mtu: 9000

    # Add cluster configuration
    - op: add
      path: /cluster/apiServer/extraArgs
      value:
        audit-log-maxage: "30"
        audit-log-maxbackup: "10"
        audit-log-maxsize: "100"
```

## Advanced Configuration

### Custom Talos Config from Existing File

If you have an existing Talos configuration file, you can use it as the base:

```yaml
apiVersion: bootstrap.cluster.x-k8s.io/v1alpha3
kind: TalosConfig
metadata:
  name: custom-config
spec:
  generateType: none  # Do not auto-generate
  talosVersion: v1.7.0
  data: |
    version: v1alpha1
    machine:
      type: controlplane
      install:
        disk: /dev/sda
        image: ghcr.io/siderolabs/installer:v1.7.0
      # ... full Talos config here
```

### Referencing Secrets in Patches

For sensitive values, reference Kubernetes secrets:

```yaml
apiVersion: bootstrap.cluster.x-k8s.io/v1alpha3
kind: TalosConfigTemplate
metadata:
  name: workers-with-registry
spec:
  template:
    spec:
      generateType: worker
      talosVersion: v1.7.0
      configPatches:
        - op: add
          path: /machine/registries/config
          value:
            registry.example.com:
              auth:
                username: "pull-user"
                password: "pull-password"
```

## Verifying Bootstrap Data Generation

After creating a TalosConfig, verify that CABPT generates the bootstrap data:

```bash
# Check the TalosConfig status
kubectl get talosconfig -o wide

# Check that the bootstrap data secret was created
kubectl get secrets -l cluster.x-k8s.io/cluster-name=my-cluster

# View the generated configuration (be careful - contains secrets)
kubectl get secret <machine-name>-bootstrap-data -o jsonpath='{.data.value}' | base64 -d | head -50
```

## Troubleshooting CABPT

If bootstrap data is not being generated:

```bash
# Check CABPT controller logs
kubectl logs -n cabpt-system deployment/cabpt-controller-manager -f

# Check the TalosConfig status for error messages
kubectl describe talosconfig <name>

# Verify the TalosConfig is owned by the correct Machine
kubectl get talosconfig <name> -o yaml | grep ownerReferences -A 5

# Check for events
kubectl get events --field-selector involvedObject.kind=TalosConfig
```

Common issues include invalid JSON patch operations, missing required fields in patches, version mismatches between the specified Talos version and the config schema, and the controller not having permission to create secrets.

## Upgrading CABPT

```bash
# Check current version
kubectl get deployment -n cabpt-system cabpt-controller-manager \
  -o jsonpath='{.spec.template.spec.containers[0].image}'

# Upgrade using clusterctl
clusterctl upgrade plan
clusterctl upgrade apply --bootstrap talos:v0.6.6

# Or upgrade manually
kubectl apply -f https://github.com/siderolabs/cluster-api-bootstrap-provider-talos/releases/download/v0.6.6/bootstrap-components.yaml
```

The CAPI Bootstrap Provider for Talos is a critical piece of the CAPI-Talos integration. Understanding how it generates configurations and how to customize them through patches gives you full control over the Talos settings on every node in your CAPI-managed clusters. Take the time to get your TalosConfigTemplates right, and every node that CAPI provisions will come up with exactly the configuration you need.
