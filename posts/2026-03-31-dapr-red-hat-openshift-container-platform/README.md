# How to Use Dapr with Red Hat OpenShift Container Platform

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, OpenShift, Red Hat, OCP, Enterprise Kubernetes

Description: Deploy Dapr on Red Hat OpenShift Container Platform (OCP) using OperatorHub or Helm, with Red Hat-specific SCC configurations and OpenShift monitoring integration.

---

Red Hat OpenShift Container Platform (OCP) is the enterprise Kubernetes platform with additional security, compliance, and lifecycle management features. Deploying Dapr on OCP requires addressing Security Context Constraints and leveraging OpenShift's built-in tooling for day-2 operations.

## Installing Dapr via OperatorHub

OpenShift's OperatorHub provides a catalog-based approach to installing cluster-wide tools:

```bash
# Create a CatalogSource for Dapr (if not in default catalog)
cat <<EOF | oc apply -f -
apiVersion: operators.coreos.com/v1alpha1
kind: CatalogSource
metadata:
  name: dapr-catalog
  namespace: openshift-marketplace
spec:
  sourceType: grpc
  image: quay.io/operatorhubio/catalog:latest
  displayName: Community Operators
EOF

# Create namespace and OperatorGroup for Dapr
oc new-project dapr-system

cat <<EOF | oc apply -f -
apiVersion: operators.coreos.com/v1
kind: OperatorGroup
metadata:
  name: dapr-operator-group
  namespace: dapr-system
spec: {}
EOF

# Subscribe to Dapr operator
cat <<EOF | oc apply -f -
apiVersion: operators.coreos.com/v1alpha1
kind: Subscription
metadata:
  name: dapr-operator
  namespace: dapr-system
spec:
  channel: stable
  name: dapr-operator
  source: dapr-catalog
  sourceNamespace: openshift-marketplace
EOF
```

## Installing via Helm on OCP

For teams preferring Helm over the Operator pattern:

```bash
# Create namespace with privileged SCC
oc new-project dapr-system

# Grant anyuid SCC for Dapr control plane
oc adm policy add-scc-to-group anyuid system:serviceaccounts:dapr-system

# Install Dapr
helm repo add dapr https://dapr.github.io/helm-charts/
helm upgrade --install dapr dapr/dapr \
  --namespace dapr-system \
  --set global.ha.enabled=true \
  --wait
```

## OCP-Specific SCC for Application Namespaces

Create an SCC that allows Dapr sidecar injection in application namespaces:

```yaml
apiVersion: security.openshift.io/v1
kind: SecurityContextConstraints
metadata:
  name: dapr-application-scc
allowHostDirVolumePlugin: false
allowHostIPC: false
allowHostNetwork: false
allowHostPID: false
allowHostPorts: false
allowPrivilegeEscalation: false
allowPrivilegedContainer: false
defaultAllowPrivilegeEscalation: false
fsGroup:
  type: MustRunAs
  ranges:
  - min: 1000
    max: 65535
runAsUser:
  type: MustRunAsRange
  uidRangeMin: 1000
  uidRangeMax: 65535
seLinuxContext:
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
users: []
groups: []
```

Apply to the application namespace's service accounts:

```bash
oc adm policy add-scc-to-group dapr-application-scc \
  system:serviceaccounts:production
```

## OpenShift Monitoring Integration

OpenShift's built-in monitoring (Prometheus Operator) can scrape Dapr metrics. Create a ServiceMonitor:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: dapr-metrics
  namespace: dapr-system
  labels:
    app.kubernetes.io/component: dapr
spec:
  namespaceSelector:
    matchNames:
    - dapr-system
  selector:
    matchLabels:
      app: dapr-operator
  endpoints:
  - port: metrics
    interval: 30s
    path: /metrics
```

Enable user workload monitoring:

```bash
oc patch configmap cluster-monitoring-config \
  -n openshift-monitoring \
  --type merge \
  -p '{"data": {"config.yaml": "enableUserWorkloadMonitoring: true\n"}}'
```

## OpenShift Routes for Dapr Applications

Create an HTTPS route for a Dapr-enabled service:

```yaml
apiVersion: route.openshift.io/v1
kind: Route
metadata:
  name: api-gateway
  namespace: production
spec:
  host: api.apps.cluster.company.com
  to:
    kind: Service
    name: api-gateway
    weight: 100
  port:
    targetPort: 8080
  tls:
    termination: reencrypt
    destinationCACertificate: |
      -----BEGIN CERTIFICATE-----
      ...
      -----END CERTIFICATE-----
```

## Verifying Dapr on OCP

```bash
# Check Dapr control plane
oc get pods -n dapr-system

# Verify sidecar injection in application pods
oc get pods -n production -o jsonpath='{range .items[*]}{.metadata.name}{": "}{range .spec.containers[*]}{.name}{","}{end}{"\n"}{end}'

# View Dapr component status
dapr components -k -n production
```

## Summary

Running Dapr on Red Hat OpenShift Container Platform requires proper SCC configuration for both the Dapr control plane and application namespaces. OpenShift's OperatorHub provides a managed installation path, while Helm offers more control for teams with existing Helm workflows. Integration with OpenShift's built-in Prometheus monitoring via ServiceMonitors provides native metrics collection without additional infrastructure.
