# How to Set Up Istio on Red Hat OpenShift Service Mesh

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, OpenShift, Red Hat, Service Mesh, Kubernetes

Description: How to install and configure Istio-based service mesh on Red Hat OpenShift using the OpenShift Service Mesh operator.

---

Red Hat OpenShift has its own take on Istio called OpenShift Service Mesh (OSSM). It is based on the upstream Istio project but includes modifications for OpenShift's security model, multi-tenancy, and operator-based lifecycle management. If you are running OpenShift, using OSSM is the supported path, and it handles many OpenShift-specific quirks that a vanilla Istio installation would struggle with.

This guide covers how to install, configure, and use OpenShift Service Mesh.

## Understanding OpenShift Service Mesh

OSSM differs from upstream Istio in several important ways:

- It uses an **operator-based installation** instead of istioctl
- It supports **multi-tenant** mesh deployments (multiple isolated meshes in one cluster)
- It uses **Security Context Constraints (SCCs)** instead of PodSecurityPolicies
- The default configuration uses **NetworkPolicy-based isolation** for mesh members
- It requires explicit namespace membership via **ServiceMeshMemberRoll**

## Prerequisites

You need:
- OpenShift 4.12 or newer
- Cluster admin access
- The `oc` CLI installed

```bash
# Verify cluster access
oc whoami
oc version

# Check available nodes
oc get nodes
```

## Installing Required Operators

OSSM requires several operators. Install them in this order through the OpenShift web console or CLI.

**1. OpenShift Elasticsearch Operator** (for distributed tracing):

```yaml
apiVersion: operators.coreos.com/v1alpha1
kind: Subscription
metadata:
  name: elasticsearch-operator
  namespace: openshift-operators-redhat
spec:
  channel: stable
  installPlanApproval: Automatic
  name: elasticsearch-operator
  source: redhat-operators
  sourceNamespace: openshift-marketplace
```

**2. Red Hat OpenShift distributed tracing platform (Jaeger)**:

```yaml
apiVersion: operators.coreos.com/v1alpha1
kind: Subscription
metadata:
  name: jaeger-product
  namespace: openshift-distributed-tracing
spec:
  channel: stable
  installPlanApproval: Automatic
  name: jaeger-product
  source: redhat-operators
  sourceNamespace: openshift-marketplace
```

**3. Kiali Operator**:

```yaml
apiVersion: operators.coreos.com/v1alpha1
kind: Subscription
metadata:
  name: kiali-ossm
  namespace: openshift-operators
spec:
  channel: stable
  installPlanApproval: Automatic
  name: kiali-ossm
  source: redhat-operators
  sourceNamespace: openshift-marketplace
```

**4. Red Hat OpenShift Service Mesh Operator**:

```yaml
apiVersion: operators.coreos.com/v1alpha1
kind: Subscription
metadata:
  name: servicemeshoperator
  namespace: openshift-operators
spec:
  channel: stable
  installPlanApproval: Automatic
  name: servicemeshoperator
  source: redhat-operators
  sourceNamespace: openshift-marketplace
```

Apply these and wait for the operators to be ready:

```bash
oc apply -f operators/

# Wait for operators to install
oc get csv -n openshift-operators | grep -E "servicemesh|kiali|jaeger|elasticsearch"
```

## Creating the Service Mesh Control Plane

Create a namespace for the control plane:

```bash
oc new-project istio-system
```

Create the ServiceMeshControlPlane resource:

```yaml
apiVersion: maistra.io/v2
kind: ServiceMeshControlPlane
metadata:
  name: basic
  namespace: istio-system
spec:
  version: v2.5
  tracing:
    type: Jaeger
    sampling: 10000
  addons:
    jaeger:
      install:
        storage:
          type: Memory
    kiali:
      enabled: true
    grafana:
      enabled: true
    prometheus:
      enabled: true
  security:
    dataPlane:
      mtls: true
      automtls: true
    controlPlane:
      mtls: true
  gateways:
    ingress:
      service:
        type: ClusterIP
    openshiftRoute:
      enabled: true
  proxy:
    resources:
      requests:
        cpu: 100m
        memory: 128Mi
      limits:
        cpu: 500m
        memory: 256Mi
  runtime:
    defaults:
      container:
        resources:
          requests:
            cpu: 500m
            memory: 512Mi
          limits:
            cpu: 2000m
            memory: 2Gi
```

Apply it:

```bash
oc apply -f smcp.yaml
```

Watch the control plane come up:

```bash
oc get smcp -n istio-system -w
```

Wait until the status shows `ComponentsReady`. This can take several minutes.

```bash
# Verify all pods are running
oc get pods -n istio-system
```

## Adding Namespaces to the Mesh

Unlike upstream Istio where you label namespaces, OSSM uses a ServiceMeshMemberRoll to explicitly list which namespaces belong to the mesh:

```yaml
apiVersion: maistra.io/v1
kind: ServiceMeshMemberRoll
metadata:
  name: default
  namespace: istio-system
spec:
  members:
  - myapp
  - bookinfo
  - payment
```

Apply it:

```bash
oc apply -f smmr.yaml
```

Alternatively, individual namespaces can request membership:

```yaml
apiVersion: maistra.io/v1
kind: ServiceMeshMember
metadata:
  name: default
  namespace: myapp
spec:
  controlPlaneRef:
    name: basic
    namespace: istio-system
```

## Deploying an Application

Create a project and deploy an application:

```bash
oc new-project myapp

# The namespace is already in the member roll, so injection happens automatically
oc apply -n myapp -f - <<EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: httpbin
spec:
  replicas: 2
  selector:
    matchLabels:
      app: httpbin
  template:
    metadata:
      labels:
        app: httpbin
      annotations:
        sidecar.istio.io/inject: "true"
    spec:
      containers:
      - name: httpbin
        image: kennethreitz/httpbin
        ports:
        - containerPort: 80
---
apiVersion: v1
kind: Service
metadata:
  name: httpbin
spec:
  selector:
    app: httpbin
  ports:
  - port: 80
    targetPort: 80
EOF
```

Verify sidecar injection:

```bash
oc get pods -n myapp
# Should show 2/2 READY (app + sidecar)
```

## Configuring Routes and Gateways

OpenShift uses Routes instead of Ingress. OSSM can automatically create Routes for Istio Gateways when `openshiftRoute.enabled: true` is set.

Create a Gateway and VirtualService:

```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: myapp-gateway
  namespace: myapp
spec:
  selector:
    istio: ingressgateway
  servers:
  - port:
      number: 80
      name: http
      protocol: HTTP
    hosts:
    - myapp.apps.example.com
---
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: myapp-vs
  namespace: myapp
spec:
  hosts:
  - myapp.apps.example.com
  gateways:
  - myapp-gateway
  http:
  - route:
    - destination:
        host: httpbin
        port:
          number: 80
```

If automatic route creation is not enabled, create a Route manually:

```bash
oc expose svc istio-ingressgateway -n istio-system \
  --hostname=myapp.apps.example.com
```

For TLS:

```yaml
apiVersion: route.openshift.io/v1
kind: Route
metadata:
  name: myapp-tls
  namespace: istio-system
spec:
  host: myapp.apps.example.com
  to:
    kind: Service
    name: istio-ingressgateway
  port:
    targetPort: https
  tls:
    termination: passthrough
```

## Security Context Constraints

OpenShift uses SCCs instead of PodSecurityPolicies. OSSM creates the necessary SCCs during installation. Verify they exist:

```bash
oc get scc | grep -i istio
```

If you need to troubleshoot SCC issues:

```bash
# Check which SCC a pod is using
oc get pod -n myapp <pod-name> -o yaml | grep scc

# Check if a service account has the right SCC
oc adm policy who-can use scc anyuid -n myapp
```

## Configuring mTLS

Enable strict mTLS for the entire mesh:

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: default
  namespace: istio-system
spec:
  mtls:
    mode: STRICT
```

Verify mTLS is working:

```bash
oc exec deploy/httpbin -c istio-proxy -n myapp -- \
  pilot-agent request GET stats | grep ssl.handshake
```

## Authorization Policies

Apply authorization policies to restrict access:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: httpbin-policy
  namespace: myapp
spec:
  selector:
    matchLabels:
      app: httpbin
  action: ALLOW
  rules:
  - from:
    - source:
        principals:
        - "cluster.local/ns/myapp/sa/frontend"
    to:
    - operation:
        methods: ["GET"]
```

## Accessing Kiali

OSSM includes Kiali out of the box. Access it through the OpenShift console or directly:

```bash
# Get the Kiali route
oc get route kiali -n istio-system

# Or access via the OpenShift console under Networking > Routes
```

Kiali uses OpenShift authentication, so you log in with your OpenShift credentials.

## Upgrading the Service Mesh

To upgrade OSSM, update the version in the ServiceMeshControlPlane:

```yaml
apiVersion: maistra.io/v2
kind: ServiceMeshControlPlane
metadata:
  name: basic
  namespace: istio-system
spec:
  version: v2.6
```

The operator handles the rolling upgrade:

```bash
oc apply -f smcp-upgrade.yaml
oc get smcp -n istio-system -w
```

After the control plane upgrades, restart workloads to update sidecars:

```bash
oc rollout restart deployment -n myapp
```

## Multi-Tenant Mesh

One of OSSM's unique features is multi-tenancy. You can run multiple isolated meshes in the same cluster:

```yaml
# Second mesh control plane
apiVersion: maistra.io/v2
kind: ServiceMeshControlPlane
metadata:
  name: team-b-mesh
  namespace: team-b-istio-system
spec:
  version: v2.5
  security:
    dataPlane:
      mtls: true
```

Each mesh has its own member roll and is completely isolated from other meshes.

OpenShift Service Mesh provides a well-integrated, operator-managed Istio experience. The tradeoff is that you are tied to Red Hat's release cycle and their specific modifications. For most OpenShift users, this is the right choice because it handles the platform-specific details automatically and is fully supported by Red Hat.
