# How to Debug CephX Authentication Failures

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, CephX, Debugging, Authentication, Troubleshooting

Description: Diagnose and fix CephX authentication failures in Rook-managed Ceph clusters by analyzing error messages, verifying key permissions, and checking capability mismatches.

---

CephX authentication failures produce cryptic error messages that can be hard to interpret. This guide provides a systematic approach to identifying whether the issue is a missing key, wrong capabilities, or a network/configuration problem.

## Common CephX Error Messages

| Error | Likely Cause |
|-------|-------------|
| `auth: could not find secret` | Key does not exist or wrong entity name |
| `[errno 13] error connecting to cluster` | Wrong capabilities or key mismatch |
| `EACCES: access denied` | Insufficient capabilities for the operation |
| `auth: error authenticating` | Key value mismatch or clock skew |
| `monclient: hunting for new monitor` | Monitor cannot be reached |

## Step 1: Verify the Key Exists

Check if the expected key entity exists:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph auth get client.myapp 2>&1
```

If the key is missing, create it:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph auth get-or-create client.myapp \
  mon 'allow r' \
  osd 'allow rw pool=mypool'
```

## Step 2: Check the Key Value

Verify the key stored in the Kubernetes Secret matches what Ceph has:

```bash
# Get the key from Ceph (omit -t to avoid TTY carriage returns in the variable)
CEPH_KEY=$(kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  ceph auth get-key client.myapp)

# Get the key from the Secret
SECRET_KEY=$(kubectl -n myapp get secret ceph-keyring \
  -o jsonpath='{.data.key}' | base64 -d)

# Compare
[ "$CEPH_KEY" = "$SECRET_KEY" ] && echo "Keys match" || echo "MISMATCH"
```

## Step 3: Verify Capabilities

Check that the key has the required capabilities for the operation:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph auth get client.myapp
```

If capabilities are wrong, update them:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph auth caps client.myapp \
  mon 'allow r' \
  osd 'allow rw pool=mypool'
```

## Step 4: Enable Debug Logging

Temporarily increase CephX debug level to see detailed auth exchange:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set global debug_auth 20

# Reproduce the failure and check logs
kubectl -n rook-ceph logs -l app=rook-ceph-mon --tail=200 | grep -i auth

# Reset to default log level
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config rm global debug_auth
```

## Step 5: Check Clock Skew

CephX is sensitive to clock skew. Ceph monitors warn when skew exceeds 0.05 seconds by default (`mon_clock_drift_allowed`), and larger drifts can cause authentication failures:

```bash
# Check node times
kubectl get nodes -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.status.conditions[?(@.type=="Ready")].lastHeartbeatTime}{"\n"}{end}'

# Check Ceph's view of clock skew
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph health detail | grep "clock"
```

## Step 6: Test Authentication Directly

Run a minimal auth test from the tools pod by exporting the client keyring and testing with it:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- bash -c \
  'ceph auth get client.myapp -o /tmp/myapp.keyring && \
   ceph --id myapp --keyring /tmp/myapp.keyring status'
```

## Summary

CephX authentication failures almost always fall into one of four categories: missing key, key value mismatch, insufficient capabilities, or clock skew. Follow the debugging steps in order - verify the key exists, compare its value to the Kubernetes Secret, check its capabilities match the required operation, and verify node clock synchronization. Enable `debug_auth 20` for detailed protocol-level logging when the cause remains unclear.
