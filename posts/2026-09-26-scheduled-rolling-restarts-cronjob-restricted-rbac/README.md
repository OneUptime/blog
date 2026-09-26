# How to Schedule Periodic Rolling Restarts with a Kubernetes CronJob and Least-Privilege RBAC

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, CronJob, RBAC, Deployment

Description: Schedule bounded Deployment restarts with a dedicated service account, permissions restricted to one Deployment, explicit job deadlines, and observable failure behavior.

---

A periodic restart can be useful for a temporary operational workaround or a workload with an explicit maintenance requirement. Implement it as an observable change: a Job requests one rolling restart and remains active until the rollout completes or fails.

The example targets an existing `api` Deployment in the `production` namespace. Its readiness probes, rollout strategy, capacity, and shutdown behavior must already support replacement. A schedule cannot make an unsafe restart harmless.

## Give the Job access to one Deployment

Create a dedicated service account and a namespaced Role:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: api-restarter
  namespace: production
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: api-restarter
  namespace: production
rules:
  - apiGroups: [apps]
    resources: [deployments]
    resourceNames: [api]
    verbs: [get, list, watch, patch]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: api-restarter
  namespace: production
subjects:
  - kind: ServiceAccount
    name: api-restarter
    namespace: production
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: api-restarter
```

Named restart needs read and patch access. The status wait also uses list/watch requests restricted by `metadata.name`; Kubernetes [RBAC](https://kubernetes.io/docs/reference/access-authn-authz/rbac/#referring-to-resources) requires that field selector when list/watch permission is limited by `resourceNames`. The upstream [rollout status implementation](https://github.com/kubernetes/kubectl/blob/master/pkg/cmd/rollout/rollout_status.go) sets it for a named target. Verify this behavior for your pinned kubectl version.

The Role grants no access to Secrets or Pod deletion. However, `patch` on this Deployment can change more than a restart annotation. RBAC cannot restrict the patch to one field. Use an admission policy or an intermediary API if the service account must be technically incapable of other template changes.

## Keep the Job alive for the rollout

Use a reviewed internal tooling image containing `/bin/sh` and kubectl, pinned by digest in your actual manifest. The illustrative image below must be replaced with that image, using a kubectl version supported by your cluster.

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: restart-api
  namespace: production
spec:
  schedule: "0 2 * * *"
  timeZone: Etc/UTC
  concurrencyPolicy: Forbid
  startingDeadlineSeconds: 300
  successfulJobsHistoryLimit: 2
  failedJobsHistoryLimit: 3
  jobTemplate:
    spec:
      backoffLimit: 0
      activeDeadlineSeconds: 720
      template:
        spec:
          serviceAccountName: api-restarter
          restartPolicy: Never
          securityContext:
            runAsNonRoot: true
            runAsUser: 10001
            runAsGroup: 10001
            fsGroup: 10001
            seccompProfile:
              type: RuntimeDefault
          containers:
            - name: restart
              image: registry.example.com/platform/kubectl-tools:approved
              command: ["/bin/sh", "-ec"]
              args:
                - |
                  kubectl --cache-dir=/tmp/cache -n production \
                    rollout status deployment/api --timeout=30s
                  kubectl --cache-dir=/tmp/cache -n production \
                    rollout restart deployment/api
                  kubectl --cache-dir=/tmp/cache -n production \
                    rollout status deployment/api --timeout=10m
              resources:
                requests:
                  cpu: 50m
                  memory: 64Mi
                limits:
                  cpu: 200m
                  memory: 128Mi
              securityContext:
                allowPrivilegeEscalation: false
                readOnlyRootFilesystem: true
                capabilities:
                  drop: [ALL]
              volumeMounts:
                - name: temporary
                  mountPath: /tmp
          volumes:
            - name: temporary
              emptyDir: {}
```

The initial wait refuses to add a restart to an already stalled rollout. It is a precheck, not a lock. The final wait makes rollout failure visible as Job failure, and the Job deadline bounds API hangs or unexpected client behavior. `backoffLimit: 0` avoids automatically issuing another restart after a failed attempt.

The [CronJob documentation](https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/) distinguishes the missed-start deadline from concurrency policy. `Forbid` applies only to Jobs from this CronJob; it does not serialize other CronJobs, manually created Jobs, or deployment pipelines. A CronJob is not an exactly-once scheduler, so duplicate starts remain possible. Use a shared release lock or a persisted, idempotent maintenance request when that distinction matters.

## Check the permission boundary and actual execution

An administrator with impersonation permission can check positive and negative cases:

```bash
identity=system:serviceaccount:production:api-restarter
kubectl auth can-i patch deployments/api -n production --as="$identity"
kubectl auth can-i patch deployments/another-api -n production --as="$identity"
kubectl auth can-i get secrets -n production --as="$identity"
```

The first should be allowed and the others denied. Also exercise the actual named status command using the service account in a staging Job; a permission check alone does not prove the client's watch request has the required selector. Cluster default discovery permissions normally support kubectl discovery; a cluster that removes them requires separate review.

After applying the manifests, run one controlled test outside other maintenance:

```bash
kubectl -n production create job --from=cronjob/restart-api restart-api-test
kubectl -n production logs job/restart-api-test
kubectl -n production get job restart-api-test
kubectl -n production rollout status deployment/api --timeout=10m
```

A manually created Job is not serialized by the CronJob's concurrency policy. Review its failure condition and application health before enabling routine operation. Alert on failed or overdue maintenance Jobs using your existing monitoring.

To stop future schedules, set the CronJob's `spec.suspend` to true. Suspension does not stop an active Job, and terminating the Job does not reverse a restart already submitted to the Deployment. Keep that distinction in the maintenance runbook and remove the schedule once its operational purpose ends.
