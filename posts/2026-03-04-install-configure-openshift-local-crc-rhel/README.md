# How to Install and Configure OpenShift Local (CRC) on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, OpenShift, CRC, Containers, Development

Description: Set up OpenShift Local (formerly CodeReady Containers) on RHEL for local OpenShift development and testing.

---

OpenShift Local (previously called CodeReady Containers or CRC) runs a minimal OpenShift cluster on your local machine. It is designed for development and testing, not production. Here is how to set it up on RHEL.

## System Requirements

OpenShift Local requires:
- 4 physical CPU cores (9 GB+ RAM recommended)
- 35 GB of free disk space
- A RHEL 8 or 9 workstation (physical or VM with nested virtualization)

```bash
# Verify CPU virtualization support
grep -cE 'vmx|svm' /proc/cpuinfo
# Should return a number greater than 0

# Check available memory
free -h

# Check disk space
df -h /home
```

## Downloading OpenShift Local

Download CRC from the Red Hat Console at console.redhat.com/openshift/create/local. You also need to download the pull secret from the same page.

```bash
# Extract the downloaded archive
tar xvf crc-linux-amd64.tar.xz

# Move the binary to your PATH
sudo cp crc-linux-*-amd64/crc /usr/local/bin/
crc version
```

## Setting Up the Environment

```bash
# Run the setup command to install prerequisites (libvirt, etc.)
crc setup

# This configures:
# - libvirt and the CRC network
# - NetworkManager DNS configuration
# - The CRC virtual machine image
```

## Starting the Cluster

```bash
# Start OpenShift Local with your pull secret
crc start

# When prompted, paste your pull secret from console.redhat.com
# The startup takes 5-10 minutes on first run

# After startup, you will see login credentials in the output:
# To access the cluster as admin: oc login -u kubeadmin -p XXXXX
# To access the cluster as developer: oc login -u developer -p developer
```

## Configuring Resources

```bash
# Increase memory allocation (default is 9 GB)
crc config set memory 16384

# Increase CPU cores
crc config set cpus 6

# Increase disk size
crc config set disk-size 50

# Apply changes by restarting
crc stop
crc start
```

## Accessing the Cluster

```bash
# Set up the oc CLI
eval $(crc oc-env)

# Log in as admin
oc login -u kubeadmin -p $(crc console --credentials | grep kubeadmin | awk -F"'" '{print $2}')

# Verify the cluster is running
oc get nodes
oc get clusterversion

# Access the web console
crc console
# Opens the OpenShift web console in your browser
```

## Deploying a Test Application

```bash
# Log in as developer
oc login -u developer -p developer

# Create a new project
oc new-project my-test-app

# Deploy a sample application
oc new-app --name=hello \
  --image=registry.access.redhat.com/ubi9/httpd-24

# Expose the service with a route
oc expose service/hello

# Get the route URL
oc get route hello -o jsonpath='{.spec.host}'
```

## Managing the Cluster Lifecycle

```bash
# Stop the cluster (preserves state)
crc stop

# Start it again
crc start

# Delete the cluster completely
crc delete

# Clean up all CRC resources
crc cleanup
```

## Troubleshooting

```bash
# Check CRC status
crc status

# View the CRC VM logs
crc logs

# If DNS resolution fails, restart the CRC network
crc stop
sudo systemctl restart NetworkManager
crc start
```

OpenShift Local gives you a realistic OpenShift environment for developing and testing applications before deploying to a production OpenShift cluster.
