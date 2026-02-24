# How to Report Bugs in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Bug Reports, Open Source, Troubleshooting, Community

Description: How to write effective bug reports for the Istio project that help maintainers reproduce and fix issues quickly with proper diagnostics and context.

---

Finding a bug in Istio is frustrating, but reporting it well is how you turn frustration into progress. A good bug report gets attention and gets fixed. A vague one sits in the issue tracker collecting dust. The difference between the two usually comes down to how much context and reproduction steps you include.

Here is how to write Istio bug reports that actually get fixed.

## Before Reporting: Is It Actually a Bug?

Before filing an issue, rule out common non-bugs:

1. Check if it is a known issue:

```bash
# Search existing issues
gh issue list --repo istio/istio --search "your error message" --state open
gh issue list --repo istio/istio --search "your error message" --state closed
```

2. Run istioctl analyze to check for misconfigurations:

```bash
istioctl analyze --all-namespaces
```

Many "bugs" are actually configuration problems. Fix any warnings or errors before reporting.

3. Check if you are on a supported version:

```bash
istioctl version
```

Istio supports the current release and the two previous minor releases. If you are on an older version, try upgrading first.

4. Search the Istio documentation and FAQ:

The Istio docs have a troubleshooting section that covers the most common issues.

## Gather Diagnostic Information

Before writing the report, collect everything the maintainers will need:

```bash
# Istio version info
istioctl version --remote

# Bug report archive (this collects a LOT of useful info)
istioctl bug-report
```

The `istioctl bug-report` command creates an archive containing:
- Istio component logs
- Proxy configurations
- Resource definitions
- Cluster information
- Istio configuration

```bash
# The output is a tar.gz file
ls bug-report-*.tar.gz
```

For specific issues, also gather:

```bash
# Proxy configuration for affected workload
istioctl proxy-config all deploy/my-service -n production -o json > proxy-config.json

# Proxy status
istioctl proxy-status

# Envoy logs for the affected proxy
kubectl logs deploy/my-service -c istio-proxy --tail=200 > proxy-logs.txt

# Control plane logs
kubectl logs deploy/istiod -n istio-system --tail=200 > istiod-logs.txt
```

## Write the Bug Report

Go to https://github.com/istio/istio/issues/new and select the Bug Report template. Here is how to fill out each section effectively.

### Title

Be specific. Not "VirtualService not working" but "VirtualService with header-based routing returns 404 when no header present."

### Version Information

```
istioctl version:
  client: 1.22.0
  control plane: 1.22.0
  data plane: 1.22.0

Kubernetes version: 1.29.2
Cloud provider: AWS EKS
```

### Description of the Bug

Explain what you expected to happen and what actually happened:

```
Expected behavior:
Requests to my-service without the x-version header should be routed
to the v1 subset (default route).

Actual behavior:
Requests without the x-version header return HTTP 404 with
"no healthy upstream" in the Envoy access logs.
```

### Steps to Reproduce

This is the most important section. Write step-by-step instructions that someone can follow from scratch:

```
1. Create a namespace with Istio injection enabled:
   kubectl create namespace test
   kubectl label namespace test istio-injection=enabled

2. Deploy the test application:
   kubectl apply -n test -f - <<EOF
   apiVersion: apps/v1
   kind: Deployment
   metadata:
     name: httpbin
     namespace: test
   spec:
     replicas: 1
     selector:
       matchLabels:
         app: httpbin
         version: v1
     template:
       metadata:
         labels:
           app: httpbin
           version: v1
       spec:
         containers:
           - name: httpbin
             image: docker.io/kong/httpbin:latest
             ports:
               - containerPort: 80
   ---
   apiVersion: v1
   kind: Service
   metadata:
     name: httpbin
     namespace: test
   spec:
     selector:
       app: httpbin
     ports:
       - port: 8000
         targetPort: 80
   EOF

3. Apply the VirtualService:
   kubectl apply -n test -f - <<EOF
   apiVersion: networking.istio.io/v1
   kind: VirtualService
   metadata:
     name: httpbin
   spec:
     hosts:
       - httpbin
     http:
       - match:
           - headers:
               x-version:
                 exact: "v2"
         route:
           - destination:
               host: httpbin
   EOF

4. Send a request without the header:
   kubectl exec deploy/sleep -- curl -s -o /dev/null -w "%{http_code}" http://httpbin.test:8000/get

5. Observe the 404 response.
```

### Include Relevant Configuration

Attach the YAML for any resources involved:

```yaml
# Include your VirtualService, DestinationRule, Gateway, etc.
```

### Include Logs

Attach relevant log snippets. Trim them to the relevant entries:

```
# From istio-proxy on the affected pod
[2025-01-15T10:23:45.123Z] "GET /get HTTP/1.1" 404 NR route_not_found - "-" 0 0 0 - "10.244.0.15" "curl/8.1.2" "abc-123" "httpbin.test:8000" "-" - - 10.244.0.20:80 10.244.0.15:40234 - -
```

The `NR` flag and `route_not_found` tell the maintainers exactly what happened at the Envoy level.

### Attach Bug Report

Upload the `istioctl bug-report` archive to the issue:

```bash
# The file will be named something like:
# bug-report-20250115-102345.tar.gz
```

GitHub allows file attachments up to 25MB. If the bug report is larger, upload it to a file sharing service and link to it.

## For Performance Issues

Performance bugs need different data. Include:

```bash
# Proxy CPU and memory usage
kubectl top pods -n production --containers | grep istio-proxy

# Request latency metrics
kubectl exec deploy/my-service -c istio-proxy -- curl -s localhost:15090/stats/prometheus | grep -i "request_duration"

# Connection pool stats
kubectl exec deploy/my-service -c istio-proxy -- curl -s localhost:15000/clusters | grep -i "cx_active\|rq_active"
```

Include load testing results showing the performance difference:

```
Without Istio: p50=2ms, p99=15ms
With Istio: p50=25ms, p99=200ms
```

## For Security Issues

Security vulnerabilities should NOT be reported as public GitHub issues. Instead:

1. Email istio-security-vulnerability-reports@googlegroups.com
2. Include the same level of detail as a regular bug report
3. Describe the potential security impact
4. Do not disclose the vulnerability publicly until it is fixed

## After Reporting

Once your issue is filed:

1. Respond promptly if maintainers ask for more information
2. Test proposed fixes if you can
3. Update the issue if you find additional details
4. Be patient. Maintainers are often volunteers working in their spare time.

If your issue does not get attention after a week, it is okay to leave a polite comment asking for an update. You can also mention it in the `#contributors` Slack channel.

## Track Your Issues

Keep track of bugs you have reported:

```bash
# List your open issues
gh issue list --repo istio/istio --author @me --state open
```

Good bug reports are a valuable contribution to the project. They help maintainers find and fix problems that affect everyone. Take the time to write them well, and the community will appreciate it.
