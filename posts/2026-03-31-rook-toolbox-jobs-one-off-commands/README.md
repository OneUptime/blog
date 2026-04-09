# How to Use Toolbox Jobs for One-Off Commands in Rook

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Kubernetes, Toolbox, Job, Administration

Description: Use Rook-Ceph toolbox Jobs to run administrative Ceph commands as Kubernetes Jobs for automation, scripting, and one-off cluster maintenance tasks.

---

## Overview

The Rook-Ceph toolbox pod is great for interactive use, but for automation - CI/CD pipelines, cron tasks, or scripted maintenance - you need Kubernetes Jobs. Rook supports a "toolbox job" pattern that runs `ceph` commands as ephemeral Kubernetes Jobs rather than requiring a persistent toolbox pod.

## Basic Toolbox Job

Create a Job that runs a single Ceph command:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: ceph-status-check
  namespace: rook-ceph
spec:
  template:
    spec:
      initContainers:
        - name: config-init
          image: rook/ceph:v1.13.0
          command: ["/usr/local/bin/toolbox.sh"]
          args: ["--skip-watch"]
          imagePullPolicy: IfNotPresent
          env:
            - name: ROOK_CEPH_USERNAME
              valueFrom:
                secretKeyRef:
                  name: rook-ceph-mon
                  key: ceph-username
          volumeMounts:
            - mountPath: /etc/ceph
              name: ceph-config
            - mountPath: /etc/rook
              name: mon-endpoint-volume
            - mountPath: /var/lib/rook-ceph-mon
              name: ceph-admin-secret
      containers:
        - name: toolbox
          image: quay.io/ceph/ceph:v18.2.0
          command:
            - ceph
            - status
          volumeMounts:
            - mountPath: /etc/ceph
              name: ceph-config
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
      restartPolicy: Never
```

## Using the Rook Toolbox Job Template

Rook provides a simpler way using the `rook-ceph-tools` deployment config as a reference. Create a lightweight toolbox job:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: rook-ceph-toolbox-job
  namespace: rook-ceph
spec:
  template:
    spec:
      initContainers:
        - name: config-init
          image: rook/ceph:v1.13.0
          command: ["/usr/local/bin/toolbox.sh"]
          args: ["--skip-watch"]
          imagePullPolicy: IfNotPresent
          env:
            - name: ROOK_CEPH_USERNAME
              valueFrom:
                secretKeyRef:
                  name: rook-ceph-mon
                  key: ceph-username
          volumeMounts:
            - mountPath: /etc/ceph
              name: ceph-config
            - mountPath: /etc/rook
              name: mon-endpoint-volume
            - mountPath: /var/lib/rook-ceph-mon
              name: ceph-admin-secret
      containers:
        - name: toolbox
          image: rook/ceph:v1.13.0
          command:
            - /bin/bash
            - -c
            - |
              ceph status
              ceph osd tree
              ceph df
          volumeMounts:
            - mountPath: /etc/ceph
              name: ceph-config
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
      restartPolicy: Never
```

## Running Multiple Commands

For complex maintenance scripts, embed multiple commands:

```yaml
command:
  - /bin/bash
  - -c
  - |
    set -e
    echo "Checking cluster health..."
    ceph health detail
    echo "Checking OSD status..."
    ceph osd status
    echo "Checking pool utilization..."
    ceph df detail
    echo "Done."
```

## Fetching Job Output

```bash
kubectl logs -n rook-ceph job/rook-ceph-toolbox-job
```

## Scheduling Recurring Jobs with CronJob

For regular health checks, convert the Job to a CronJob:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: ceph-health-check
  namespace: rook-ceph
spec:
  schedule: "0 * * * *"
  jobTemplate:
    spec:
      template:
        spec:
          initContainers:
            - name: config-init
              image: rook/ceph:v1.13.0
              command: ["/usr/local/bin/toolbox.sh"]
              args: ["--skip-watch"]
              imagePullPolicy: IfNotPresent
              env:
                - name: ROOK_CEPH_USERNAME
                  valueFrom:
                    secretKeyRef:
                      name: rook-ceph-mon
                      key: ceph-username
              volumeMounts:
                - mountPath: /etc/ceph
                  name: ceph-config
                - mountPath: /etc/rook
                  name: mon-endpoint-volume
                - mountPath: /var/lib/rook-ceph-mon
                  name: ceph-admin-secret
          containers:
            - name: toolbox
              image: rook/ceph:v1.13.0
              command:
                - ceph
                - health
                - detail
              volumeMounts:
                - mountPath: /etc/ceph
                  name: ceph-config
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
          restartPolicy: OnFailure
```

## Cleaning Up Completed Jobs

```bash
kubectl delete job -n rook-ceph rook-ceph-toolbox-job
```

## Summary

Toolbox Jobs in Rook-Ceph bridge the gap between interactive Ceph administration and automated cluster management. Use Kubernetes Jobs for one-off commands and CronJobs for recurring health checks, replacing ad-hoc toolbox sessions with reproducible, auditable automation.
