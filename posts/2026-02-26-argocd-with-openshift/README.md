# How to Use ArgoCD with OpenShift

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, OpenShift, Red Hat

Description: Learn how to deploy and configure ArgoCD on Red Hat OpenShift, including Security Context Constraints, Routes, OpenShift GitOps operator, and RBAC integration.

---

Red Hat OpenShift adds enterprise features on top of Kubernetes - stricter security defaults, built-in CI/CD, a container registry, Routes (instead of Ingress), and Security Context Constraints (SCCs). Running ArgoCD on OpenShift requires understanding these differences. OpenShift even provides its own GitOps operator based on ArgoCD, giving you two paths to choose from.

## Two Paths: OpenShift GitOps Operator vs Upstream ArgoCD

### Path 1: OpenShift GitOps Operator (Recommended)

Red Hat packages ArgoCD as the OpenShift GitOps operator. It is supported by Red Hat, integrates with OpenShift's authentication, and handles SCCs automatically.

```bash
# Install OpenShift GitOps operator via the CLI
oc apply -f - <<EOF
apiVersion: operators.coreos.com/v1alpha1
kind: Subscription
metadata:
  name: openshift-gitops-operator
  namespace: openshift-operators
spec:
  channel: latest
  installPlanApproval: Automatic
  name: openshift-gitops-operator
  source: redhat-operators
  sourceNamespace: openshift-marketplace
EOF

# Wait for the operator to be ready
oc wait --for=condition=Ready pods -l control-plane=gitops-operator -n openshift-operators --timeout=300s

# The operator creates an ArgoCD instance in openshift-gitops namespace
oc get pods -n openshift-gitops
```

### Path 2: Upstream ArgoCD

If you need the latest ArgoCD features or want to avoid the operator, install upstream ArgoCD with OpenShift-specific adjustments.

```bash
# Create the namespace
oc new-project argocd

# Install ArgoCD
oc apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
```

## Handling Security Context Constraints

OpenShift uses SCCs instead of Pod Security Standards. ArgoCD pods need the right SCC to run.

```bash
# Check which SCCs ArgoCD pods are using
oc get pods -n openshift-gitops -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.metadata.annotations.openshift\.io/scc}{"\n"}{end}'
```

If using upstream ArgoCD, you may need to grant SCCs to the service accounts.

```bash
# Grant the anyuid SCC to ArgoCD service accounts (if needed)
oc adm policy add-scc-to-user anyuid -z argocd-application-controller -n argocd
oc adm policy add-scc-to-user anyuid -z argocd-server -n argocd
oc adm policy add-scc-to-user anyuid -z argocd-dex-server -n argocd
oc adm policy add-scc-to-user anyuid -z argocd-redis -n argocd
oc adm policy add-scc-to-user anyuid -z argocd-repo-server -n argocd
```

For a more secure approach, create a custom SCC specifically for ArgoCD.

```yaml
# argocd-scc.yaml
apiVersion: security.openshift.io/v1
kind: SecurityContextConstraints
metadata:
  name: argocd-scc
allowPrivilegedContainer: false
allowHostDirVolumePlugin: false
allowHostIPC: false
allowHostNetwork: false
allowHostPID: false
allowHostPorts: false
runAsUser:
  type: MustRunAsRange
seLinuxContext:
  type: MustRunAs
fsGroup:
  type: MustRunAs
supplementalGroups:
  type: RunAsAny
volumes:
  - configMap
  - downwardAPI
  - emptyDir
  - persistentVolumeClaim
  - projected
  - secret
users:
  - system:serviceaccount:argocd:argocd-application-controller
  - system:serviceaccount:argocd:argocd-server
  - system:serviceaccount:argocd:argocd-repo-server
  - system:serviceaccount:argocd:argocd-dex-server
  - system:serviceaccount:argocd:argocd-redis
```

## Exposing ArgoCD with OpenShift Routes

OpenShift uses Routes instead of Ingress (though Ingress is supported too). Routes integrate with the built-in HAProxy router.

```yaml
# ArgoCD Route with TLS passthrough
apiVersion: route.openshift.io/v1
kind: Route
metadata:
  name: argocd-server
  namespace: openshift-gitops
spec:
  host: argocd.apps.cluster.example.com
  port:
    targetPort: https
  tls:
    termination: passthrough
    insecureEdgeTerminationPolicy: Redirect
  to:
    kind: Service
    name: openshift-gitops-server
    weight: 100
  wildcardPolicy: None
```

If you prefer TLS termination at the Route level, configure ArgoCD to run in insecure mode.

```yaml
# ArgoCD CR with insecure mode for Route TLS termination
apiVersion: argoproj.io/v1beta1
kind: ArgoCD
metadata:
  name: openshift-gitops
  namespace: openshift-gitops
spec:
  server:
    insecure: true
    route:
      enabled: true
      tls:
        termination: edge
        insecureEdgeTerminationPolicy: Redirect
```

## Integrating with OpenShift OAuth

OpenShift has built-in OAuth. Configure ArgoCD to use it for authentication.

```yaml
# ArgoCD CR with OpenShift OAuth integration
apiVersion: argoproj.io/v1beta1
kind: ArgoCD
metadata:
  name: openshift-gitops
  namespace: openshift-gitops
spec:
  dex:
    openShiftOAuth: true
  rbac:
    defaultPolicy: 'role:readonly'
    policy: |
      # Map OpenShift groups to ArgoCD roles
      g, cluster-admins, role:admin
      g, developers, role:readonly
    scopes: '[groups]'
```

With OpenShift OAuth enabled, users log in using their OpenShift credentials.

```bash
# Verify Dex is configured for OpenShift OAuth
oc get cm argocd-cm -n openshift-gitops -o yaml | grep -A10 dex.config
```

## Managing OpenShift-Specific Resources

OpenShift has custom resources that ArgoCD needs to handle - DeploymentConfigs, Routes, BuildConfigs, ImageStreams, and more.

### Custom Health Checks for OpenShift Resources

```yaml
# argocd-cm ConfigMap - custom health checks for OpenShift
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: openshift-gitops
data:
  # Health check for DeploymentConfig
  resource.customizations.health.apps.openshift.io_DeploymentConfig: |
    hs = {}
    if obj.status ~= nil then
      if obj.status.availableReplicas ~= nil and obj.status.availableReplicas > 0 then
        hs.status = "Healthy"
        hs.message = "DeploymentConfig is available"
      elseif obj.status.conditions ~= nil then
        for i, condition in ipairs(obj.status.conditions) do
          if condition.type == "Progressing" and condition.status == "False" then
            hs.status = "Degraded"
            hs.message = condition.message
          end
        end
      end
    end
    if hs.status == nil then
      hs.status = "Progressing"
      hs.message = "Waiting for DeploymentConfig to be available"
    end
    return hs

  # Health check for Route
  resource.customizations.health.route.openshift.io_Route: |
    hs = {}
    if obj.status ~= nil and obj.status.ingress ~= nil then
      for i, ingress in ipairs(obj.status.ingress) do
        if ingress.conditions ~= nil then
          for j, condition in ipairs(ingress.conditions) do
            if condition.type == "Admitted" and condition.status == "True" then
              hs.status = "Healthy"
              hs.message = "Route admitted"
              return hs
            end
          end
        end
      end
    end
    hs.status = "Progressing"
    hs.message = "Waiting for Route to be admitted"
    return hs
```

### Ignoring OpenShift-Managed Fields

OpenShift controllers modify certain fields that create noise in ArgoCD diffs.

```yaml
# Ignore differences for OpenShift-managed fields
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: openshift-gitops
data:
  resource.customizations.ignoreDifferences.apps.openshift.io_DeploymentConfig: |
    jsonPointers:
      - /spec/template/metadata/annotations/openshift.io~1generated-by
    jqPathExpressions:
      - .spec.triggers
  resource.customizations.ignoreDifferences.route.openshift.io_Route: |
    jsonPointers:
      - /status/ingress
```

## Project-Level Permissions

OpenShift projects map to Kubernetes namespaces with additional metadata. Configure ArgoCD projects to align with OpenShift project boundaries.

```yaml
# ArgoCD AppProject for a team's OpenShift projects
apiVersion: argoproj.io/v1alpha1
kind: AppProject
metadata:
  name: team-alpha
  namespace: openshift-gitops
spec:
  description: Team Alpha's applications
  sourceRepos:
    - 'https://github.com/team-alpha/*'
  destinations:
    # Restrict to team-alpha's OpenShift projects
    - namespace: 'team-alpha-*'
      server: https://kubernetes.default.svc
  clusterResourceWhitelist:
    - group: ''
      kind: Namespace
  namespaceResourceWhitelist:
    - group: '*'
      kind: '*'
  roles:
    - name: developers
      description: Team Alpha developers
      policies:
        - p, proj:team-alpha:developers, applications, get, team-alpha/*, allow
        - p, proj:team-alpha:developers, applications, sync, team-alpha/*, allow
```

## Handling OpenShift Image Streams

If your applications use OpenShift ImageStreams, ArgoCD needs to understand how to track image changes.

```yaml
# Application that deploys using an ImageStream
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-app
  namespace: openshift-gitops
spec:
  project: default
  source:
    repoURL: https://github.com/org/my-app.git
    targetRevision: main
    path: openshift
  destination:
    server: https://kubernetes.default.svc
    namespace: my-app
  ignoreDifferences:
    # ImageStream tags are updated by the registry
    - group: image.openshift.io
      kind: ImageStream
      jsonPointers:
        - /spec/tags
```

## Cluster-Scoped Resource Management

OpenShift restricts who can manage cluster-scoped resources. The default ArgoCD instance from the GitOps operator can only manage resources in its own namespace. To manage cluster-scoped resources, grant additional permissions.

```bash
# Grant the ArgoCD controller cluster-admin (use carefully)
oc adm policy add-cluster-role-to-user cluster-admin \
  system:serviceaccount:openshift-gitops:openshift-gitops-argocd-application-controller
```

For a more granular approach, create a custom ClusterRole.

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: argocd-cluster-resources
rules:
  - apiGroups: [""]
    resources: ["namespaces"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
  - apiGroups: ["rbac.authorization.k8s.io"]
    resources: ["clusterroles", "clusterrolebindings"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: argocd-cluster-resources
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: argocd-cluster-resources
subjects:
  - kind: ServiceAccount
    name: openshift-gitops-argocd-application-controller
    namespace: openshift-gitops
```

## Summary

ArgoCD on OpenShift works best through the OpenShift GitOps operator, which handles SCCs, OAuth integration, and Routes automatically. If you need upstream ArgoCD, you will need to manually configure SCCs, create Routes for access, and set up Dex for OpenShift OAuth. Either way, add custom health checks for OpenShift-specific resources like DeploymentConfigs and Routes, configure `ignoreDifferences` for OpenShift-managed fields, and align ArgoCD projects with OpenShift project boundaries for a clean RBAC model.
