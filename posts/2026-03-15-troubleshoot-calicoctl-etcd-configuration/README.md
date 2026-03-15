# How to Troubleshoot Calicoctl etcd Configuration

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Calicoctl, etcd, Troubleshooting, Debugging, Networking

Description: Diagnose and fix common calicoctl etcd datastore configuration issues including TLS errors, connectivity failures, and authentication problems.

---

## Introduction

Connecting calicoctl to an etcd datastore involves multiple components: network connectivity, TLS certificate chains, endpoint configuration, and proper file permissions. When any of these break, calicoctl commands fail with errors that can be difficult to interpret.

Systematic troubleshooting starts with verifying the most basic layer (network connectivity) and works upward through TLS validation and authentication. This approach quickly isolates the root cause.

This guide provides a structured methodology for diagnosing and resolving the most common calicoctl etcd configuration issues.

## Prerequisites

- Calico cluster using etcd as the datastore
- `calicoctl` binary installed (v3.25+)
- `openssl`, `curl`, and `etcdctl` available for diagnostics
- Access to etcd TLS certificates

## Step 1: Verify Environment Variables

Check that all required environment variables are set:

```bash
echo "DATASTORE_TYPE:   ${DATASTORE_TYPE}"
echo "ETCD_ENDPOINTS:   ${ETCD_ENDPOINTS}"
echo "ETCD_CA_CERT_FILE: ${ETCD_CA_CERT_FILE}"
echo "ETCD_CERT_FILE:   ${ETCD_CERT_FILE}"
echo "ETCD_KEY_FILE:    ${ETCD_KEY_FILE}"
```

If using a configuration file, verify its contents:

```bash
cat /etc/calico/calicoctl.cfg
```

## Step 2: Test Network Connectivity

Check that etcd endpoints are reachable:

```bash
# Parse endpoints and test each one
IFS=',' read -ra ENDPOINTS <<< "$ETCD_ENDPOINTS"
for EP in "${ENDPOINTS[@]}"; do
  HOST=$(echo "$EP" | sed 's|https\?://||' | cut -d: -f1)
  PORT=$(echo "$EP" | sed 's|https\?://||' | cut -d: -f2)
  echo -n "Testing ${HOST}:${PORT} ... "
  if nc -z -w5 "$HOST" "$PORT" 2>/dev/null; then
    echo "OK"
  else
    echo "FAILED"
  fi
done
```

## Step 3: Validate TLS Certificates

Verify the certificate files exist and are readable:

```bash
for CERT_VAR in ETCD_CA_CERT_FILE ETCD_CERT_FILE ETCD_KEY_FILE; do
  FILE="${!CERT_VAR}"
  if [ -f "$FILE" ] && [ -r "$FILE" ]; then
    echo "${CERT_VAR}: OK ($(stat -c %a "$FILE" 2>/dev/null || stat -f %Lp "$FILE") permissions)"
  else
    echo "${CERT_VAR}: MISSING or UNREADABLE - ${FILE}"
  fi
done
```

Check certificate validity and expiration:

```bash
openssl x509 -in "$ETCD_CERT_FILE" -noout -dates -subject
openssl x509 -in "$ETCD_CA_CERT_FILE" -noout -dates -subject
```

Verify the certificate chain:

```bash
openssl verify -CAfile "$ETCD_CA_CERT_FILE" "$ETCD_CERT_FILE"
```

## Step 4: Test with etcdctl

Use etcdctl to test the connection independently of calicoctl:

```bash
etcdctl --endpoints="$ETCD_ENDPOINTS" \
  --cacert="$ETCD_CA_CERT_FILE" \
  --cert="$ETCD_CERT_FILE" \
  --key="$ETCD_KEY_FILE" \
  endpoint health
```

List Calico keys to verify data access:

```bash
etcdctl --endpoints="$ETCD_ENDPOINTS" \
  --cacert="$ETCD_CA_CERT_FILE" \
  --cert="$ETCD_CERT_FILE" \
  --key="$ETCD_KEY_FILE" \
  get /calico --prefix --keys-only --limit=10
```

## Step 5: Test with curl

If etcdctl is not available, test TLS with curl:

```bash
ENDPOINT=$(echo "$ETCD_ENDPOINTS" | cut -d, -f1)

curl -s --cacert "$ETCD_CA_CERT_FILE" \
  --cert "$ETCD_CERT_FILE" \
  --key "$ETCD_KEY_FILE" \
  "${ENDPOINT}/health"
```

## Step 6: Run calicoctl with Debug Logging

Enable verbose output for detailed error information:

```bash
DATASTORE_TYPE=etcdv3 calicoctl get nodes --log-level=debug 2>&1 | head -50
```

## Common Error Messages and Solutions

**Error: "context deadline exceeded"**

```bash
# Cause: etcd endpoint unreachable or too slow
# Fix: Check network connectivity and endpoint list
nc -z -w5 etcd1 2379
```

**Error: "x509: certificate signed by unknown authority"**

```bash
# Cause: CA cert does not match etcd server cert
# Fix: Verify the CA cert matches
openssl verify -CAfile "$ETCD_CA_CERT_FILE" "$ETCD_CERT_FILE"
```

**Error: "tls: bad certificate"**

```bash
# Cause: Client certificate rejected by etcd server
# Fix: Check cert CN/SAN and expiration
openssl x509 -in "$ETCD_CERT_FILE" -noout -text | grep -A1 "Subject:"
```

## Verification

After fixing issues, confirm calicoctl works:

```bash
calicoctl get nodes -o wide
calicoctl get ippools -o yaml
calicoctl node checksystem
```

## Troubleshooting

- **Intermittent failures**: If errors come and go, check if one etcd member is unhealthy. Use `etcdctl endpoint health` to test each member.
- **Permission denied on cert files**: Run `ls -la` on all certificate paths and fix with `chmod 600`.
- **Wrong etcd API version**: Ensure you are using etcdv3 and not the deprecated v2 API. Set `DATASTORE_TYPE=etcdv3`.
- **Certificate expired**: Regenerate certificates and redistribute to all nodes and configuration files.

## Conclusion

Troubleshooting calicoctl etcd configuration follows a layered approach: check environment variables, test network connectivity, validate TLS certificates, and verify with independent tools like etcdctl. This systematic method isolates the failure point quickly and avoids guesswork.
