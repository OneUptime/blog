# How to Capture Packets from a Kubernetes Pod

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Networking, Packet Capture, tcpdump, Wireshark, Debugging

Description: Learn how to capture network packets directly from a Kubernetes pod using tcpdump, kubectl debug, and ephemeral containers.

---

Capturing packets from a running Kubernetes pod is essential for debugging network issues, analyzing protocols, and verifying encryption. Several techniques work depending on your cluster access level.

---

## Method 1: kubectl exec into a Pod with tcpdump

```bash
# If the pod has tcpdump installed

kubectl exec -it my-pod -- tcpdump -i eth0 -w /tmp/capture.pcap

# Copy the capture file to your local machine
# Requires tar in the container image
kubectl cp my-pod:/tmp/capture.pcap ./capture.pcap

# Open with Wireshark
wireshark capture.pcap
```

---

## Method 2: Ephemeral Debug Container (Kubernetes 1.25+)

```bash
# Add a debug container to the pod and open a shell
kubectl debug -it my-pod   --image=nicolaka/netshoot   --container=debugger   --profile=sysadmin   -- sh

# Inside the debug container
tcpdump -i eth0 -nn -w /tmp/capture.pcap

# In another terminal, after stopping tcpdump but while the shell is still open
# Requires tar in the selected container
kubectl cp my-pod:/tmp/capture.pcap ./capture.pcap -c debugger
```

---

## Method 3: Capture on the Node

```bash
# Find the node running the pod
kubectl get pod my-pod -o wide  # Replace node01 below with the NODE column value

# Get the pod IP from your local shell
POD_IP=$(kubectl get pod my-pod -o jsonpath='{.status.podIP}')

# SSH to the node and capture traffic for that pod IP
ssh node01 "sudo tcpdump -i any host ${POD_IP} -w /tmp/pod-capture.pcap"
```

---

## Method 4: ksniff Plugin

```bash
# Install ksniff kubectl plugin
# Requires Krew to be installed
kubectl krew install sniff

# Capture to a local file
kubectl sniff my-pod -n default -o capture.pcap

# Open with Wireshark
wireshark capture.pcap
```

---

## Filter Useful Traffic

```bash
# Capture only HTTP/HTTPS
tcpdump -i eth0 'port 80 or port 443' -w capture.pcap

# Capture only DNS
tcpdump -i eth0 'port 53' -w dns-capture.pcap

# Capture between specific pods
tcpdump -i eth0 host 10.0.1.5 -w pod-to-pod.pcap
```

---

## Summary

Use `kubectl exec` for quick captures if `tcpdump` is in the image, or add an ephemeral debug container using `kubectl debug`. All containers in a Pod share the network namespace; `--target` is only needed when you want to target another container's process namespace. For longer captures, run `tcpdump` from the node and filter by the Pod IP. Transfer the `.pcap` file with `kubectl cp` (which requires `tar` in the selected container) and analyze with Wireshark.
