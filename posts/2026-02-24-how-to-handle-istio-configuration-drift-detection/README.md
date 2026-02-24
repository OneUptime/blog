# How to Handle Istio Configuration Drift Detection

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Configuration Drift, GitOps, Kubernetes, Service Mesh

Description: Detect and prevent Istio configuration drift between your desired state and what is actually running in the cluster using practical tools and automation.

---

Configuration drift is when what is running in your cluster no longer matches what you think is running. Someone applies a quick fix with kubectl directly. A failed deployment leaves resources in a partial state. An automated process overwrites a manual change. Over time, these small deviations add up until nobody is really sure what the actual state of the mesh is.

For Istio, configuration drift is particularly dangerous because a single misconfigured VirtualService or AuthorizationPolicy can break traffic routing or create security gaps across your entire mesh.

## Understanding Where Drift Happens

Drift in Istio configuration typically shows up in a few places:

- VirtualServices and DestinationRules that were modified directly in the cluster but not updated in source control
- AuthorizationPolicies that were tweaked during an incident and never reverted
- EnvoyFilters that were added for debugging and forgotten
- Sidecar resources that were changed to troubleshoot connectivity issues
- ConfigMaps in istio-system that were edited manually

The first step in handling drift is knowing where to look.

## Detecting Drift with kubectl diff

The simplest way to check for drift is comparing your Git repository against the live cluster:

```bash
#!/bin/bash

ISTIO_CONFIG_DIR="./istio-configs"
DRIFT_FOUND=false

for file in "$ISTIO_CONFIG_DIR"/*.yaml; do
  echo "Checking $file..."
  DIFF_OUTPUT=$(kubectl diff -f "$file" 2>&1)

  if [ $? -ne 0 ] && [ -n "$DIFF_OUTPUT" ]; then
    echo "DRIFT DETECTED in $file:"
    echo "$DIFF_OUTPUT"
    DRIFT_FOUND=true
  fi
done

if [ "$DRIFT_FOUND" = true ]; then
  echo "Configuration drift detected! Review changes above."
  exit 1
else
  echo "No drift detected. Cluster matches source."
fi
```

Run this in your CI pipeline on a schedule to catch drift early.

## Detecting Resources Not in Source Control

The previous script catches drift in known resources. But what about resources that exist in the cluster but are not in your Git repo at all? Those are often the most problematic.

```bash
#!/bin/bash

ISTIO_CONFIG_DIR="./istio-configs"
NAMESPACES=$(kubectl get namespaces -o jsonpath='{.items[*].metadata.name}')

for ns in $NAMESPACES; do
  for resource_type in virtualservices destinationrules gateways serviceentries authorizationpolicies peerauthentications; do
    LIVE_RESOURCES=$(kubectl get "$resource_type" -n "$ns" -o jsonpath='{.items[*].metadata.name}' 2>/dev/null)

    for resource in $LIVE_RESOURCES; do
      # Check if this resource exists in our source
      if ! grep -r "name: $resource" "$ISTIO_CONFIG_DIR" | grep -q "namespace: $ns"; then
        echo "WARNING: $resource_type/$resource in namespace $ns exists in cluster but not in source control"
      fi
    done
  done
done
```

## Using Argo CD for Drift Detection

If you are using Argo CD, drift detection comes built in. Argo CD continuously compares the desired state in Git with the live state in the cluster and reports any differences.

Set up an Argo CD Application for your Istio configuration:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: istio-config
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/your-org/istio-configs.git
    targetRevision: main
    path: production
  destination:
    server: https://kubernetes.default.svc
    namespace: default
  syncPolicy:
    automated:
      prune: false
      selfHeal: false
    syncOptions:
      - ApplyOutOfSyncOnly=true
```

Notice that `selfHeal` is set to false. This means Argo CD will detect and report drift but will not automatically fix it. This is usually what you want initially - you need to understand why drift happened before automatically reverting it.

Check for drift using the Argo CD CLI:

```bash
# Check sync status
argocd app get istio-config

# See detailed diff
argocd app diff istio-config
```

If you want automatic correction after you are confident in your setup:

```yaml
syncPolicy:
  automated:
    prune: true
    selfHeal: true
```

## Using Flux for Drift Detection

Flux handles drift detection through its reconciliation loop. Set up a Kustomization that watches your Istio config directory:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: istio-config
  namespace: flux-system
spec:
  interval: 5m
  path: ./istio-configs/production
  prune: true
  sourceRef:
    kind: GitRepository
    name: istio-configs
  healthChecks:
    - apiVersion: networking.istio.io/v1beta1
      kind: VirtualService
      name: main-gateway-routes
      namespace: production
  force: false
```

Check for drift with:

```bash
# See reconciliation status
flux get kustomizations

# Force a reconciliation check
flux reconcile kustomization istio-config
```

## Building a Custom Drift Detection CronJob

If you are not using a GitOps tool, you can build your own drift detection that runs inside the cluster:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: istio-drift-detector
  namespace: istio-system
spec:
  schedule: "*/30 * * * *"
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: drift-detector-sa
          containers:
            - name: detector
              image: bitnami/kubectl:latest
              command:
                - /bin/bash
                - -c
                - |
                  # Clone the source of truth
                  git clone https://github.com/your-org/istio-configs.git /tmp/configs

                  DRIFT_FOUND=false

                  for file in /tmp/configs/production/*.yaml; do
                    if kubectl diff -f "$file" 2>&1 | grep -q "^[-+]"; then
                      echo "DRIFT: $(basename $file)"
                      kubectl diff -f "$file" 2>&1
                      DRIFT_FOUND=true
                    fi
                  done

                  if [ "$DRIFT_FOUND" = true ]; then
                    # Send alert (webhook, Slack, etc.)
                    curl -X POST "$SLACK_WEBHOOK" \
                      -H 'Content-Type: application/json' \
                      -d '{"text":"Istio configuration drift detected in production cluster!"}'
                  fi
              env:
                - name: SLACK_WEBHOOK
                  valueFrom:
                    secretKeyRef:
                      name: slack-webhook
                      key: url
          restartPolicy: OnFailure
```

## Preventing Drift with Admission Webhooks

Detection is good, but prevention is better. You can use admission webhooks to block direct modifications to Istio resources that should only be changed through your CI/CD pipeline.

Use a tool like OPA Gatekeeper to enforce this:

```yaml
apiVersion: templates.gatekeeper.sh/v1
kind: ConstraintTemplate
metadata:
  name: istioconfigprotection
spec:
  crd:
    spec:
      names:
        kind: IstioConfigProtection
  targets:
    - target: admission.k8s.gatekeeper.sh
      rego: |
        package istioconfigprotection

        violation[{"msg": msg}] {
          input.review.userInfo.username != "system:serviceaccount:argocd:argocd-application-controller"
          input.review.userInfo.username != "system:serviceaccount:flux-system:kustomize-controller"
          istio_resources := {"VirtualService", "DestinationRule", "Gateway", "AuthorizationPolicy"}
          istio_resources[input.review.kind.kind]
          msg := sprintf("Direct modification of %v is not allowed. Use the GitOps pipeline.", [input.review.kind.kind])
        }
```

Apply the constraint:

```yaml
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: IstioConfigProtection
metadata:
  name: protect-istio-config
spec:
  match:
    kinds:
      - apiGroups: ["networking.istio.io"]
        kinds: ["VirtualService", "DestinationRule", "Gateway"]
      - apiGroups: ["security.istio.io"]
        kinds: ["AuthorizationPolicy", "PeerAuthentication"]
```

## Handling Drift When It Is Found

When you detect drift, you have two choices: accept the live state or revert to the desired state.

To revert to the desired state:

```bash
# Apply the source of truth
kubectl apply -f istio-configs/production/ --force-conflicts --server-side
```

To accept the live state and update source control:

```bash
# Export the live resource
kubectl get virtualservice my-service -n production -o yaml > istio-configs/production/my-service-vs.yaml

# Clean up metadata
yq eval 'del(.metadata.resourceVersion, .metadata.uid, .metadata.creationTimestamp, .metadata.generation, .metadata.managedFields)' -i istio-configs/production/my-service-vs.yaml

# Commit and push
git add istio-configs/production/my-service-vs.yaml
git commit -m "Accept live state for my-service VirtualService"
git push
```

## Summary

Configuration drift in Istio is inevitable unless you actively prevent it. The best approach combines multiple layers: use GitOps tools for continuous reconciliation, run scheduled drift detection scripts as a safety net, and consider admission webhooks to block unauthorized changes entirely. Whatever combination you choose, the goal is the same: make sure what is in your cluster matches what is in your source control.
