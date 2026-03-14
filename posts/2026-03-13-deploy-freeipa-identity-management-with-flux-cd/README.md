# How to Deploy FreeIPA Identity Management with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, FreeIPA, Identity Management, LDAP, Kerberos

Description: Deploy FreeIPA identity management system to Kubernetes using Flux CD for a GitOps-managed, enterprise-grade directory and authentication platform.

---

## Introduction

FreeIPA is a comprehensive identity management solution that bundles LDAP (389 Directory Server), Kerberos, DNS, NTP, certificate authority (Dogtag), and a management UI into a single integrated system. It is the upstream project for Red Hat Identity Management and is widely used in Linux-heavy enterprise environments where Kerberos single sign-on and host-based access control are required.

Deploying FreeIPA in Kubernetes requires some care because it is a stateful, multi-protocol server with strict hostname and networking requirements. The container images maintained by the FreeIPA project support Kubernetes deployments, and Flux CD can manage the StatefulSet, PersistentVolumeClaim, and Service resources declaratively.

This guide deploys a standalone FreeIPA server using Kubernetes manifests managed by Flux CD's Kustomization, suitable for development and small production environments.

## Prerequisites

- Kubernetes cluster (v1.26+) with Flux CD bootstrapped
- Persistent storage (ReadWriteOnce, at least 10 GB)
- A resolvable hostname for the FreeIPA server (DNS or `/etc/hosts`)
- `flux` and `kubectl` CLIs configured

## Step 1: Create the Namespace

```yaml
# clusters/my-cluster/freeipa/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: freeipa
```

## Step 2: Create Secrets

```bash
kubectl create secret generic freeipa-secrets \
  --namespace freeipa \
  --from-literal=ipa-admin-password=FreeIPA_Admin1! \
  --from-literal=ipa-dm-password=FreeIPA_DM_Pass1!
```

## Step 3: Create the PersistentVolumeClaim

```yaml
# clusters/my-cluster/freeipa/pvc.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: freeipa-data
  namespace: freeipa
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi
```

## Step 4: Create the FreeIPA StatefulSet

```yaml
# clusters/my-cluster/freeipa/statefulset.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: freeipa
  namespace: freeipa
spec:
  serviceName: freeipa
  replicas: 1
  selector:
    matchLabels:
      app: freeipa
  template:
    metadata:
      labels:
        app: freeipa
    spec:
      # FreeIPA requires a stable hostname matching its Kerberos realm
      hostname: ipa
      subdomain: freeipa
      containers:
        - name: freeipa
          image: freeipa/freeipa-server:fedora-40
          args:
            - ipa-server-install
            - --unattended
            - --realm=EXAMPLE.COM
            - --domain=example.com
            - --hostname=ipa.example.com
            - --no-ntp             # NTP managed by the cluster
            - --setup-dns
            - --no-forwarders
          env:
            - name: IPA_SERVER_INSTALL_OPTS
              value: ""
            - name: PASSWORD
              valueFrom:
                secretKeyRef:
                  name: freeipa-secrets
                  key: ipa-admin-password
          ports:
            - containerPort: 80
              name: http
            - containerPort: 443
              name: https
            - containerPort: 389
              name: ldap
            - containerPort: 636
              name: ldaps
            - containerPort: 88
              name: kerberos-tcp
              protocol: TCP
            - containerPort: 88
              name: kerberos-udp
              protocol: UDP
          volumeMounts:
            - name: freeipa-data
              mountPath: /data
            - name: freeipa-run
              mountPath: /run
            - name: freeipa-tmp
              mountPath: /tmp
          # FreeIPA installation takes several minutes
          readinessProbe:
            httpGet:
              path: /ipa/ui/
              port: 443
              scheme: HTTPS
            initialDelaySeconds: 120
            periodSeconds: 15
            failureThreshold: 20
          # FreeIPA requires some Linux capabilities
          securityContext:
            capabilities:
              add:
                - SYS_TIME
                - NET_ADMIN
          resources:
            requests:
              cpu: 500m
              memory: 1Gi
            limits:
              cpu: "2"
              memory: 3Gi
      volumes:
        - name: freeipa-data
          persistentVolumeClaim:
            claimName: freeipa-data
        - name: freeipa-run
          emptyDir:
            medium: Memory
        - name: freeipa-tmp
          emptyDir: {}
```

## Step 5: Create the Service

```yaml
# clusters/my-cluster/freeipa/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: freeipa
  namespace: freeipa
spec:
  selector:
    app: freeipa
  clusterIP: None   # Headless service for StatefulSet DNS
  ports:
    - name: http
      port: 80
    - name: https
      port: 443
    - name: ldap
      port: 389
    - name: ldaps
      port: 636
    - name: kerberos
      port: 88
---
# External LoadBalancer for out-of-cluster access
apiVersion: v1
kind: Service
metadata:
  name: freeipa-external
  namespace: freeipa
spec:
  selector:
    app: freeipa
  type: LoadBalancer
  ports:
    - name: https
      port: 443
      targetPort: 443
    - name: ldaps
      port: 636
      targetPort: 636
```

## Step 6: Create the Kustomization

```yaml
# clusters/my-cluster/freeipa/kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: freeipa
  namespace: flux-system
spec:
  interval: 10m
  path: ./clusters/my-cluster/freeipa
  prune: true
  sourceRef:
    kind: GitRepository
    name: fleet-repo
  # FreeIPA takes time to initialize
  timeout: 20m
  healthChecks:
    - apiVersion: apps/v1
      kind: StatefulSet
      name: freeipa
      namespace: freeipa
```

## Step 7: Verify and Access the Admin UI

```bash
# Watch Flux reconcile
flux get kustomizations freeipa --watch

# Monitor the installation (takes 5-15 minutes on first run)
kubectl logs -n freeipa freeipa-0 -f

# Test LDAP connectivity
kubectl exec -n freeipa freeipa-0 -- \
  ldapsearch -H ldap://localhost -D "cn=Directory Manager" \
  -w FreeIPA_DM_Pass1! -b "dc=example,dc=com" -s base
```

Access the FreeIPA web UI at the LoadBalancer IP or through an Ingress pointing to port 443.

## Best Practices

- Use a dedicated DNS entry for the FreeIPA server hostname; Kerberos is extremely sensitive to DNS resolution.
- Enable `securityContext.capabilities` only for the FreeIPA container-do not use a permissive pod security policy cluster-wide.
- Schedule regular backups using `ipa-backup --data` and store the archives in object storage.
- For production, deploy FreeIPA as a replica pair for high availability, following the upstream replication documentation.
- Integrate FreeIPA with Keycloak or Authentik via LDAP federation for OIDC/SAML SSO without modifying FreeIPA directly.

## Conclusion

FreeIPA is now deployed on Kubernetes and managed by Flux CD. Your organization has a fully integrated identity management platform providing LDAP, Kerberos, and certificate authority services. While FreeIPA's stateful nature requires extra care around DNS and persistence, Flux CD ensures the deployment manifests remain in sync with Git, and any configuration change is fully auditable through your version history.
