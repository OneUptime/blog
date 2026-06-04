# How to Implement Data Residency Controls for Kubernetes Workloads Across Regions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Compliance, Data Residency, GDPR, Multi-Region, Data Sovereignty

Description: Implement data residency controls in multi-region Kubernetes deployments to ensure data stays within required geographic boundaries.

---

Data residency and transfer requirements may require that certain data stays within specific geographic regions. Organizations operating multi-region Kubernetes clusters must ensure workloads handling regulated data deploy only to compliant regions. Accidental deployment to the wrong region can trigger massive regulatory fines and breach customer trust.

Implementing data residency controls requires combining Kubernetes scheduling primitives, admission policies, and monitoring to guarantee workloads land in the correct regions. This goes beyond simple node selection to include storage location verification, network path validation, and continuous compliance monitoring.

## Understanding Data Residency Requirements

Data residency regulations vary by jurisdiction. GDPR does not impose a blanket EU-only residency rule, but it restricts transfers of personal data outside the EEA unless an adequacy decision, appropriate safeguards, or another transfer mechanism applies. Swiss banking and financial regulations can impose strict outsourcing, secrecy, and audit obligations. Canadian PIPEDA does not prohibit transfers outside Canada for processing, but organizations remain accountable and must use contractual or other means to provide comparable protection. Chinese cybersecurity laws can require critical data and some personal information to stay within China.

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
        residency-requirement: eu
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
        residency-requirement: canada
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
provisioner: ebs.csi.aws.com
parameters:
  type: gp3
  encrypted: "true"
  kmsKeyId: "arn:aws:kms:eu-central-1:123456789:key/..."
volumeBindingMode: WaitForFirstConsumer
allowedTopologies:
- matchLabelExpressions:
  - key: topology.ebs.csi.aws.com/zone
    values:
    - eu-central-1a
    - eu-central-1b
    - eu-central-1c

---
# Canada-only storage class
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: canada-ssd
  labels:
    compliance-zone: canada
    pipeda-compliant: "true"
provisioner: pd.csi.storage.gke.io
parameters:
  type: pd-ssd
  replication-type: regional-pd
volumeBindingMode: WaitForFirstConsumer
allowedTopologies:
- matchLabelExpressions:
  - key: topology.gke.io/zone
    values:
    - northamerica-northeast1-a  # Montreal
    - northamerica-northeast1-b  # Montreal

---
# US-only storage class
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: us-ssd
  labels:
    compliance-zone: us
provisioner: disk.csi.azure.com
parameters:
  skuName: Premium_LRS
volumeBindingMode: WaitForFirstConsumer
allowedTopologies:
- matchLabelExpressions:
  - key: topology.disk.csi.azure.com/zone
    values:
    - eastus-1
    - eastus-2
    - westus2-1
```

Apply storage classes:

```bash
kubectl apply -f residency-storage-classes.yaml
```

## Enforcing Residency with Admission Policies

Create admission policies that prevent workloads from violating residency requirements:

```yaml
# residency-admission-policy.yaml
---
apiVersion: config.gatekeeper.sh/v1alpha1
kind: Config
metadata:
  name: config
  namespace: gatekeeper-system
spec:
  sync:
    syncOnly:
    - group: ""
      version: "v1"
      kind: "Namespace"
    - group: "storage.k8s.io"
      version: "v1"
      kind: "StorageClass"

---
apiVersion: templates.gatekeeper.sh/v1
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
      validation:
        openAPIV3Schema:
          type: object
  targets:
  - target: admission.k8s.gatekeeper.sh
    rego: |
      package dataresidency

      # Check if pod with data-classification label has proper node affinity
      violation[{"msg": msg}] {
        input.review.kind.kind == "Pod"
        labels := object.get(input.review.object.metadata, "labels", {})
        classification := labels["data-classification"]
        classification != ""

        residency := labels["residency-requirement"]
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
        ns := data.inventory.cluster["v1"]["Namespace"][namespace]
        ns_labels := object.get(ns.metadata, "labels", {})
        ns_residency := ns_labels["residency-requirement"]
        ns_residency != ""

        storage_class := object.get(input.review.object.spec, "storageClassName", "")

        # Verify storage class has matching compliance-zone label
        not storage_class_compliant(storage_class, ns_residency)

        msg := sprintf("PVC must use storage class with compliance-zone '%v'", [ns_residency])
      }

      has_proper_affinity(required_zone) {
        affinity := input.review.object.spec.affinity.nodeAffinity
        required := affinity.requiredDuringSchedulingIgnoredDuringExecution
        term := required.nodeSelectorTerms[_]
        expression := term.matchExpressions[_]

        expression.key == "compliance-zone"
        expression.values[_] == required_zone
      }

      storage_class_compliant(sc_name, required_zone) {
        sc := data.inventory.cluster["storage.k8s.io/v1"]["StorageClass"][sc_name]
        sc_labels := object.get(sc.metadata, "labels", {})
        sc_labels["compliance-zone"] == required_zone
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
  annotations:
    scheduler.alpha.kubernetes.io/node-selector: compliance-zone=eu
  labels:
    residency-requirement: eu
    gdpr-compliant: "true"
    data-classification: personal

---
# Canada namespace
apiVersion: v1
kind: Namespace
metadata:
  name: canada-production
  annotations:
    scheduler.alpha.kubernetes.io/node-selector: compliance-zone=canada
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
  annotations:
    scheduler.alpha.kubernetes.io/node-selector: compliance-zone=us
  labels:
    residency-requirement: us
    data-classification: general
```

These namespace annotations are enforced only when the Kubernetes API server runs the `PodNodeSelector` admission plugin with an admission control configuration file. In managed clusters where that plugin is not configurable, use the Gatekeeper policy above or a mutating/validating admission webhook to apply the same defaults.

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
        (
          kube_pod_labels{label_data_classification!="",label_residency_requirement="eu"}
          * on(namespace, pod) group_left(node) kube_pod_info
          * on(node) group_left(label_compliance_zone) kube_node_labels{label_compliance_zone=~".+",label_compliance_zone!="eu"}
        )
        or
        (
          kube_pod_labels{label_data_classification!="",label_residency_requirement="canada"}
          * on(namespace, pod) group_left(node) kube_pod_info
          * on(node) group_left(label_compliance_zone) kube_node_labels{label_compliance_zone=~".+",label_compliance_zone!="canada"}
        )
        or
        (
          kube_pod_labels{label_data_classification!="",label_residency_requirement="us"}
          * on(namespace, pod) group_left(node) kube_pod_info
          * on(node) group_left(label_compliance_zone) kube_node_labels{label_compliance_zone=~".+",label_compliance_zone!="us"}
        )
      for: 1m
      labels:
        severity: critical
      annotations:
        summary: "Pod scheduled in non-compliant region"
        description: "Pod {{ $labels.namespace }}/{{ $labels.pod }} may be in wrong region"

    - alert: PVCInWrongZone
      expr: |
        (
          kube_namespace_labels{label_residency_requirement="eu"}
          * on(namespace) group_right(label_residency_requirement)
            kube_persistentvolumeclaim_info
          * on(storageclass) group_left(label_compliance_zone)
            kube_storageclass_labels{label_compliance_zone=~".+",label_compliance_zone!="eu"}
        )
        or
        (
          kube_namespace_labels{label_residency_requirement="canada"}
          * on(namespace) group_right(label_residency_requirement)
            kube_persistentvolumeclaim_info
          * on(storageclass) group_left(label_compliance_zone)
            kube_storageclass_labels{label_compliance_zone=~".+",label_compliance_zone!="canada"}
        )
        or
        (
          kube_namespace_labels{label_residency_requirement="us"}
          * on(namespace) group_right(label_residency_requirement)
            kube_persistentvolumeclaim_info
          * on(storageclass) group_left(label_compliance_zone)
            kube_storageclass_labels{label_compliance_zone=~".+",label_compliance_zone!="us"}
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
kubectl get dataresidency.constraints.gatekeeper.sh -o json | \
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
