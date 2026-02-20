# How to Use OPA Gatekeeper Sync to Replicate Resources for Policy Evaluation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, OPA Gatekeeper, Policy Engine, Constraint Framework, Sync

Description: Learn how to configure OPA Gatekeeper sync to replicate Kubernetes resources into OPA cache, enabling policies that reference multiple resources, perform lookups, and enforce cross-resource constraints.

---

OPA Gatekeeper sync replicates Kubernetes resources into OPA's in-memory cache, enabling policies to reference data beyond the single resource being evaluated. Without sync, policies can only examine the resource in the admission request. With sync, policies can check if ConfigMaps exist, verify Service selectors match Deployments, or validate uniqueness across the cluster. This guide shows you how to configure and use Gatekeeper sync effectively.

## Understanding Gatekeeper Sync

By default, Gatekeeper only receives the resource being created or updated during admission. Sync configuration tells Gatekeeper which resource types to cache, making them available during policy evaluation. Synced resources are stored in OPA's data document at `data.inventory`, accessible in constraint templates.

Sync enables powerful policies like checking naming conflicts, validating cross-references between resources, and enforcing cluster-wide uniqueness constraints.

## Configuring Basic Sync

Enable sync for ConfigMaps and Namespaces:

```yaml
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
      - group: ""
        version: "v1"
        kind: "ConfigMap"
      - group: ""
        version: "v1"
        kind: "Service"
      - group: "apps"
        version: "v1"
        kind: "Deployment"
```

Apply this configuration:

```bash
kubectl apply -f gatekeeper-config.yaml
```

Gatekeeper starts caching these resource types, making them available to constraints.

## Accessing Synced Data in Templates

Create a constraint template that uses synced data:

```yaml
apiVersion: templates.gatekeeper.sh/v1
kind: ConstraintTemplate
metadata:
  name: k8suniqueservicename
spec:
  crd:
    spec:
      names:
        kind: K8sUniqueServiceName
  targets:
    - target: admission.k8s.gatekeeper.sh
      rego: |
        package k8suniqueservicename

        violation[{"msg": msg}] {
          # Get the service being created
          input.review.kind.kind == "Service"
          service_name := input.review.object.metadata.name
          service_namespace := input.review.object.metadata.namespace

          # Check all synced services
          existing_service := data.inventory.namespace[ns][_]["Service"][service_name]
          ns != service_namespace

          msg := sprintf("Service name '%v' already exists in namespace '%v'", [service_name, ns])
        }
```

The `data.inventory` structure contains all synced resources organized by namespace, group/version, kind, and name.

## Validating Cross-Resource References

Check that Service selectors match Deployment labels:

```yaml
apiVersion: templates.gatekeeper.sh/v1
kind: ConstraintTemplate
metadata:
  name: k8svalidserviceselector
spec:
  crd:
    spec:
      names:
        kind: K8sValidServiceSelector
  targets:
    - target: admission.k8s.gatekeeper.sh
      rego: |
        package k8svalidserviceselector

        violation[{"msg": msg}] {
          input.review.kind.kind == "Service"
          service := input.review.object
          namespace := service.metadata.namespace
          selector := service.spec.selector

          # Check if any deployment matches the selector
          not deployment_matches_selector(namespace, selector)

          msg := sprintf("Service selector does not match any Deployment in namespace %v", [namespace])
        }

        deployment_matches_selector(namespace, selector) {
          deployment := data.inventory.namespace[namespace][_]["apps/v1"]["Deployment"][_]
          labels := deployment.spec.template.metadata.labels

          # Check if all selector keys match deployment labels
          count({k | selector[k]; labels[k] == selector[k]}) == count(selector)
        }
```

This constraint ensures services have matching deployments before creation.

## Checking Resource Quotas

Validate pod resource requests against namespace quotas:

```yaml
apiVersion: templates.gatekeeper.sh/v1
kind: ConstraintTemplate
metadata:
  name: k8senforceresourcequota
spec:
  crd:
    spec:
      names:
        kind: K8sEnforceResourceQuota
  targets:
    - target: admission.k8s.gatekeeper.sh
      rego: |
        package k8senforceresourcequota

        violation[{"msg": msg}] {
          input.review.kind.kind == "Pod"
          pod := input.review.object
          namespace := pod.metadata.namespace

          # Get namespace resource quota
          quota := data.inventory.namespace[namespace][_]["v1"]["ResourceQuota"]["resource-quota"]

          # Calculate total CPU requests across all pods
          existing_cpu := sum_cpu_requests(namespace)
          new_cpu := pod_cpu_requests(pod)
          total_cpu := existing_cpu + new_cpu

          # Check against quota limit
          quota_cpu := parse_quantity(quota.spec.hard.cpu)
          total_cpu > quota_cpu

          msg := sprintf("Total CPU requests (%v) would exceed quota (%v)", [total_cpu, quota_cpu])
        }

        sum_cpu_requests(namespace) = total {
          pods := data.inventory.namespace[namespace][_]["v1"]["Pod"]
          requests := [r |
            pod := pods[_]
            container := pod.spec.containers[_]
            r := parse_quantity(container.resources.requests.cpu)
          ]
          total := sum(requests)
        }

        pod_cpu_requests(pod) = total {
          requests := [r |
            container := pod.spec.containers[_]
            r := parse_quantity(container.resources.requests.cpu)
          ]
          total := sum(requests)
        }

        parse_quantity(q) = result {
          endswith(q, "m")
          result := to_number(trim_suffix(q, "m"))
        } else = result {
          result := to_number(q) * 1000
        }
```

This performs cluster-state validation that requires knowledge of all existing resources.

## Syncing with Namespace Filtering

Limit sync to specific namespaces for performance:

```yaml
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
        kind: "Pod"
        namespaces: ["production", "staging"]  # Only sync these namespaces
      - group: "apps"
        version: "v1"
        kind: "Deployment"
        namespaces: ["production"]
```

This reduces memory usage when only certain namespaces need policy enforcement.

## Validating Naming Conventions

Check resource names against existing resources:

```yaml
apiVersion: templates.gatekeeper.sh/v1
kind: ConstraintTemplate
metadata:
  name: k8suniqueingresshost
spec:
  crd:
    spec:
      names:
        kind: K8sUniqueIngressHost
  targets:
    - target: admission.k8s.gatekeeper.sh
      rego: |
        package k8suniqueingresshost

        violation[{"msg": msg}] {
          input.review.kind.kind == "Ingress"
          ingress := input.review.object
          host := ingress.spec.rules[_].host

          # Check all existing ingresses
          existing_ingress := data.inventory.cluster[_]["networking.k8s.io/v1"]["Ingress"][_]
          existing_ingress.metadata.uid != ingress.metadata.uid
          existing_host := existing_ingress.spec.rules[_].host
          host == existing_host

          msg := sprintf("Ingress host '%v' is already in use by %v/%v", [
            host,
            existing_ingress.metadata.namespace,
            existing_ingress.metadata.name
          ])
        }
```

This prevents hostname conflicts across all ingresses in the cluster.

## Monitoring Sync Status

Check sync health and status:

```bash
# View sync status
kubectl get config config -n gatekeeper-system -o yaml

# Check synced resource counts
kubectl get -n gatekeeper-system \
  $(kubectl get crd -o name | grep constraints.gatekeeper.sh) \
  -o json | jq '.status'

# View audit results including synced data
kubectl get constraints -A
```

Monitor metrics:

```bash
# Port forward to Gatekeeper metrics
kubectl port-forward -n gatekeeper-system \
  svc/gatekeeper-webhook-service 8888:443

# Check sync metrics
curl -k https://localhost:8888/metrics | grep gatekeeper_sync
```

Key metrics include `gatekeeper_sync_duration_seconds` and `gatekeeper_sync_last_run_time`.

## Handling Large Datasets

Optimize performance when syncing many resources by excluding namespaces:

```yaml
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
        kind: "ConfigMap"
        # Use label selector to limit synced resources
  match:
    - excludedNamespaces:
      # list of namespaces to exclude
      - default
      # list of processes: https://github.com/open-policy-agent/gatekeeper/blob/master/pkg/controller/config/process/excluder.go#L17-L21
      processes: ["*"]
```

This reduces memory usage by only syncing tagged resources.

## Testing Synced Policies

Verify synced data is available:

```bash
# Create test constraint
cat <<EOF | kubectl apply -f -
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: K8sValidServiceSelector
metadata:
  name: valid-service-selector
spec:
  match:
    kinds:
      - apiGroups: [""]
        kinds: ["Service"]
EOF

# Create a service with no matching deployment (should fail)
kubectl create service clusterip test-service --tcp=80:80

# Create matching deployment
kubectl create deployment test-service --image=nginx

# Now service creation should work
kubectl delete service test-service
kubectl create service clusterip test-service --tcp=80:80
```

## Debugging Sync Issues

Troubleshoot when policies don't see synced data:

```bash
# Check Gatekeeper logs
kubectl logs -n gatekeeper-system -l control-plane=controller-manager

# Verify resources are being synced
kubectl get -n gatekeeper-system pods

# Check if resources appear in audit results
kubectl get constraints -A -o yaml | grep -A10 violations

# Restart Gatekeeper to reset sync
kubectl rollout restart deployment -n gatekeeper-system gatekeeper-controller-manager
```

## Conclusion

OPA Gatekeeper sync enables policies that reference multiple resources, check cluster-wide constraints, and validate cross-resource relationships. Configure sync for the resource types your policies need, use label selectors to limit synced resources, and access synced data through `data.inventory` in Rego. Write constraints that check naming conflicts, validate cross-references, and enforce resource quotas. Monitor sync status and performance, and optimize by limiting sync scope to necessary namespaces and resources.

Sync transforms Gatekeeper from validating individual resources to enforcing cluster-wide consistency and relationships.
