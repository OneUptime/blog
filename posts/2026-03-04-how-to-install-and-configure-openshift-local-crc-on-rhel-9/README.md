# How to Install and Configure OpenShift Local (CRC) on RHEL 9

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Linux, OpenShift

Description: Step-by-step guide on install and configure openshift local (crc) on rhel 9 with practical examples and commands.

---

OpenShift Local (formerly CodeReady Containers) provides a single-node OpenShift cluster on RHEL 9 for development and testing.

## Prerequisites

- RHEL 9 with at least 9 GB RAM, 4 CPU cores, 35 GB disk
- Red Hat account for pull secret

## Download and Install

```bash
# Download from https://console.redhat.com/openshift/create/local
tar xvf crc-linux-amd64.tar.xz
sudo cp crc-linux-*-amd64/crc /usr/local/bin/
```

## Set Up CRC

```bash
crc setup
```

## Start the Cluster

```bash
crc start -p pull-secret.txt
```

## Access the Cluster

```bash
eval $(crc oc-env)
oc login -u developer -p developer https://api.crc.testing:6443
```

## Access the Console

```bash
crc console
# Opens the web console in your browser
```

## Deploy an Application

```bash
oc new-project myapp
oc new-app httpd
oc expose service/httpd
oc get routes
```

## Stop and Delete

```bash
crc stop
crc delete
```

## Conclusion

OpenShift Local on RHEL 9 provides a full OpenShift experience for development. Use it to test OpenShift-specific features like Routes, BuildConfigs, and Operators before deploying to production clusters.

