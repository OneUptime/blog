# How to Test Ingress IPv6 Connectivity

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, IPv6, Ingress, Testing, Networking, curl

Description: A step-by-step guide to verifying IPv6 connectivity through Kubernetes Ingress controllers using command-line tools and automated health checks.

## Introduction

Once your Ingress controller is configured for IPv6, you need systematic tests to confirm traffic actually flows end-to-end. This guide covers manual verification, scripted checks, and continuous monitoring approaches.

## Prerequisites

- Kubernetes cluster with dual-stack or IPv6-only networking
- NGINX or similar Ingress controller deployed
- Tools: `curl`, `dig`, `ping6`, `nmap`

## Step 1: Confirm DNS Returns AAAA Records

Before testing HTTP, verify DNS resolution returns an IPv6 address for your Ingress hostname.

```bash
# Query for AAAA (IPv6) records

dig AAAA myapp.example.com

# Use Google's DNS to cross-check
dig AAAA myapp.example.com @2001:4860:4860::8888

# Short output format
dig +short AAAA myapp.example.com
```

The response should contain a valid IPv6 address. No answer section, or a non-`NOERROR` status, means DNS is not returning a usable AAAA record.

## Step 2: Ping the Ingress Endpoint

```bash
# Send 4 ICMPv6 echo requests
ping6 -c 4 myapp.example.com

# Ping a specific IPv6 address directly
ping6 -c 4 2001:db8::1

# On some systems the command is just ping with -6
ping -6 -c 4 myapp.example.com
```

## Step 3: Test HTTP over IPv6 with curl

```bash
# Force IPv6 and show verbose output
curl -6 -v http://myapp.example.com/

# Test HTTPS over IPv6 (including TLS handshake details)
curl -6 -v https://myapp.example.com/

# Test using a literal IPv6 address (Host header required)
curl -6 -v \
  -H "Host: myapp.example.com" \
  http://[2001:db8::1]/

# Measure response time for IPv6
curl -6 -o /dev/null -s -w \
  "dns:%{time_namelookup} connect:%{time_connect} total:%{time_total}\n" \
  https://myapp.example.com/
```

## Step 4: Test from Inside the Cluster

Deploy a test pod to verify IPv6 routing within the cluster.

```yaml
# test-pod.yaml - a minimal debugging pod
apiVersion: v1
kind: Pod
metadata:
  name: ipv6-test
  namespace: default
spec:
  containers:
  - name: test
    image: nicolaka/netshoot
    command: ["sleep", "3600"]
```

```bash
kubectl apply -f test-pod.yaml

# Exec in and test connectivity to the ingress service IPv6 ClusterIP
kubectl exec -it ipv6-test -- curl -6 -v \
  -H "Host: myapp.example.com" \
  http://[<ingress-clusterip>]/

# Test service DNS resolution from inside
kubectl exec -it ipv6-test -- \
  dig AAAA ingress-nginx-controller.ingress-nginx.svc.cluster.local
```

## Step 5: Port Scan to Confirm Listening Ports

```bash
# Check that ports 80 and 443 are open over IPv6
nmap -6 -p 80,443 myapp.example.com

# Quick TCP connect test without nmap
curl -6 --connect-timeout 5 \
  -o /dev/null -s -w "%{http_code}" \
  http://myapp.example.com/
```

## Step 6: Automate with a Shell Script

Run this script as part of a CI pipeline or cron job to continuously validate IPv6 Ingress health.

```bash
#!/bin/bash
# ipv6-ingress-test.sh - automated IPv6 connectivity check

HOST="myapp.example.com"
EXPECTED_CODE=200

# Resolve AAAA record
IPV6_ADDR=$(dig +short AAAA "$HOST" | grep ':' | head -1)
if [ -z "$IPV6_ADDR" ]; then
  echo "FAIL: No usable AAAA record for $HOST"
  exit 1
fi
echo "OK: AAAA record = $IPV6_ADDR"

# HTTP check over IPv6
HTTP_CODE=$(curl -6 -o /dev/null -s -w "%{http_code}" \
  --max-time 10 "https://$HOST/")

if [ "$HTTP_CODE" -eq "$EXPECTED_CODE" ]; then
  echo "OK: HTTP $HTTP_CODE received over IPv6"
else
  echo "FAIL: Expected $EXPECTED_CODE, got $HTTP_CODE"
  exit 1
fi
```

## Conclusion

Thorough IPv6 Ingress testing covers DNS resolution, ICMP reachability, HTTP/HTTPS responses, and in-cluster routing. Automating these checks and feeding results into a monitoring platform like OneUptime ensures continuous visibility into your IPv6 connectivity.
