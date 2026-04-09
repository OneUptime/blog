# How to Deploy the Ceph Toolbox Pod in Rook

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Toolbox, Kubernetes, Debugging, Administration

Description: Learn how to deploy the Ceph toolbox pod in Rook to get interactive access to ceph and rados CLI tools for cluster administration and troubleshooting.

---

## Overview

The Ceph toolbox pod provides a containerized environment with all Ceph CLI tools pre-installed and configured to connect to your Rook-managed Ceph cluster. It is the primary way to run `ceph`, `rados`, `rbd`, `radosgw-admin`, and other Ceph management commands in a Rook deployment.

## Deploying the Toolbox

Rook provides a pre-built toolbox manifest. Deploy it using the official Rook configuration:

```bash
kubectl apply -f https://raw.githubusercontent.com/rook/rook/master/deploy/examples/toolbox.yaml
```

Alternatively, create the toolbox manually:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: rook-ceph-tools
  namespace: rook-ceph
  labels:
    app: rook-ceph-tools
spec:
  replicas: 1
  selector:
    matchLabels:
      app: rook-ceph-tools
  template:
    metadata:
      labels:
        app: rook-ceph-tools
    spec:
      dnsPolicy: ClusterFirstWithHostNet
      serviceAccountName: rook-ceph-default
      containers:
        - name: rook-ceph-tools
          image: quay.io/ceph/ceph:v19
          command:
            - /bin/bash
            - -c
            - |
              CEPH_CONFIG="/etc/ceph/ceph.conf"
              MON_CONFIG="/etc/rook/mon-endpoints"
              KEYRING_FILE="/etc/ceph/keyring"

              write_endpoints() {
                endpoints=$(cat ${MON_CONFIG})
                mon_endpoints=$(echo "${endpoints}" | sed 's/[a-z0-9_-]\+=//g')
                cat <<EOF > ${CEPH_CONFIG}
              [global]
              mon_host = ${mon_endpoints}

              [client.admin]
              keyring = ${KEYRING_FILE}
              EOF
              }

              ceph_secret=${ROOK_CEPH_SECRET}
              if [[ "$ceph_secret" == "" ]]; then
                ceph_secret=$(cat /var/lib/rook-ceph-mon/secret.keyring)
              fi

              cat <<EOF > ${KEYRING_FILE}
              [${ROOK_CEPH_USERNAME}]
              key = ${ceph_secret}
              EOF

              write_endpoints
              while true; do sleep 10; done
          imagePullPolicy: IfNotPresent
          tty: true
          securityContext:
            runAsNonRoot: true
            runAsUser: 2016
            runAsGroup: 2016
            capabilities:
              drop: ["ALL"]
          env:
            - name: ROOK_CEPH_USERNAME
              valueFrom:
                secretKeyRef:
                  name: rook-ceph-mon
                  key: ceph-username
          volumeMounts:
            - mountPath: /etc/ceph
              name: ceph-config
            - name: mon-endpoint-volume
              mountPath: /etc/rook
            - name: ceph-admin-secret
              mountPath: /var/lib/rook-ceph-mon
              readOnly: true
      volumes:
        - name: ceph-admin-secret
          secret:
            secretName: rook-ceph-mon
            optional: false
            items:
              - key: ceph-secret
                path: secret.keyring
        - name: mon-endpoint-volume
          configMap:
            name: rook-ceph-mon-endpoints
            items:
              - key: data
                path: mon-endpoints
        - name: ceph-config
          emptyDir: {}
      tolerations:
        - key: "node.kubernetes.io/unreachable"
          operator: "Exists"
          effect: "NoExecute"
          tolerationSeconds: 5
```

Apply the manifest:

```bash
kubectl apply -f toolbox.yaml
```

## Verifying the Toolbox

Wait for the toolbox pod to be running:

```bash
kubectl -n rook-ceph get pod -l app=rook-ceph-tools
```

Expected output:

```text
NAME                              READY   STATUS    RESTARTS   AGE
rook-ceph-tools-xxx               1/1     Running   0          30s
```

## Accessing the Toolbox

Open an interactive shell in the toolbox:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- bash
```

Or run a single command directly:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph status
```

## Verifying Cluster Connectivity

Once inside the toolbox, run a quick connectivity test:

```bash
ceph status
```

Expected output showing a healthy cluster:

```text
  cluster:
    id:     abc12345-...
    health: HEALTH_OK

  services:
    mon: 3 daemons, quorum a,b,c (age 1h)
    mgr: a(active, since 1h)
    mds: 1/1 daemons up, 1 hot standby
    osd: 6 osds: 6 up (since 1h), 6 in (since 1h)

  data:
    volumes: 1/1 healthy
    pools:   5 pools, 96 pgs
    objects: 42 objects, 1.2 GiB
    usage:   5.4 GiB used, 295 GiB / 300 GiB avail
    pgs:     96 active+clean
```

## Using the Toolbox for Common Tasks

Check OSD status:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd status
```

List storage pools:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd pool ls detail
```

Check cluster health details:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph health detail
```

## Removing the Toolbox

Delete the toolbox deployment when no longer needed:

```bash
kubectl -n rook-ceph delete deployment rook-ceph-tools
```

## Summary

The Ceph toolbox pod in Rook provides a pre-configured environment with all Ceph CLI tools connected to your cluster. Deploy it using the official Rook toolbox manifest or a custom deployment, then use `kubectl exec` to run commands interactively or non-interactively. The toolbox is essential for cluster administration, troubleshooting, and running diagnostic commands that are not directly exposed through Kubernetes CRDs.
