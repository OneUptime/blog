# How to Install Flux CD on OpenShift

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, OpenShift, Red Hat, Enterprise Kubernetes, DevOps

Description: A detailed guide to installing Flux CD on Red Hat OpenShift, covering security context constraints, namespace configuration, and enterprise considerations.

---

Red Hat OpenShift is an enterprise Kubernetes platform with stricter security defaults than standard Kubernetes. Installing Flux CD on OpenShift requires some additional configuration to work within OpenShift's Security Context Constraints (SCCs) and networking model. This guide covers the complete process, from preparing the cluster to verifying a working GitOps pipeline.

## Prerequisites

- An OpenShift 4.x cluster (tested on OpenShift 4.12+)
- `oc` CLI installed and authenticated to your cluster
- `kubectl` CLI installed (OpenShift includes this, but the standalone version works too)
- A GitHub personal access token with `repo` permissions
- Cluster admin privileges

## Step 1: Verify Cluster Access

Confirm you can access the OpenShift cluster and have the necessary permissions.

```bash
# Verify OpenShift CLI access
oc whoami

# Check cluster version
oc version

# Confirm cluster-admin privileges
oc auth can-i create clusterroles
```

## Step 2: Install the Flux CLI

Install the Flux CLI on your workstation.

```bash
# Install Flux CLI using the official script
curl -s https://fluxcd.io/install.sh | sudo bash

# Verify the installation
flux --version
```

## Step 3: Run Pre-Flight Checks

Run the Flux pre-flight checks to validate OpenShift compatibility.

```bash
# Run Flux pre-flight validation
flux check --pre
```

The checks should pass on a properly configured OpenShift 4.x cluster. If you see warnings about Kubernetes version compatibility, ensure your OpenShift version maps to a supported Kubernetes version (OpenShift 4.12 uses Kubernetes 1.25, OpenShift 4.13 uses 1.26, etc.).

## Step 4: Create the Flux System Namespace

On OpenShift, it is best practice to create the namespace manually and configure the appropriate SCCs before bootstrapping.

```bash
# Create the flux-system namespace
oc create namespace flux-system
```

## Step 5: Configure Security Context Constraints

OpenShift uses SCCs instead of Pod Security Standards. Flux controllers need the `nonroot-v2` or `restricted-v2` SCC. On OpenShift 4.11+, the `restricted-v2` SCC is the default and works with Flux controllers out of the box. However, if you encounter permission issues, you can explicitly grant the necessary SCC.

```bash
# Grant the restricted SCC to the Flux service accounts
# This is typically not needed on OpenShift 4.11+ but included for completeness
oc adm policy add-scc-to-user nonroot-v2 \
  system:serviceaccount:flux-system:source-controller \
  system:serviceaccount:flux-system:kustomize-controller \
  system:serviceaccount:flux-system:helm-controller \
  system:serviceaccount:flux-system:notification-controller
```

## Step 6: Set GitHub Credentials

Export your GitHub credentials for the bootstrap process.

```bash
# Export GitHub credentials
export GITHUB_TOKEN=<your-github-personal-access-token>
export GITHUB_USER=<your-github-username>
```

## Step 7: Bootstrap Flux CD with OpenShift Patches

OpenShift requires that containers run as non-root with specific security contexts. Flux CD respects this by default, but you should bootstrap with explicit patches to ensure compatibility.

Create a directory for your bootstrap patches.

```bash
# Create a patches directory locally
mkdir -p flux-patches
```

Create a patch file that ensures Flux controllers comply with OpenShift security requirements.

```yaml
# flux-patches/patch-security-context.yaml
# Patch to ensure Flux controllers comply with OpenShift SCCs
apiVersion: apps/v1
kind: Deployment
metadata:
  name: all
spec:
  template:
    spec:
      securityContext:
        runAsNonRoot: true
        seccompProfile:
          type: RuntimeDefault
      containers:
        - name: manager
          securityContext:
            allowPrivilegeEscalation: false
            capabilities:
              drop:
                - ALL
```

Now bootstrap Flux CD with the patches.

```bash
# Bootstrap Flux CD on OpenShift with security patches
flux bootstrap github \
  --owner=$GITHUB_USER \
  --repository=fleet-infra \
  --branch=main \
  --path=./clusters/openshift-cluster \
  --personal \
  --components-extra=image-reflector-controller,image-automation-controller
```

If the default security contexts already satisfy your OpenShift SCCs (which they should on modern Flux versions), the bootstrap command works without extra patches.

## Step 8: Verify the Installation

Check that all Flux controllers are running.

```bash
# List Flux pods on OpenShift
oc get pods -n flux-system

# Run the Flux health check
flux check
```

If any pods are in `CrashLoopBackOff` or `CreateContainerConfigError`, check the SCC assignments.

```bash
# Debug SCC issues by checking pod events
oc describe pod -n flux-system -l app=source-controller

# Verify which SCC is being used by the pods
oc get pods -n flux-system -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.metadata.annotations.openshift\.io/scc}{"\n"}{end}'
```

## Step 9: Configure OpenShift Routes for Webhooks

If you want to use Flux webhook receivers (for push-based reconciliation), you need to create an OpenShift Route instead of a standard Ingress.

```yaml
# webhook-route.yaml
# Expose the Flux webhook receiver via an OpenShift Route
apiVersion: route.openshift.io/v1
kind: Route
metadata:
  name: flux-webhook
  namespace: flux-system
spec:
  host: flux-webhook.apps.your-cluster-domain.com
  to:
    kind: Service
    name: webhook-receiver
    weight: 100
  port:
    targetPort: http-webhook
  tls:
    termination: edge
    insecureEdgeTerminationPolicy: Redirect
```

## Step 10: Deploy a Sample Application

Test the GitOps workflow with a sample deployment. Add these files to your `fleet-infra` repository.

```yaml
# clusters/openshift-cluster/podinfo-source.yaml
# Source definition for the podinfo sample application
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: podinfo
  namespace: flux-system
spec:
  interval: 5m
  url: https://github.com/stefanprodan/podinfo
  ref:
    branch: master
```

```yaml
# clusters/openshift-cluster/podinfo-kustomization.yaml
# Kustomization to deploy podinfo on OpenShift
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: podinfo
  namespace: flux-system
spec:
  interval: 10m
  targetNamespace: default
  sourceRef:
    kind: GitRepository
    name: podinfo
  path: ./kustomize
  prune: true
  timeout: 2m
```

Commit and push, then verify the deployment.

```bash
# Check reconciliation status
flux get kustomizations

# Verify the pods are running
oc get pods -n default -l app=podinfo
```

## OpenShift-Specific Considerations

- **Network policies**: OpenShift may enforce network policies by default. Ensure the `flux-system` namespace can reach the Kubernetes API server and your Git provider. If using OpenShift SDN or OVN-Kubernetes, check that egress is not blocked.
- **Image registry**: OpenShift has a built-in container registry. You can configure Flux image automation to scan and update images from the OpenShift internal registry at `image-registry.openshift-image-registry.svc:5000`.
- **Operator Hub**: While OpenShift has an Operator Hub with a Flux operator, the CLI bootstrap method described here gives you more control and is the officially recommended approach by the Flux project.
- **RBAC**: OpenShift extends Kubernetes RBAC with additional roles and cluster roles. The Flux bootstrap process creates all necessary RBAC resources, but if you have custom RBAC policies, verify they do not conflict.
- **Monitoring**: OpenShift includes Prometheus-based monitoring. Flux controllers expose Prometheus metrics that you can scrape by creating `ServiceMonitor` resources in the `flux-system` namespace.

## Uninstalling Flux CD

To remove Flux from OpenShift, use the uninstall command.

```bash
# Remove Flux components from OpenShift
flux uninstall --silent

# Clean up the SCC assignments if you added them manually
oc adm policy remove-scc-from-user nonroot-v2 \
  system:serviceaccount:flux-system:source-controller \
  system:serviceaccount:flux-system:kustomize-controller \
  system:serviceaccount:flux-system:helm-controller \
  system:serviceaccount:flux-system:notification-controller
```

## Conclusion

Installing Flux CD on OpenShift requires awareness of OpenShift's security model, but modern versions of both Flux and OpenShift are highly compatible. The key considerations are SCC compliance, Route configuration for webhooks, and network policy awareness. Once installed, Flux CD provides the same powerful GitOps capabilities on OpenShift as on any other Kubernetes distribution, enabling you to manage your enterprise platform entirely through Git.
