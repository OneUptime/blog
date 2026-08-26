# How to Run the CockroachDB Operator Under Kubernetes Restricted Pod Security

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: CockroachDB, Kubernetes, CockroachDB Operator, Pod Security, SecurityContext, Helm

Description: Run the GA v1beta1 CockroachDB Operator and its database pods in a namespace enforcing Kubernetes Restricted Pod Security without relying on a root ownership init container.

---

Kubernetes Pod Security Admission evaluates pods when they are created or updated. Adding `pod-security.kubernetes.io/enforce=restricted` to a namespace does not harden a workload after admission; it rejects any pod template that violates the Restricted profile. A successful CockroachDB deployment therefore requires every operator, initialization, certificate, sidecar, and database container to satisfy the policy before enforcement begins.

This guide targets the GA CockroachDB Operator and `crdb.cockroachlabs.com/v1beta1`. It does not use the deprecated public operator's `v1alpha1` fields. In particular, current database-pod overrides belong under `spec.template.spec.podTemplate`, not legacy top-level `securityContext`, `affinity`, or `topologySpreadConstraints` fields.

## Audit the Rendered Workload, Not Just the Values File

The Restricted profile requires Linux containers to run without privilege escalation, drop all capabilities, run as non-root, and use an allowed seccomp profile. It also rejects privileged containers, host namespaces, and several unsafe volume types.

As of the GA `cockroachdb-operator-chart` 1.0.0, the chart-generated operator Deployment does not expose pod or container security-context values. Its image metadata also does not declare a non-root `USER`. The `CrdbCluster` API does support a complete Kubernetes `PodSpec`, but `dropChownContainer` defaults to false and retains an ownership-changing init container. A root `chown` container cannot be admitted under Restricted policy.

Render the exact pinned chart before installation and let a policy engine inspect every pod template:

```bash
export OPERATOR_CHART_VERSION=1.0.0
export OPERATOR_NAMESPACE=cockroach-operator-system

helm template crdb-operator \
  oci://registry-1.docker.io/cockroachdb/cockroachdb-operator-chart \
  --version "$OPERATOR_CHART_VERSION" \
  --namespace "$OPERATOR_NAMESPACE" \
  > operator-rendered.yaml
```

Use `kubectl diff`, a server-side dry run against a staging API server, and your admission-policy test tooling. Client-side YAML parsing alone cannot predict CSI ownership behavior or image runtime requirements.

## Apply a Durable Overlay to the Operator Deployment

Do not install the unmodified Deployment and patch it by hand afterward. A later Helm or GitOps reconciliation would remove the patch. The CockroachDB GA announcement explicitly supports using the checked-in operator bundle with a Kustomize or GitOps overlay.

Place the rendered manifest and this `kustomization.yaml` in an audited deployment directory:

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - operator-rendered.yaml
patches:
  - target:
      group: apps
      version: v1
      kind: Deployment
      name: cockroach-operator
    patch: |-
      apiVersion: apps/v1
      kind: Deployment
      metadata:
        name: cockroach-operator
      spec:
        template:
          spec:
            securityContext:
              runAsNonRoot: true
              runAsUser: 1000
              runAsGroup: 1000
              fsGroup: 1000
              fsGroupChangePolicy: OnRootMismatch
              seccompProfile:
                type: RuntimeDefault
            containers:
              - name: cockroach-operator
                securityContext:
                  allowPrivilegeEscalation: false
                  capabilities:
                    drop:
                      - ALL
```

The `fsGroup` matters when the operator copies webhook certificates into an `emptyDir`. Pin the operator image digest and test that exact build as UID/GID 1000; the API does not promise that every future image will use that identity. Do not add `readOnlyRootFilesystem: true` merely to make a scanner quiet unless the pinned image has been tested with it. Restricted Pod Security does not require a read-only root filesystem.

Install the CRDs first, because Kustomize cannot admit `CrdbCluster` objects until the API exists. Then create and label the operator namespace and apply the overlay:

```bash
kubectl create namespace "$OPERATOR_NAMESPACE"

kubectl label namespace "$OPERATOR_NAMESPACE" \
  pod-security.kubernetes.io/enforce=restricted \
  pod-security.kubernetes.io/enforce-version=latest \
  pod-security.kubernetes.io/audit=restricted \
  pod-security.kubernetes.io/audit-version=latest \
  pod-security.kubernetes.io/warn=restricted \
  pod-security.kubernetes.io/warn-version=latest

kubectl apply -f crdb.cockroachlabs.com_crdbclusters.yaml
kubectl apply -f crdb.cockroachlabs.com_crdbnodes.yaml
kubectl apply -k . --server-side
```

Pin an explicit Kubernetes minor version instead of `latest` if your platform requires policy behavior to remain unchanged across control-plane upgrades.

## Make Operator-Managed CockroachDB Pods Restricted-Compliant

The database namespace is evaluated independently. The following is the security-relevant portion of a current `v1beta1` `CrdbCluster`. Merge it into a complete manifest that also defines regions, storage, image, TLS, and resources:

```yaml
apiVersion: crdb.cockroachlabs.com/v1beta1
kind: CrdbCluster
metadata:
  name: cockroachdb
  namespace: cockroachdb
spec:
  template:
    spec:
      dropChownContainer: true
      podTemplate:
        metadata:
          labels:
            app.kubernetes.io/name: cockroachdb
            app.kubernetes.io/instance: cockroachdb
            app.kubernetes.io/component: cockroachdb
        spec:
          securityContext:
            runAsNonRoot: true
            runAsUser: 1000
            runAsGroup: 1000
            fsGroup: 1000
            fsGroupChangePolicy: OnRootMismatch
            seccompProfile:
              type: RuntimeDefault
          initContainers:
            - name: cockroachdb-init
              securityContext:
                runAsNonRoot: true
                allowPrivilegeEscalation: false
                capabilities:
                  drop:
                    - ALL
          containers:
            - name: cockroachdb
              securityContext:
                runAsNonRoot: true
                allowPrivilegeEscalation: false
                capabilities:
                  drop:
                    - ALL
            - name: cert-reloader
              securityContext:
                runAsNonRoot: true
                allowPrivilegeEscalation: false
                capabilities:
                  drop:
                    - ALL
```

The current API merges container lists by name. `cockroachdb-init`, `cockroachdb`, and, for TLS deployments, `cert-reloader` are the operator-injected names. Verify them against the chart and operator version you deploy. Do not add a placeholder `cert-reloader` override to an insecure cluster without first checking the rendered pod behavior.

The `dropChownContainer` field is part of GA `v1beta1`; it is not the deprecated public operator's similarly shaped configuration. Dropping that container is safe only when the storage driver honors `fsGroup`, the volume root is group-writable, and existing contents are accessible by the chosen group. Test a fresh PVC before applying the pattern to existing data. If the CSI driver does not support mount-group ownership, fix ownership through the storage platform rather than weakening Restricted policy or running `chmod -R 777`.

In chart `26.2.4`, the initial self-signer and cleaner Jobs enable a non-root UID/GID, `RuntimeDefault`, capability dropping, and disabled privilege escalation when `cockroachdb.tls.selfSigner.securityContext.enabled=true`. The default certificate-rotation CronJobs do **not** apply those pod and container security contexts, however, so pods they create will be denied in a Restricted namespace. Prefer cert-manager or externally managed certificates there. If the self-signer rotation feature is required, apply a durable, release-pinned post-renderer or GitOps overlay to both rotation CronJobs and verify the generated Job pods under Restricted admission before enabling `rotateCerts`. Any user-supplied sidecar or init container must receive equivalent settings.

## Enforce in Stages for Existing Clusters

For an existing namespace, start with `warn` and `audit`, not immediate enforcement:

```bash
kubectl label namespace cockroachdb \
  pod-security.kubernetes.io/warn=restricted \
  pod-security.kubernetes.io/audit=restricted \
  --overwrite

kubectl get pods -n cockroachdb -o yaml > pre-restricted-pods.yaml
kubectl get crdbcluster,crdbnode,pvc -n cockroachdb
```

Update the declarative source, allow the operator to roll one node at a time, and verify CockroachDB replication health before it advances. Existing running pods are not retroactively killed by a new namespace label, but future restarts will be denied if their templates remain noncompliant. After all generated pod specs pass server-side dry run and all nodes are healthy, enable enforcement.

Do not relabel a production namespace during an active upgrade, scale-down, storage repair, or certificate rotation. Preserve tested backups, monitor unavailable and under-replicated ranges, and keep a reviewed rollback of the manifest overlay. A Pod Security exemption is a governance decision, not an application-level workaround.

## Verify Admission and Runtime Identity

```bash
kubectl get pods -n "$OPERATOR_NAMESPACE" -o wide
kubectl get pods -n cockroachdb -o wide

kubectl get pod -n cockroachdb cockroachdb-0 \
  -o jsonpath='{.spec.securityContext}{"\n"}{range .spec.initContainers[*]}init/{.name}={.securityContext}{"\n"}{end}{range .spec.containers[*]}container/{.name}={.securityContext}{"\n"}{end}'

kubectl exec -n cockroachdb cockroachdb-0 -c cockroachdb -- id
kubectl auth can-i --as=system:serviceaccount:cockroachdb:cockroachdb get nodes
```

Also inspect namespace events and the operator logs for admission denials. Running as non-root does not reduce the operator's Kubernetes RBAC: the GA chart still grants cluster-scoped permissions. Scope watched namespaces and service accounts separately; Pod Security and RBAC solve different problems.

## Official Documentation

- [CockroachDB GA Operator announcement and v1beta1 example](https://www.cockroachlabs.com/blog/cockroachdb-kubernetes-operator/)
- [CockroachDB Operator chart 1.0.0 changelog](https://github.com/cockroachdb/helm-charts/blob/master/cockroachdb-parent/charts/operator/CHANGELOG.md)
- [Authoritative v1beta1 API reference and deprecated-field mapping](https://github.com/cockroachdb/helm-charts/blob/master/cockroachdb-parent/charts/operator/api/README.md)
- [GA v1beta1 pod-template example](https://github.com/cockroachdb/helm-charts/blob/master/cockroachdb-parent/charts/operator/manifests/examples/crdb/pod-template.yaml)
- [GA operator Deployment template](https://github.com/cockroachdb/helm-charts/blob/master/cockroachdb-parent/charts/operator/templates/operator.yaml)
- [Kubernetes Pod Security Standards](https://kubernetes.io/docs/concepts/security/pod-security-standards/)
- [Kubernetes Pod Security Admission labels](https://kubernetes.io/docs/tasks/configure-pod-container/enforce-standards-namespace-labels/)
- [Kubernetes security contexts and volume ownership](https://kubernetes.io/docs/tasks/configure-pod-container/security-context/)
- [Kubernetes Kustomize documentation](https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/)

## Conclusion

Restricted Pod Security must be designed into both halves of the deployment. Apply a durable non-root overlay to the GA operator Deployment, configure the `v1beta1` pod template by container name, and remove the root ownership init container only after confirming CSI `fsGroup` behavior. Audit first, roll database nodes safely, then enforce the namespace policy. Namespace labels alone cannot correct a noncompliant generated pod.
