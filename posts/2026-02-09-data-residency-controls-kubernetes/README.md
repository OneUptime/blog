# How to Implement Data Residency Controls for Kubernetes Workloads Across Regions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Compliance, Data Residency, GDPR, Multi-Region, Data Sovereignty

Description: Implement data residency controls in multi-region Kubernetes deployments to ensure data stays within required geographic boundaries, meeting GDPR and data sovereignty regulations through node selectors, taints, and policy enforcement.

---

Data residency regulations like GDPR require that certain data stays within specific geographic regions. Organizations operating multi-region Kubernetes clusters must ensure workloads handling regulated data deploy only to compliant regions. Accidental deployment to the wrong region can trigger massive regulatory fines and breach customer trust.

Implementing data residency controls requires combining Kubernetes scheduling primitives, admission policies, and monitoring to guarantee workloads land in the correct regions. This goes beyond simple node selection to include storage location verification, network path validation, and continuous compliance monitoring.

## Understanding Data Residency Requirements

Data residency regulations vary by jurisdiction. GDPR requires personal data of EU residents remain in the EU unless specific transfer mechanisms exist. Swiss banking regulations mandate financial data stay within Switzerland. Canadian PIPEDA restricts personal information transfer outside Canada. Chinese cybersecurity laws require critical data stay within China.

For Kubernetes, this means ensuring pods handling regulated data schedule only on nodes in compliant regions, persistent volumes provision in compliant zones, and network traffic doesn't transit non-compliant regions. You also need audit trails proving compliance.

## Labeling Nodes by Region and Compliance Zone

Start by labeling all cluster nodes with their geographic location and compliance attributes:

```bash
# label-nodes-by-region.sh
#!/bin/bash

# AWS nodes - label with region and compliance zone
kubectl get nodes -l node.kubernetes.io/instance-type -o name | while read node; do
  # Get node region from cloud provider labels
  REGION=$(kubectl get $node -o jsonpath='{.metadata.labels.topology\.kubernetes\.io/region}')

  # Set compliance labels based on region
  case $REGION in
    eu-*)
      kubectl label $node compliance-zone=eu --overwrite
      kubectl label $node gdpr-compliant=true --overwrite
      ;;
    us-*)
      kubectl label $node compliance-zone=us --overwrite
      kubectl label $node gdpr-compliant=false --overwrite
      ;;
    ap-southeast-1) # Singapore
      kubectl label $node compliance-zone=apac --overwrite
      kubectl label $node gdpr-compliant=false --overwrite
      ;;
    ca-*)
      kubectl label $node compliance-zone=canada --overwrite
      kubectl label $node pipeda-compliant=true --overwrite
      ;;
  esac

  echo "Labeled $node: region=$REGION"
done
```

Apply labels:

```bash
chmod +x label-nodes-by-region.sh
./label-nodes-by-region.sh

# Verify labels
kubectl get nodes -L compliance-zone,gdpr-compliant
```

## Creating Residency-Aware Scheduling Policies

Use node affinity to enforce data residency at pod scheduling time:

```yaml
# data-residency-deployments.yaml
---
# EU-only deployment for GDPR compliance
apiVersion: apps/v1
kind: Deployment
metadata:
  name: customer-data-processor
  namespace: production
  labels:
    data-classification: personal
    residency-requirement: eu
spec:
  replicas: 3
  selector:
    matchLabels:
      app: customer-processor
  template:
    metadata:
      labels:
        app: customer-processor
        data-classification: personal
    spec:
      # Hard requirement: must run in EU
      affinity:
        nodeAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            nodeSelectorTerms:
            - matchExpressions:
              - key: compliance-zone
                operator: In
                values:
                - eu
              - key: gdpr-compliant
                operator: In
                values:
                - "true"

      # Spread across EU availability zones
      topologySpreadConstraints:
      - maxSkew: 1
        topologyKey: topology.kubernetes.io/zone
        whenUnsatisfiable: DoNotSchedule
        labelSelector:
          matchLabels:
            app: customer-processor

      containers:
      - name: processor
        image: gcr.io/my-company/customer-processor:v1.0.0
        env:
        - name: DATA_REGION
          value: "EU"

---
# Canada-only deployment for PIPEDA compliance
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: financial-records
  namespace: production
  labels:
    data-classification: financial
    residency-requirement: canada
spec:
  serviceName: financial-records
  replicas: 3
  selector:
    matchLabels:
      app: financial-records
  template:
    metadata:
      labels:
        app: financial-records
        data-classification: financial
    spec:
      affinity:
        nodeAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            nodeSelectorTerms:
            - matchExpressions:
              - key: compliance-zone
                operator: In
                values:
                - canada
              - key: pipeda-compliant
                operator: In
                values:
                - "true"

      containers:
      - name: records
        image: gcr.io/my-company/financial-records:v1.0.0
        volumeMounts:
        - name: data
          mountPath: /data

  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: ["ReadWriteOnce"]
      storageClassName: canada-ssd
      resources:
        requests:
          storage: 100Gi
```

## Implementing Storage Class Residency Controls

Create region-specific storage classes that ensure PVs provision in compliant zones:

```yaml
# residency-storage-classes.yaml
---
# EU-only storage class
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: eu-ssd
  labels:
    compliance-zone: eu
    gdpr-compliant: "true"
provisioner: kubernetes.io/aws-ebs
parameters:
  type: gp3
  encrypted: "true"
  kmsKeyId: "arn:aws:kms:eu-central-1:123456789:key/..."
allowedTopologies:
- matchLabelExpressions:
  - key: topology.kubernetes.io/region
    values:
    - eu-central-1
    - eu-west-1
    - eu-west-2

---
# Canada-only storage class
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: canada-ssd
  labels:
    compliance-zone: canada
    pipeda-compliant: "true"
provisioner: kubernetes.io/gce-pd
parameters:
  type: pd-ssd
  replication-type: regional-pd
allowedTopologies:
- matchLabelExpressions:
  - key: topology.kubernetes.io/region
    values:
    - northamerica-northeast1  # Montreal
    - northamerica-northeast2  # Toronto

---
# US-only storage class
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: us-ssd
  labels:
    compliance-zone: us
provisioner: kubernetes.io/azure-disk
parameters:
  storageaccounttype: Premium_LRS
  kind: Managed
allowedTopologies:
- matchLabelExpressions:
  - key: topology.kubernetes.io/region
    values:
    - eastus
    - westus2
    - centralus
```

Apply storage classes:

```bash
kubectl apply -f residency-storage-classes.yaml
```

## Enforcing Residency with Admission Policies

Create admission policies that prevent workloads from violating residency requirements:

```yaml
# residency-admission-policy.yaml
apiVersion: templates.gatekeeper.sh/v1beta1
kind: ConstraintTemplate
metadata:
  name: dataresidency
  annotations:
    description: "Enforce data residency requirements"
spec:
  crd:
    spec:
      names:
        kind: DataResidency
  targets:
  - target: admission.k8s.gatekeeper.sh
    rego: |
      package dataresidency

      import future.keywords.contains
      import future.keywords.if

      # Check if pod with data-classification label has proper node affinity
      violation[{"msg": msg}] {
        input.review.kind.kind == "Pod"
        classification := input.review.object.metadata.labels["data-classification"]
        classification != ""

        residency := input.review.object.metadata.labels["residency-requirement"]
        residency != ""

        # Check if pod has required node affinity
        not has_proper_affinity(residency)

        msg := sprintf("Pod with data-classification '%v' must have node affinity for compliance-zone '%v'", [classification, residency])
      }

      # Check if PVC uses region-appropriate storage class
      violation[{"msg": msg}] {
        input.review.kind.kind == "PersistentVolumeClaim"
        namespace := input.review.object.metadata.namespace

        # Get namespace data residency requirement
        ns_residency := data.kubernetes.namespaces[namespace].metadata.labels["residency-requirement"]
        ns_residency != ""

        storage_class := input.review.object.spec.storageClassName

        # Verify storage class has matching compliance-zone label
        not storage_class_compliant(storage_class, ns_residency)

        msg := sprintf("PVC must use storage class with compliance-zone '%v'", [ns_residency])
      }

      has_proper_affinity(required_zone) if {
        affinity := input.review.object.spec.affinity.nodeAffinity
        required := affinity.requiredDuringSchedulingIgnoredDuringExecution
        term := required.nodeSelectorTerms[_]
        expression := term.matchExpressions[_]

        expression.key == "compliance-zone"
        expression.values[_] == required_zone
      }

      storage_class_compliant(sc_name, required_zone) if {
        sc := data.kubernetes.storageclasses[sc_name]
        sc.metadata.labels["compliance-zone"] == required_zone
      }

---
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: DataResidency
metadata:
  name: enforce-data-residency
spec:
  enforcementAction: deny
  match:
    kinds:
    - apiGroups: [""]
      kinds: ["Pod", "PersistentVolumeClaim"]
```

Apply residency policies:

```bash
kubectl apply -f residency-admission-policy.yaml
```

## Implementing Namespace-Level Residency Defaults

Configure namespaces with default residency requirements:

```yaml
# residency-namespaces.yaml
---
# EU namespace for GDPR-regulated workloads
apiVersion: v1
kind: Namespace
metadata:
  name: eu-production
  labels:
    residency-requirement: eu
    gdpr-compliant: "true"
    data-classification: personal

---
# PodNodeSelector admission plugin configuration
apiVersion: v1
kind: ConfigMap
metadata:
  name: pod-node-selector
  namespace: kube-system
data:
  podnodeselector.kubernetes.io: |
    eu-production: compliance-zone=eu
    canada-production: compliance-zone=canada
    us-production: compliance-zone=us

---
# Canada namespace
apiVersion: v1
kind: Namespace
metadata:
  name: canada-production
  labels:
    residency-requirement: canada
    pipeda-compliant: "true"
    data-classification: financial

---
# US namespace
apiVersion: v1
kind: Namespace
metadata:
  name: us-production
  labels:
    residency-requirement: us
    data-classification: general
```

## Monitoring Residency Compliance

Create monitoring to detect residency violations:

```yaml
# prometheus-residency-alerts.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: data-residency-alerts
  namespace: monitoring
spec:
  groups:
  - name: data_residency
    interval: 1m
    rules:
    - alert: PodScheduledInWrongRegion
      expr: |
        kube_pod_labels{label_data_classification!="",label_residency_requirement!=""}
        unless on(pod, namespace) (
          kube_pod_info * on(node) group_left(label_compliance_zone)
          kube_node_labels{label_compliance_zone=~".+"}
        )
      for: 1m
      labels:
        severity: critical
      annotations:
        summary: "Pod scheduled in non-compliant region"
        description: "Pod {{ $labels.namespace }}/{{ $labels.pod }} may be in wrong region"

    - alert: PVCInWrongZone
      expr: |
        kube_persistentvolumeclaim_info
        * on(storageclass) group_left(label_compliance_zone)
        kube_storageclass_labels
        unless on(namespace) (
          kube_namespace_labels{label_residency_requirement=~".+"}
        )
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "PVC may violate residency requirements"
        description: "PVC {{ $labels.namespace }}/{{ $labels.persistentvolumeclaim }} zone mismatch"
```

## Creating Residency Audit Reports

Generate compliance reports showing data residency adherence:

```bash
# residency-audit-report.sh
#!/bin/bash

echo "=== Data Residency Compliance Report ==="
echo "Generated: $(date)"
echo

echo "1. Pods by Compliance Zone:"
echo "--------------------------"
kubectl get pods -A -o json | jq -r '
  .items[] |
  select(.metadata.labels["data-classification"] != null) |
  . as $pod |
  ($pod.spec.nodeName // "unscheduled") as $node |
  "\($pod.metadata.namespace)/\($pod.metadata.name): \($pod.metadata.labels["residency-requirement"] // "none") on node \($node)"
'

echo
echo "2. PVCs by Storage Class Compliance:"
echo "------------------------------------"
kubectl get pvc -A -o json | jq -r '
  .items[] |
  "\(.metadata.namespace)/\(.metadata.name): \(.spec.storageClassName)"
'

echo
echo "3. Nodes by Compliance Zone:"
echo "---------------------------"
kubectl get nodes -L compliance-zone,gdpr-compliant,pipeda-compliant

echo
echo "4. Potential Violations:"
echo "-----------------------"
kubectl get constraints dataresidency -o json | \
  jq -r '.items[].status.violations[]? | "\(.name): \(.message)"'

echo
echo "Report Complete"
```

Run compliance audits regularly:

```yaml
# residency-audit-cronjob.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: residency-audit
  namespace: compliance
spec:
  schedule: "0 0 * * *"  # Daily
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: compliance-auditor
          containers:
          - name: auditor
            image: bitnami/kubectl:latest
            command: ["/bin/bash", "/scripts/residency-audit-report.sh"]
            volumeMounts:
            - name: scripts
              mountPath: /scripts
          volumes:
          - name: scripts
            configMap:
              name: audit-scripts
              defaultMode: 0755
          restartPolicy: OnFailure
```

Data residency controls in Kubernetes require layering node labels, scheduling constraints, storage policies, and admission controls. By enforcing residency requirements at multiple levels and continuously monitoring compliance, you ensure regulated data stays within required geographic boundaries while maintaining operational flexibility.
