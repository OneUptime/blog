# How to Install Multiple Istio Control Planes in a Single Cluster

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Multi-Tenancy, Kubernetes, Control Plane, Service Mesh

Description: How to run multiple independent Istio control planes in a single Kubernetes cluster for multi-tenancy, canary upgrades, and team isolation.

---

Running multiple Istio control planes in a single cluster sounds unusual, but it solves some real problems. Maybe you need tenant isolation where different teams get their own mesh, or you want to canary test a new Istio version before rolling it out across the cluster. Istio supports this through revisions and revision tags.

## Use Cases for Multiple Control Planes

There are a few common scenarios:

1. **Canary upgrades**: Run the new Istio version alongside the old one, gradually migrating workloads
2. **Multi-tenancy**: Different teams or business units get independent mesh configurations
3. **Testing**: Run a development Istio version for testing without affecting production workloads
4. **Compliance**: Separate control planes for workloads with different compliance requirements

## Understanding Istio Revisions

Istio revisions are the mechanism that makes multiple control planes possible. Each installation gets a unique revision name, and namespaces opt into a specific revision through labels.

Without revisions, there is one global istiod and one webhook. With revisions, each istiod instance has its own webhook and only manages namespaces that reference its revision.

## Installing the First Control Plane (Stable)

Install the first Istio with a revision name:

```yaml
# istio-stable.yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  revision: stable
  meshConfig:
    accessLogFile: /dev/stdout
    defaultConfig:
      holdApplicationUntilProxyStarts: true
  components:
    ingressGateways:
      - name: istio-ingressgateway
        enabled: false
```

```bash
istioctl install -f istio-stable.yaml -y
```

This creates a deployment called `istiod-stable` in the `istio-system` namespace.

Verify:

```bash
kubectl get deploy -n istio-system
```

You should see:

```
NAME            READY   UP-TO-DATE   AVAILABLE
istiod-stable   1/1     1            1
```

## Installing the Second Control Plane (Canary)

Install a second version with a different revision:

```yaml
# istio-canary.yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  revision: canary
  meshConfig:
    accessLogFile: /dev/stdout
    defaultConfig:
      holdApplicationUntilProxyStarts: true
  components:
    ingressGateways:
      - name: istio-ingressgateway
        enabled: false
```

```bash
istioctl install -f istio-canary.yaml -y
```

Now you have two control planes:

```bash
kubectl get deploy -n istio-system
```

```
NAME            READY   UP-TO-DATE   AVAILABLE
istiod-stable   1/1     1            1
istiod-canary   1/1     1            1
```

## Using Helm for Multiple Control Planes

With Helm, install each revision separately:

```bash
# Install base CRDs (only once)
helm install istio-base istio/base -n istio-system --create-namespace

# Install stable revision
helm install istiod-stable istio/istiod -n istio-system \
  --set revision=stable \
  --set meshConfig.accessLogFile=/dev/stdout

# Install canary revision
helm install istiod-canary istio/istiod -n istio-system \
  --set revision=canary \
  --set meshConfig.accessLogFile=/dev/stdout
```

## Assigning Namespaces to Control Planes

Use the `istio.io/rev` label to assign namespaces to specific control planes:

```bash
# Assign to stable
kubectl create namespace app-stable
kubectl label namespace app-stable istio.io/rev=stable

# Assign to canary
kubectl create namespace app-canary
kubectl label namespace app-canary istio.io/rev=canary
```

Important: Do not use `istio-injection=enabled` with revisions. Use `istio.io/rev=<revision>` instead.

## Using Revision Tags

Revision tags add a layer of indirection. Instead of labeling namespaces with a specific revision, you label them with a tag that points to a revision. This makes it easy to switch what version a tag points to without relabeling namespaces.

Create tags:

```bash
# Create a "prod" tag pointing to "stable"
istioctl tag set prod --revision stable --overwrite

# Create a "test" tag pointing to "canary"
istioctl tag set test --revision canary --overwrite
```

Label namespaces with tags:

```bash
kubectl label namespace app-production istio.io/rev=prod
kubectl label namespace app-testing istio.io/rev=test
```

When you want to promote canary to production:

```bash
istioctl tag set prod --revision canary --overwrite
```

Now all namespaces labeled with `prod` will use the canary revision. Pods need to be restarted to pick up the change:

```bash
kubectl rollout restart deployment -n app-production
```

## Deploying Separate Gateways per Revision

Each control plane should have its own gateway:

```yaml
# values-gateway-stable.yaml
revision: stable
labels:
  istio: ingressgateway-stable
  istio.io/rev: stable
```

```yaml
# values-gateway-canary.yaml
revision: canary
labels:
  istio: ingressgateway-canary
  istio.io/rev: canary
```

```bash
kubectl create namespace istio-ingress-stable
kubectl label namespace istio-ingress-stable istio.io/rev=stable

kubectl create namespace istio-ingress-canary
kubectl label namespace istio-ingress-canary istio.io/rev=canary

helm install gateway-stable istio/gateway \
  -n istio-ingress-stable -f values-gateway-stable.yaml

helm install gateway-canary istio/gateway \
  -n istio-ingress-canary -f values-gateway-canary.yaml
```

## Verifying Control Plane Assignment

Check which control plane a namespace is using:

```bash
kubectl get namespace -L istio.io/rev
```

Check proxy status for each revision:

```bash
# Check stable
istioctl proxy-status --revision stable

# Check canary
istioctl proxy-status --revision canary
```

Verify a specific pod is connected to the right control plane:

```bash
kubectl exec -n app-stable deploy/my-app -c istio-proxy -- \
  pilot-agent request GET /server_info 2>/dev/null | grep -o '"version":"[^"]*"'
```

## Canary Upgrade Workflow

Here is the typical workflow for upgrading Istio using revisions:

```bash
# 1. Install the new version as a canary
istioctl install --set revision=1-24 -y

# 2. Tag test namespaces
istioctl tag set test --revision 1-24

# 3. Restart test workloads
kubectl rollout restart deployment -n test-namespace

# 4. Validate everything works
istioctl analyze -n test-namespace
istioctl proxy-status --revision 1-24

# 5. Move production tag to new version
istioctl tag set prod --revision 1-24

# 6. Restart production workloads
kubectl rollout restart deployment -n prod-namespace

# 7. Remove old control plane
istioctl uninstall --revision stable
```

## Resource Considerations

Each control plane consumes resources. A typical istiod instance needs:

- CPU: 500m request, 2 cores limit
- Memory: 2Gi request, 4Gi limit

Multiply that by the number of control planes. Monitor usage:

```bash
kubectl top pods -n istio-system
```

If you are running more than two or three control planes, consider increasing your cluster resources or using an external control plane model instead.

## Cleanup

Remove a specific revision:

```bash
# Remove the revision
istioctl uninstall --revision canary -y

# Remove the tag
istioctl tag remove test
```

List all revisions:

```bash
istioctl tag list
```

## Common Pitfalls

**Forgetting to restart pods**: After changing a revision tag or namespace label, pods keep using the old sidecar until they are restarted.

**Mixing istio-injection and istio.io/rev**: Never set both labels on the same namespace. The `istio-injection` label takes precedence and bypasses revision selection.

**CRD version conflicts**: Both control planes share CRDs. Make sure CRDs are compatible with all running revisions. Generally, newer CRDs are backward compatible.

**Webhook ordering**: Multiple webhooks can interfere with each other. Istio handles this through revision-aware selectors, but check if you see unexpected behavior.

Running multiple Istio control planes gives you a safe upgrade path and multi-tenancy options that a single installation cannot provide. Revision tags make the day-to-day management straightforward, and the small overhead of an extra istiod instance is a reasonable tradeoff for the flexibility you gain.
