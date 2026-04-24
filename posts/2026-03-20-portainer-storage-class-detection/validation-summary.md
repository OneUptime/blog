# Validation Summary: How to Fix 'Storage Class Detection Error' in Portainer - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Kubernetes
- kubectl
- Helm
- Kubernetes RBAC
- StorageClass / PersistentVolumeClaim
- Rancher Local Path Provisioner
- Longhorn

## Sources Consulted
- Portainer install on Kubernetes: https://docs.portainer.io/sts/start/install-ce/server/kubernetes/baremetal
- Portainer Helm chart configuration options: https://docs.portainer.io/sts/advanced/helm-chart-configuration-options
- Portainer API access: https://docs.portainer.io/api/access
- Portainer API usage examples: https://docs.portainer.io/sts/api/examples
- Portainer Kubernetes cluster setup UI: https://docs.portainer.io/user/kubernetes/cluster/setup
- Portainer Kubernetes roles and bindings: https://docs.portainer.io/2.21/advanced/kubernetes-roles-and-bindings
- Kubernetes StorageClass concept: https://kubernetes.io/docs/concepts/storage/storage-classes/
- Kubernetes StorageClass API reference: https://kubernetes.io/docs/reference/kubernetes-api/config-and-storage-resources/storage-class-v1/
- Kubernetes `kubectl version` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_version/
- Kubernetes `kubectl auth can-i` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i/
- Rancher Local Path Provisioner README / install instructions: https://github.com/rancher/local-path-provisioner
- Longhorn install with kubectl: https://longhorn.io/docs/latest/deploy/install/install-with-kubectl/
- Longhorn concepts: https://longhorn.io/docs/latest/concepts/

## Issues Found
- The description said StorageClass problems could involve missing "CRDs". StorageClass is a built-in Kubernetes API resource under `storage.k8s.io/v1`, not a CRD. I changed this to refer to storage API availability.
- Step 2 said `kubectl describe storageclass` should be used when no storage classes exist, which is backwards. I changed it to a detail command for an existing class and made the API-resource check target `storage.k8s.io` explicitly.
- Step 3 hard-coded the Portainer service account as `portainer`. Current Portainer Helm defaults use `serviceAccount.name: portainer-sa-clusteradmin`, and the practical way to verify the live service account is to read it from the deployment. I changed the commands to discover the deployed service account first.
- Step 3 also had an invalid RBAC rule: it put `persistentvolumes` under the `storage.k8s.io` API group and granted unnecessary `create` / `delete` verbs. I replaced it with a minimal, correct `storageclasses` read role (`get`, `list`, `watch`) for this specific detection issue, matching Kubernetes API grouping and Portainer RBAC docs.
- Step 4 bound the wrong service account name and used overly generic role names that could collide with other Portainer RBAC objects. I updated the binding to the discovered service account and used a storageclass-specific role/binding name.
- Step 5 used the moving `master` branch manifest for Local Path Provisioner. The upstream project documents a stable release manifest; I updated it to `v0.0.35`.
- Step 5 pinned Longhorn to `v1.6.1`, which is outdated relative to current Longhorn docs. I updated it to the current documented install manifest (`v1.11.1`).
- Step 5 waited on `deployment longhorn-manager`, but Longhorn documents `longhorn-manager` as a DaemonSet and recommends watching pods during installation. I changed the readiness check accordingly.
- Step 7 used `kubectl version --short`, which is no longer in the current kubectl reference. I replaced it with `kubectl version`.
- Step 8 used unsupported Portainer Helm values `rbac.create` and `rbac.clusterAdmin`. Current Portainer chart docs expose `localMgmt`, `serviceAccount.*`, and standard install commands instead. I replaced the snippet with the official repo-add/update flow and a supported `helm upgrade --install` command.
- Step 9 used a legacy password-to-JWT flow and the wrong Kubernetes gateway path: `.../kubernetes/api/v1/storageclasses` treats StorageClass like a core API resource, but StorageClass lives under `/apis/storage.k8s.io/v1/storageclasses`. I updated the example to the current API-token pattern (`X-API-Key`) and corrected the proxied Kubernetes API path.
- Step 10 referenced an outdated Portainer UI flow (`Configure Cluster` and a specific toggle label). Current Portainer docs place this under `Cluster` -> `Setup` -> `Available storage options`, so I updated the navigation steps.

## Review Notes
- The Step 9 API path correction is an inference from two official sources combined: Portainer documents that `/api/endpoints/<id>/kubernetes/...` proxies Kubernetes API requests, and Kubernetes documents that StorageClass list calls use `/apis/storage.k8s.io/v1/storageclasses`.
- Portainer's current API guidance prefers HTTPS on port `9443` and API access tokens via `X-API-Key`; legacy HTTP on `9000` and JWT login examples still appear in older/example material, but are no longer the primary documented approach.
- The Longhorn and Local Path Provisioner version pins are correct as of April 24, 2026, but these are release-specific URLs and will age over time.
