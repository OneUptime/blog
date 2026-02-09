# How to Implement Network Debugging with netcat and curl in Kubernetes Pods

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Networking, Debugging, netcat, curl

Description: Learn how to use netcat and curl for network debugging in Kubernetes pods to troubleshoot connectivity, test services, and diagnose network issues.

---

Network issues are among the most common problems in Kubernetes environments. Tools like netcat (nc) and curl provide essential capabilities for testing connectivity, debugging services, and diagnosing network problems directly from pods.

## Understanding Network Debugging Tools

Both netcat and curl serve complementary purposes in network troubleshooting. curl excels at HTTP/HTTPS testing and API interaction, while netcat handles raw TCP/UDP connections and port scanning.

## Setting Up a Debug Pod

Most production containers lack debugging tools. Create a debug pod with necessary utilities:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: netdebug
  namespace: default
spec:
  containers:
  - name: netdebug
    image: nicolaka/netshoot:latest
    command: ["/bin/bash"]
    args: ["-c", "sleep 3600"]
```

Apply and exec into it:

```bash
kubectl apply -f netdebug-pod.yaml
kubectl exec -it netdebug -- /bin/bash
```

Alternatively, use kubectl run for quick testing:

```bash
kubectl run netdebug --image=nicolaka/netshoot -it --rm -- /bin/bash
```

## Testing Connectivity with netcat

Check if ports are open and accepting connections:

```bash
# Test TCP connection
nc -zv service-name 8080

# Output:
# Connection to service-name 8080 port [tcp/http-alt] succeeded!

# Test multiple ports
nc -zv service-name 80 443 8080

# Test UDP connection
nc -zuv service-name 53
```

Scan port ranges to identify open ports:

```bash
# Scan ports 1-1000
nc -zv service-name 1-1000 2>&1 | grep succeeded

# Scan common web ports
for port in 80 443 8080 8443 3000; do
  nc -zv -w1 service-name $port
done
```

Test DNS resolution and connectivity:

```bash
# Resolve service name
host service-name

# Test connection to resolved IP
IP=$(host service-name | awk '{print $NF}')
nc -zv $IP 8080
```

## Creating Simple Test Servers with netcat

Use netcat as a quick test server:

```bash
# Listen on port 8080
nc -l 8080

# Listen and respond with data
echo "Hello from netcat" | nc -l 8080

# Echo server (repeats received data)
nc -l 8080 -k

# Save received data to file
nc -l 8080 > received-data.txt
```

From another pod, test connectivity:

```bash
# Send data to netcat server
echo "Test message" | nc netdebug-pod-ip 8080

# Send HTTP request
printf "GET / HTTP/1.1\r\nHost: test\r\n\r\n" | nc netdebug-pod-ip 8080
```

## HTTP Testing with curl

Test HTTP endpoints and APIs:

```bash
# Simple GET request
curl http://service-name:8080

# Include response headers
curl -i http://service-name:8080

# Verbose output (shows handshake)
curl -v http://service-name:8080

# Follow redirects
curl -L http://service-name:8080
```

Test Kubernetes services:

```bash
# Test service in same namespace
curl http://myservice:8080/health

# Test service in different namespace
curl http://myservice.production.svc.cluster.local:8080/health

# Test with timeout
curl --max-time 5 http://myservice:8080

# Test with retries
curl --retry 3 --retry-delay 2 http://myservice:8080
```

## POST Requests and Data Submission

Send data to APIs:

```bash
# POST JSON data
curl -X POST http://service-name:8080/api/users \
  -H "Content-Type: application/json" \
  -d '{"name":"John","email":"john@example.com"}'

# POST from file
curl -X POST http://service-name:8080/api/upload \
  -H "Content-Type: application/json" \
  -d @data.json

# POST form data
curl -X POST http://service-name:8080/api/login \
  -d "username=admin&password=secret"

# Upload file
curl -X POST http://service-name:8080/api/upload \
  -F "file=@document.pdf"
```

## Authentication Testing

Test authenticated endpoints:

```bash
# Basic authentication
curl -u username:password http://service-name:8080/api/protected

# Bearer token
curl -H "Authorization: Bearer eyJhbGc..." http://service-name:8080/api/users

# API key
curl -H "X-API-Key: abc123xyz" http://service-name:8080/api/data

# Custom headers
curl -H "X-Custom-Header: value" \
     -H "X-Another-Header: value2" \
     http://service-name:8080
```

Test Kubernetes service account tokens:

```bash
# Get service account token
TOKEN=$(cat /var/run/secrets/kubernetes.io/serviceaccount/token)

# Query Kubernetes API
curl -H "Authorization: Bearer $TOKEN" \
     --cacert /var/run/secrets/kubernetes.io/serviceaccount/ca.crt \
     https://kubernetes.default.svc/api/v1/namespaces/default/pods
```

## HTTPS and Certificate Testing

Test HTTPS connections:

```bash
# Allow insecure connections
curl -k https://service-name:8443

# Show certificate details
curl -v --insecure https://service-name:8443 2>&1 | grep -A 10 "Server certificate"

# Use specific CA certificate
curl --cacert /path/to/ca.crt https://service-name:8443

# Use client certificate
curl --cert client.crt --key client.key https://service-name:8443
```

Test certificate expiration:

```bash
# Check cert expiration
echo | openssl s_client -connect service-name:8443 2>/dev/null | \
  openssl x509 -noout -dates

# Check cert details
echo | openssl s_client -connect service-name:8443 2>/dev/null | \
  openssl x509 -noout -text
```

## Performance and Timing Analysis

Measure response times:

```bash
# Time a request
time curl http://service-name:8080

# Show timing breakdown
curl -w "@-" -o /dev/null -s http://service-name:8080 <<'EOF'
    time_namelookup:  %{time_namelookup}s\n
       time_connect:  %{time_connect}s\n
    time_appconnect:  %{time_appconnect}s\n
   time_pretransfer:  %{time_pretransfer}s\n
      time_redirect:  %{time_redirect}s\n
 time_starttransfer:  %{time_starttransfer}s\n
                    ----------\n
         time_total:  %{time_total}s\n
EOF

# Save format to file
cat > curl-format.txt <<'EOF'
     time_namelookup:  %{time_namelookup}s\n
        time_connect:  %{time_connect}s\n
     time_appconnect:  %{time_appconnect}s\n
    time_pretransfer:  %{time_pretransfer}s\n
       time_redirect:  %{time_redirect}s\n
  time_starttransfer:  %{time_starttransfer}s\n
                     ----------\n
          time_total:  %{time_total}s\n
EOF

curl -w "@curl-format.txt" -o /dev/null -s http://service-name:8080
```

Load testing with curl:

```bash
# Sequential requests
for i in {1..100}; do
  curl -o /dev/null -s -w "%{http_code}\n" http://service-name:8080
done | sort | uniq -c

# Parallel requests
seq 1 50 | xargs -n1 -P10 sh -c 'curl -o /dev/null -s -w "%{http_code}\n" http://service-name:8080'
```

## Debugging DNS Issues

Test DNS resolution:

```bash
# Using curl to test DNS
curl -v http://service-name:8080 2>&1 | grep "Trying"

# Force IPv4
curl -4 http://service-name:8080

# Force IPv6
curl -6 http://service-name:8080

# Use specific DNS server (with dig)
dig @10.96.0.10 service-name.default.svc.cluster.local

# Combine with netcat
host service-name | awk '{print $NF}' | xargs -I {} nc -zv {} 8080
```

## Testing Service Mesh Communication

When using service meshes like Istio:

```bash
# Test with service mesh headers
curl -H "X-Request-ID: test-123" \
     -H "X-B3-TraceId: trace-123" \
     http://service-name:8080

# Test circuit breaker
for i in {1..50}; do
  curl -o /dev/null -s -w "%{http_code}\n" http://service-name:8080
  sleep 0.1
done

# Test retry behavior
curl -v --retry 3 http://service-name:8080/flaky-endpoint
```

## Creating Network Test Scripts

Save reusable test scripts:

```bash
#!/bin/bash
# net-test.sh - Comprehensive network testing

SERVICE=$1
PORT=${2:-8080}

echo "=== Network Test for $SERVICE:$PORT ==="

# DNS resolution
echo -n "DNS Resolution: "
if host $SERVICE > /dev/null 2>&1; then
  echo "OK"
  IP=$(host $SERVICE | awk '{print $NF}')
  echo "  Resolved to: $IP"
else
  echo "FAILED"
  exit 1
fi

# Port connectivity
echo -n "Port $PORT: "
if nc -zv -w2 $SERVICE $PORT > /dev/null 2>&1; then
  echo "OPEN"
else
  echo "CLOSED/FILTERED"
  exit 1
fi

# HTTP test (if web service)
if [ $PORT -eq 80 ] || [ $PORT -eq 8080 ] || [ $PORT -eq 443 ] || [ $PORT -eq 8443 ]; then
  PROTO="http"
  [ $PORT -eq 443 ] || [ $PORT -eq 8443 ] && PROTO="https"

  echo -n "HTTP Response: "
  CODE=$(curl -o /dev/null -s -w "%{http_code}" $PROTO://$SERVICE:$PORT)
  echo "$CODE"

  if [ $CODE -ge 200 ] && [ $CODE -lt 400 ]; then
    echo "  Status: OK"
  else
    echo "  Status: ERROR"
  fi
fi

echo "=== Test Complete ==="
```

Use it:

```bash
chmod +x net-test.sh
./net-test.sh myservice 8080
```

## Troubleshooting Common Issues

### Connection Refused

```bash
# Test if service exists
kubectl get svc myservice

# Test pod directly (bypass service)
POD_IP=$(kubectl get pod myapp-pod -o jsonpath='{.status.podIP}')
nc -zv $POD_IP 8080

# Check if container is listening
kubectl exec myapp-pod -- netstat -tulpn | grep 8080
```

### Timeout Issues

```bash
# Test with different timeouts
curl --connect-timeout 5 --max-time 10 http://service-name:8080

# Test intermediate hops
kubectl exec netdebug -- traceroute service-name

# Check for packet loss
kubectl exec netdebug -- ping -c 10 service-name
```

### TLS/SSL Errors

```bash
# Ignore certificate validation
curl -k https://service-name:8443

# Check certificate chain
openssl s_client -connect service-name:8443 -showcerts

# Test specific TLS version
curl --tlsv1.2 https://service-name:8443
curl --tlsv1.3 https://service-name:8443
```

## Conclusion

netcat and curl are indispensable tools for network debugging in Kubernetes. netcat excels at low-level connection testing and port scanning, while curl provides comprehensive HTTP/HTTPS testing capabilities. Together, they enable you to diagnose connectivity issues, test services, measure performance, and troubleshoot complex network problems.

Keep a debug pod with these tools readily available in your clusters, and create reusable scripts for common testing scenarios to streamline your troubleshooting workflow.
