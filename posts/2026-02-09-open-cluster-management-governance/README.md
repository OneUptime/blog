# How to Set Up Open Cluster Management (OCM) for Multi-Cluster Governance

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Multi-Cluster, Governance, Open Cluster Management, Compliance

Description: Learn how to implement Open Cluster Management for centralized governance, policy enforcement, and lifecycle management across multiple Kubernetes clusters.

---

Managing dozens or hundreds of Kubernetes clusters requires centralized governance to ensure consistency, security, and compliance. Open Cluster Management (OCM) provides a vendor-neutral framework for multi-cluster governance, allowing you to manage cluster lifecycles, enforce policies, and deploy applications across your entire Kubernetes fleet from a single control plane.

In this guide, you'll learn how to deploy OCM and use it to implement governance policies, manage cluster lifecycles, and ensure compliance across multiple Kubernetes clusters.

## Understanding OCM Architecture

Open Cluster Management uses a hub-spoke model. The hub cluster acts as the central management plane where you define policies, applications, and governance rules. Spoke clusters (managed clusters) are the Kubernetes clusters you want to govern. Each spoke cluster runs a lightweight agent that communicates with the hub and enforces policies locally.

This architecture provides several advantages. The hub cluster doesn't need direct network access to workloads in spoke clusters, making it suitable for environments with strict network segmentation. Policies are evaluated locally on each spoke cluster, reducing the load on the hub. Spoke clusters can operate independently even if the hub becomes temporarily unavailable.

## Installing the OCM Hub

Start by installing the OCM hub components on your management cluster:

```bash
# Install clusteradm CLI tool
curl -L https://raw.githubusercontent.com/open-cluster-management-io/clusteradm/main/install.sh | bash

# Initialize the hub cluster
clusteradm init --wait

# Get the join command for managed clusters
clusteradm get token --use-bootstrap-token
```

The initialization creates several components on the hub cluster including the cluster manager, placement controller, and policy framework.

Verify the hub installation:

```bash
kubectl get pods -n open-cluster-management
kubectl get pods -n open-cluster-management-hub
```

## Joining Managed Clusters

Join each managed cluster to the hub using the token generated earlier:

```bash
# On the managed cluster
clusteradm join \
  --hub-token <hub-token> \
  --hub-apiserver <hub-apiserver-url> \
  --cluster-name cluster-1 \
  --wait

# On the hub cluster, accept the join request
clusteradm accept --clusters cluster-1
```

For multiple clusters, automate this process:

```bash
#!/bin/bash
# join-clusters.sh

HUB_TOKEN=$(clusteradm get token --use-bootstrap-token | grep "token:" | awk '{print $2}')
HUB_API=$(kubectl config view -o jsonpath='{.clusters[?(@.name=="hub")].cluster.server}')

for CLUSTER in cluster-1 cluster-2 cluster-3; do
  echo "Joining $CLUSTER..."
  kubectl --context=$CLUSTER apply -f - <<EOF
apiVersion: v1
kind: Secret
metadata:
  name: bootstrap-hub-kubeconfig
  namespace: open-cluster-management-agent
type: Opaque
stringData:
  kubeconfig: |
    apiVersion: v1
    kind: Config
    clusters:
    - name: hub
      cluster:
        server: $HUB_API
    users:
    - name: bootstrap
      user:
        token: $HUB_TOKEN
    contexts:
    - name: bootstrap
      context:
        cluster: hub
        user: bootstrap
    current-context: bootstrap
EOF

  clusteradm join --hub-kubeconfig-secret bootstrap-hub-kubeconfig --cluster-name $CLUSTER --wait
  clusteradm accept --clusters $CLUSTER
done
```

Verify managed clusters:

```bash
kubectl get managedclusters
kubectl get managedclusteraddons --all-namespaces
```

## Organizing Clusters with Labels and ClusterSets

Organize clusters using labels for easier management:

```yaml
apiVersion: cluster.open-cluster-management.io/v1
kind: ManagedCluster
metadata:
  name: cluster-1
  labels:
    environment: production
    region: us-east-1
    cloud: aws
    cluster-tier: gold
spec:
  hubAcceptsClient: true
```

Create ClusterSets to group related clusters:

```yaml
apiVersion: cluster.open-cluster-management.io/v1beta2
kind: ManagedClusterSet
metadata:
  name: production-clusters
spec:
  clusterSelector:
    labelSelector:
      matchLabels:
        environment: production

---
apiVersion: cluster.open-cluster-management.io/v1beta2
kind: ManagedClusterSet
metadata:
  name: development-clusters
spec:
  clusterSelector:
    labelSelector:
      matchLabels:
        environment: development
```

Bind ClusterSets to namespaces:

```yaml
apiVersion: cluster.open-cluster-management.io/v1beta2
kind: ManagedClusterSetBinding
metadata:
  name: production-clusters
  namespace: production-apps
spec:
  clusterSet: production-clusters
```

## Implementing Policy Governance

OCM's policy framework enforces governance across managed clusters. Policies can audit compliance or enforce specific configurations.

Create a policy to ensure namespaces have resource quotas:

```yaml
apiVersion: policy.open-cluster-management.io/v1
kind: Policy
metadata:
  name: require-resource-quotas
  namespace: default
spec:
  remediationAction: enforce  # or inform for audit-only
  disabled: false
  policy-templates:
  - objectDefinition:
      apiVersion: policy.open-cluster-management.io/v1
      kind: ConfigurationPolicy
      metadata:
        name: require-quota-in-namespaces
      spec:
        remediationAction: enforce
        severity: medium
        namespaceSelector:
          include:
          - "*"
          exclude:
          - kube-*
          - default
          - open-cluster-management*
        object-templates:
        - complianceType: musthave
          objectDefinition:
            apiVersion: v1
            kind: ResourceQuota
            metadata:
              name: default-quota
            spec:
              hard:
                requests.cpu: "10"
                requests.memory: 20Gi
                limits.cpu: "20"
                limits.memory: 40Gi

---
apiVersion: policy.open-cluster-management.io/v1
kind: PlacementBinding
metadata:
  name: binding-require-quotas
  namespace: default
spec:
  placementRef:
    name: placement-production
    kind: PlacementRule
    apiGroup: apps.open-cluster-management.io
  subjects:
  - name: require-resource-quotas
    kind: Policy
    apiGroup: policy.open-cluster-management.io

---
apiVersion: apps.open-cluster-management.io/v1
kind: PlacementRule
metadata:
  name: placement-production
  namespace: default
spec:
  clusterSelector:
    matchLabels:
      environment: production
```

Create a security policy to enforce pod security standards:

```yaml
apiVersion: policy.open-cluster-management.io/v1
kind: Policy
metadata:
  name: enforce-pod-security
  namespace: default
spec:
  remediationAction: enforce
  disabled: false
  policy-templates:
  - objectDefinition:
      apiVersion: policy.open-cluster-management.io/v1
      kind: ConfigurationPolicy
      metadata:
        name: pod-security-baseline
      spec:
        remediationAction: enforce
        severity: high
        namespaceSelector:
          include:
          - "*"
          exclude:
          - kube-system
          - open-cluster-management*
        object-templates:
        - complianceType: musthave
          objectDefinition:
            apiVersion: v1
            kind: Namespace
            metadata:
              name: "{{ .metadata.name }}"
              labels:
                pod-security.kubernetes.io/enforce: baseline
                pod-security.kubernetes.io/audit: restricted
                pod-security.kubernetes.io/warn: restricted
```

View policy compliance status:

```bash
kubectl get policies -A
kubectl get policy require-resource-quotas -o yaml
```

## Certificate Management Policies

Enforce certificate rotation and validation:

```yaml
apiVersion: policy.open-cluster-management.io/v1
kind: Policy
metadata:
  name: certificate-expiration-policy
  namespace: default
spec:
  remediationAction: inform
  disabled: false
  policy-templates:
  - objectDefinition:
      apiVersion: policy.open-cluster-management.io/v1
      kind: CertificatePolicy
      metadata:
        name: cert-expiration-check
      spec:
        namespaceSelector:
          include:
          - "*"
        minimumDuration: 720h  # Alert if cert expires in < 30 days
        minimumCADuration: 1440h  # Alert if CA expires in < 60 days
```

## Gatekeeper Integration for Advanced Policies

OCM integrates with Gatekeeper for OPA-based policy enforcement:

```yaml
apiVersion: policy.open-cluster-management.io/v1
kind: Policy
metadata:
  name: require-labels
  namespace: default
spec:
  remediationAction: enforce
  disabled: false
  policy-templates:
  - objectDefinition:
      apiVersion: templates.gatekeeper.sh/v1beta1
      kind: ConstraintTemplate
      metadata:
        name: k8srequiredlabels
      spec:
        crd:
          spec:
            names:
              kind: K8sRequiredLabels
            validation:
              openAPIV3Schema:
                properties:
                  labels:
                    type: array
                    items:
                      type: string
        targets:
        - target: admission.k8s.gatekeeper.sh
          rego: |
            package k8srequiredlabels
            violation[{"msg": msg, "details": {"missing_labels": missing}}] {
              provided := {label | input.review.object.metadata.labels[label]}
              required := {label | label := input.parameters.labels[_]}
              missing := required - provided
              count(missing) > 0
              msg := sprintf("You must provide labels: %v", [missing])
            }

  - objectDefinition:
      apiVersion: constraints.gatekeeper.sh/v1beta1
      kind: K8sRequiredLabels
      metadata:
        name: require-common-labels
      spec:
        match:
          kinds:
          - apiGroups: ["apps"]
            kinds: ["Deployment"]
        parameters:
          labels:
          - "app"
          - "environment"
          - "owner"
```

## Application Deployment with Placement

Deploy applications to selected clusters based on placement rules:

```yaml
apiVersion: app.k8s.io/v1beta1
kind: Application
metadata:
  name: nginx-app
  namespace: default
spec:
  componentKinds:
  - group: apps.open-cluster-management.io
    kind: Subscription
  selector:
    matchExpressions:
    - key: app
      operator: In
      values:
      - nginx

---
apiVersion: apps.open-cluster-management.io/v1
kind: Channel
metadata:
  name: nginx-channel
  namespace: default
spec:
  type: Git
  pathname: https://github.com/example/nginx-manifests.git

---
apiVersion: apps.open-cluster-management.io/v1
kind: Subscription
metadata:
  name: nginx-subscription
  namespace: default
  labels:
    app: nginx
spec:
  channel: default/nginx-channel
  placement:
    placementRef:
      name: nginx-placement
      kind: PlacementRule

---
apiVersion: apps.open-cluster-management.io/v1
kind: PlacementRule
metadata:
  name: nginx-placement
  namespace: default
spec:
  clusterSelector:
    matchExpressions:
    - key: environment
      operator: In
      values:
      - production
      - staging
  clusterReplicas: 2  # Deploy to 2 clusters
```

## Cluster Lifecycle Management

Manage cluster provisioning and upgrades through OCM. For example, create a cluster using Hive:

```yaml
apiVersion: hive.openshift.io/v1
kind: ClusterDeployment
metadata:
  name: new-prod-cluster
  namespace: new-prod-cluster
spec:
  baseDomain: example.com
  clusterName: new-prod-cluster
  platform:
    aws:
      region: us-west-2
  provisioning:
    imageSetRef:
      name: kubernetes-1.28
    installConfigSecretRef:
      name: install-config
  pullSecretRef:
    name: pull-secret
```

Automate cluster upgrades:

```yaml
apiVersion: config.openshift.io/v1
kind: ClusterVersion
metadata:
  name: version
spec:
  channel: stable-1.28
  desiredUpdate:
    version: 1.28.5
```

## Monitoring Policy Compliance

Create dashboards to monitor compliance across clusters:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: grafana-dashboard-policy-compliance
  namespace: monitoring
data:
  policy-compliance.json: |
    {
      "dashboard": {
        "title": "OCM Policy Compliance",
        "panels": [
          {
            "title": "Compliance Status",
            "targets": [
              {
                "expr": "ocm_policy_governance_status{status='Compliant'}"
              }
            ]
          },
          {
            "title": "Non-Compliant Policies by Cluster",
            "targets": [
              {
                "expr": "sum(ocm_policy_governance_status{status='NonCompliant'}) by (cluster, policy)"
              }
            ]
          }
        ]
      }
    }
```

## Best Practices

Start with inform-only policies before enforcing them. This allows you to understand the impact across your clusters before automatic remediation begins.

Use ClusterSets to organize clusters logically. Group by environment, region, or business unit to simplify policy targeting.

Implement policies incrementally. Rolling out all governance policies at once can overwhelm teams with compliance violations.

Test policies in development clusters before applying to production. Policy enforcement can prevent deployments, so validate behavior carefully.

Monitor policy compliance continuously. Set up alerts when clusters drift out of compliance so you can investigate before problems escalate.

Document your policies clearly. Include rationale and remediation steps so teams understand why policies exist and how to comply.

## Conclusion

Open Cluster Management provides a robust framework for multi-cluster governance, enabling you to enforce security policies, manage cluster lifecycles, and ensure compliance across your entire Kubernetes fleet. Its vendor-neutral approach and extensible policy framework make it suitable for organizations managing clusters across multiple cloud providers or on-premises environments.

Start with basic cluster registration and simple policies, then expand governance capabilities as your organization's needs grow. The investment in centralized governance pays dividends as your cluster count increases and regulatory requirements become more complex.
