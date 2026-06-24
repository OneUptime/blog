# How to Set Up an OpenShift Container Platform Cluster on RHEL 9

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Linux, Container, OpenShift

Description: Step-by-step guide on set up an openshift container platform cluster on rhel 9 with practical examples and commands.

---

Deploying a full OpenShift Container Platform cluster with RHEL 9 compute nodes provides enterprise Kubernetes with integrated monitoring and security.

## Prerequisites

- At least 3 control plane nodes and 2 worker nodes
- Red Hat Enterprise Linux CoreOS (RHCOS) on bootstrap and control plane nodes
- RHEL 9 on compute nodes with valid subscriptions
- DNS configuration for the cluster domain
- Load balancer for API and ingress

## Install the OpenShift Installer

```bash
# Download from console.redhat.com

tar xzf openshift-install-linux.tar.gz
sudo mv openshift-install /usr/local/bin/
tar xzf openshift-client-linux.tar.gz
sudo mv oc kubectl /usr/local/bin/
```

## Create the Install Configuration

```bash
openshift-install create install-config --dir=ocp-install
```

Edit the generated install-config.yaml for your environment.

## Deploy the Cluster

```bash
openshift-install create cluster --dir=ocp-install --log-level=info
```

## Access the Cluster

```bash
export KUBECONFIG=ocp-install/auth/kubeconfig
oc get nodes
oc get clusterversion
```

## Verify

```bash
oc get co  # Cluster operators
oc get nodes
oc get pods -n openshift-monitoring
```

## Conclusion

OpenShift Container Platform with RHEL 9 compute nodes provides a full enterprise Kubernetes platform with integrated monitoring and optional logging and CI/CD capabilities. For installer-provisioned infrastructure, RHEL compute machines must be added manually because automatic scaling adds RHCOS compute machines by default.
