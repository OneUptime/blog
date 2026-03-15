# How to Validate Calicoctl etcd Configuration

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Calicoctl, etcd, Validation, Testing, Configuration

Description: Validate your calicoctl etcd datastore configuration to ensure correct connectivity, TLS settings, and data integrity before production use.

---

## Introduction

Before relying on calicoctl in production, you need to validate that its etcd configuration is correct and complete. A misconfigured datastore connection can silently fail or return stale data, leading to network policy inconsistencies.

Validation goes beyond simply running a command and seeing if it works. It includes verifying TLS certificate chains, confirming endpoint health across all etcd members, and checking that calicoctl can both read and write data.

This guide provides a comprehensive validation checklist and scripts for calicoctl etcd datastore configuration.

## Prerequisites

- Calico cluster using etcd as the datastore
- `calicoctl` binary installed (v3.25+)
- `openssl` and `etcdctl` available
- etcd TLS certificates accessible

## Validating the Configuration File

Check that the calicoctl configuration file is syntactically correct:

```bash
CONFIG_FILE="/etc/calico/calicoctl.cfg"

# Verify YAML syntax
python3 -c "import yaml; yaml.safe_load(open('${CONFIG_FILE}'))" && echo "YAML syntax: OK" || echo "YAML syntax: FAILED"

# Check required fields
grep -q "datastoreType" "$CONFIG_FILE" && echo "datastoreType: present" || echo "datastoreType: MISSING"
grep -q "etcdEndpoints" "$CONFIG_FILE" && echo "etcdEndpoints: present" || echo "etcdEndpoints: MISSING"
```

## Validating TLS Certificate Files

Verify all certificate files exist, are readable, and have not expired:

```bash
#!/bin/bash
# validate-certs.sh

check_cert() {
  local label=$1
  local file=$2

  if [ ! -f "$file" ]; then
    echo "FAIL: ${label} - file not found: ${file}"
    return 1
  fi

  if [ ! -r "$file" ]; then
    echo "FAIL: ${label} - file not readable: ${file}"
    return 1
  fi

  EXPIRY=$(openssl x509 -in "$file" -noout -enddate 2>/dev/null | cut -d= -f2)
  if [ -z "$EXPIRY" ]; then
    # Might be a key file, not a cert
    echo "OK:   ${label} - ${file}"
    return 0
  fi

  EXPIRY_EPOCH=$(date -d "$EXPIRY" +%s 2>/dev/null || date -j -f "%b %d %T %Y %Z" "$EXPIRY" +%s)
  NOW_EPOCH=$(date +%s)

  if [ "$EXPIRY_EPOCH" -lt "$NOW_EPOCH" ]; then
    echo "FAIL: ${label} - certificate expired on ${EXPIRY}"
    return 1
  fi

  DAYS_LEFT=$(( (EXPIRY_EPOCH - NOW_EPOCH) / 86400 ))
  echo "OK:   ${label} - expires in ${DAYS_LEFT} days (${EXPIRY})"
}

check_cert "CA Certificate" "$ETCD_CA_CERT_FILE"
check_cert "Client Certificate" "$ETCD_CERT_FILE"
check_cert "Client Key" "$ETCD_KEY_FILE"
```

## Validating the Certificate Chain

Ensure the client certificate is signed by the specified CA:

```bash
openssl verify -CAfile "$ETCD_CA_CERT_FILE" "$ETCD_CERT_FILE"
```

Verify the private key matches the client certificate:

```bash
CERT_MOD=$(openssl x509 -in "$ETCD_CERT_FILE" -noout -modulus | md5sum)
KEY_MOD=$(openssl rsa -in "$ETCD_KEY_FILE" -noout -modulus | md5sum)

if [ "$CERT_MOD" = "$KEY_MOD" ]; then
  echo "OK: Client certificate and key match"
else
  echo "FAIL: Client certificate and key do NOT match"
fi
```

## Validating etcd Endpoint Health

Check all etcd endpoints are healthy:

```bash
etcdctl --endpoints="$ETCD_ENDPOINTS" \
  --cacert="$ETCD_CA_CERT_FILE" \
  --cert="$ETCD_CERT_FILE" \
  --key="$ETCD_KEY_FILE" \
  endpoint health --write-out=table
```

Check cluster membership:

```bash
etcdctl --endpoints="$ETCD_ENDPOINTS" \
  --cacert="$ETCD_CA_CERT_FILE" \
  --cert="$ETCD_CERT_FILE" \
  --key="$ETCD_KEY_FILE" \
  member list --write-out=table
```

## Validating calicoctl Read Operations

Verify calicoctl can read from the datastore:

```bash
echo "=== Read Validation ==="
calicoctl get nodes -o wide && echo "Nodes: OK" || echo "Nodes: FAIL"
calicoctl get ippools -o yaml && echo "IP Pools: OK" || echo "IP Pools: FAIL"
calicoctl get felixconfiguration default && echo "Felix Config: OK" || echo "Felix Config: FAIL"
```

## Validating calicoctl Write Operations

Test write access with a temporary resource:

```bash
cat <<EOF | calicoctl apply -f -
apiVersion: projectcalico.org/v3
kind: GlobalNetworkSet
metadata:
  name: validation-test
spec:
  nets:
    - 192.0.2.0/24
EOF

calicoctl get globalnetworkset validation-test -o yaml

calicoctl delete globalnetworkset validation-test
echo "Write validation: OK"
```

## Full Validation Script

Combine all checks into a single validation script:

```bash
#!/bin/bash
# validate-calicoctl-etcd.sh

PASS=0
FAIL=0

check() {
  if eval "$2" > /dev/null 2>&1; then
    echo "PASS: $1"
    PASS=$((PASS + 1))
  else
    echo "FAIL: $1"
    FAIL=$((FAIL + 1))
  fi
}

check "Config file exists" "[ -f /etc/calico/calicoctl.cfg ]"
check "CA cert readable" "[ -r $ETCD_CA_CERT_FILE ]"
check "Client cert readable" "[ -r $ETCD_CERT_FILE ]"
check "Client key readable" "[ -r $ETCD_KEY_FILE ]"
check "Cert chain valid" "openssl verify -CAfile $ETCD_CA_CERT_FILE $ETCD_CERT_FILE"
check "calicoctl get nodes" "calicoctl get nodes"
check "calicoctl get ippools" "calicoctl get ippools"

echo ""
echo "Results: ${PASS} passed, ${FAIL} failed"
exit $FAIL
```

## Verification

Run the full validation and confirm all checks pass:

```bash
chmod +x validate-calicoctl-etcd.sh
./validate-calicoctl-etcd.sh
```

## Troubleshooting

- **Certificate chain validation fails**: The client certificate was not signed by the CA you are pointing to. Obtain the correct CA certificate.
- **Key and certificate mismatch**: The private key does not correspond to the client certificate. Regenerate the certificate and key as a pair.
- **Write test fails but read works**: The etcd user associated with the client certificate may have read-only permissions. Check etcd role assignments.
- **Endpoint health shows one unhealthy member**: An individual etcd member may be down. Operations continue with a quorum but the unhealthy member should be investigated.

## Conclusion

Validating your calicoctl etcd configuration before production deployment catches issues that would otherwise surface as intermittent failures. Running a comprehensive validation script as part of your deployment process ensures all layers from certificates to datastore operations are functioning correctly.
