# How to Use Dapr with OpenShift

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, OpenShift, Red Hat, Kubernetes, Security

Description: Install and configure Dapr on Red Hat OpenShift by addressing Security Context Constraints (SCC) requirements and deploying Dapr using Helm with OpenShift-compatible settings.

---

OpenShift adds security layers on top of Kubernetes, particularly Security Context Constraints (SCCs) that restrict what containers can do. Installing Dapr on OpenShift requires configuring SCCs and using OpenShift-compatible Helm values.

## OpenShift Security Context Constraints

OpenShift's `restricted` SCC blocks many default Kubernetes behaviors. Dapr requires specific permissions. Create a custom SCC for Dapr:

```yaml
apiVersion: security.openshift.io/v1
kind: SecurityContextConstraints
metadata:
  name: dapr-scc
allowHostDirVolumePlugin: false
allowHostIPC: false
allowHostNetwork: false
allowHostPID: false
allowHostPorts: false
allowPrivilegeEscalation: false
allowPrivilegedContainer: false
allowedCapabilities: null
defaultAddCapabilities: null
fsGroup:
  type: MustRunAs
  ranges:
  - min: 1000
    max: 65535
readOnlyRootFilesystem: false
requiredDropCapabilities:
- ALL
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
```

## Installing Dapr with OpenShift-Compatible Helm Values

```bash
helm repo add dapr https://dapr.github.io/helm-charts/
helm repo update

helm install dapr dapr/dapr \
  --namespace dapr-system \
  --create-namespace \
  --set global.ha.enabled=true \
  --set dapr_operator.runAsNonRoot=true \
  --set dapr_sentry.runAsNonRoot=true \
  --set dapr_placement.runAsNonRoot=true \
  --set dapr_scheduler.securityContext.runAsNonRoot=true \
  --wait
```

## Granting SCC to Dapr Service Accounts

```bash
# Grant the custom SCC to Dapr system service accounts
oc adm policy add-scc-to-user dapr-scc \
  -z dapr-operator -n dapr-system

oc adm policy add-scc-to-user dapr-scc \
  -z dapr-injector -n dapr-system

oc adm policy add-scc-to-user dapr-scc \
  -z dapr-sentry -n dapr-system

oc adm policy add-scc-to-user dapr-scc \
  -z dapr-placement -n dapr-system

oc adm policy add-scc-to-user dapr-scc \
  -z dapr-scheduler -n dapr-system
```

## Enabling Sidecar Injection on OpenShift

Dapr sidecar injection is controlled through pod-level annotations on your deployments:

```bash
# Annotate a deployment for Dapr sidecar injection
oc annotate deployment order-service \
  dapr.io/enabled="true" \
  dapr.io/app-id="order-service" \
  dapr.io/app-port="8080"
```

## OpenShift Routes for Dapr Services

Expose Dapr-enabled services via OpenShift Routes:

```yaml
apiVersion: route.openshift.io/v1
kind: Route
metadata:
  name: order-service
  namespace: my-project
spec:
  to:
    kind: Service
    name: order-service
  port:
    targetPort: 8080
  tls:
    termination: edge
    insecureEdgeTerminationPolicy: Redirect
```

## Verifying Dapr on OpenShift

```bash
# Check Dapr control plane is running
oc get pods -n dapr-system

# Verify sidecar injection is working
oc get pods -n my-project -o jsonpath='{range .items[*]}{.metadata.name}{": "}{range .spec.containers[*]}{.name}{" "}{end}{"\n"}{end}'

# Check Dapr version
dapr status -k
```

## Using OpenShift Secrets with Dapr

Dapr can read secrets from OpenShift secrets directly using the Kubernetes secrets store:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: k8s-secrets
spec:
  type: secretstores.kubernetes
  version: v1
```

Reference secrets in other components using `secretKeyRef` to avoid storing credentials in component YAML.

## Summary

Running Dapr on OpenShift requires creating custom Security Context Constraints, granting them to Dapr service accounts, and using non-root Helm values. Once SCC policies are in place, Dapr sidecar injection and all building blocks function identically to standard Kubernetes, allowing teams to leverage Dapr's full feature set within OpenShift's security model.
