# How to Fix DASHBOARD_DEBUG Health Check in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, Dashboard

Description: Learn how to resolve the DASHBOARD_DEBUG health warning in Ceph by disabling debug mode on the Ceph dashboard module.

---

## What Is DASHBOARD_DEBUG

The `DASHBOARD_DEBUG` health warning appears when the Ceph dashboard module is running in debug mode. Debug mode exposes detailed error tracebacks and internal state in HTTP responses, which is a security risk in production environments. Ceph raises this warning to alert operators that debug mode should not be left enabled.

Check the current cluster health:

```bash
ceph health detail
```

Sample output:

```text
HEALTH_WARN Dashboard debug mode is enabled
[WRN] DASHBOARD_DEBUG: Dashboard debug mode is enabled
    Please disable debug mode in production environments using "ceph dashboard debug disable"
```

## Why Debug Mode Gets Enabled

Debug mode is typically turned on during troubleshooting sessions and then forgotten. It can also be enabled accidentally when following older documentation. In debug mode, the dashboard's Python backend surfaces full stack traces in HTTP responses, which can leak cluster topology and internal configuration details to any user with dashboard access.

## Checking Dashboard Debug Status

Inspect the current state of dashboard debug mode:

```bash
ceph dashboard debug status
```

Sample output:

```text
Debug: 'enabled'
```

## Fixing the Warning

Disable dashboard debug mode:

```bash
ceph dashboard debug disable
```

Confirm it is off:

```bash
ceph dashboard debug status
```

Expected output:

```text
Debug: 'disabled'
```

## Verifying Cluster Health

After disabling debug mode, check that the health warning is cleared:

```bash
ceph health
```

Expected:

```text
HEALTH_OK
```

## Accessing the Dashboard in Rook

If you are running Ceph via Rook, access the Ceph CLI through the toolbox pod:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- bash
```

Then run the debug disable command from inside the toolbox:

```bash
ceph dashboard debug disable
```

Alternatively, you can access the dashboard UI directly. Log into the Ceph dashboard and navigate to Administrator - Configuration - Dashboard Settings to find the debug toggle.

## Checking Other Dashboard Security Settings

While you have the dashboard in focus, verify other security-related settings:

```bash
# Check if SSL is enabled
ceph config-key get mgr/dashboard/crt

# List current dashboard configuration
ceph dashboard get-jwt-token-ttl
```

For Rook deployments, ensure the dashboard service is not inadvertently exposed with insecure defaults:

```bash
kubectl -n rook-ceph get svc rook-ceph-mgr-dashboard
```

If `TYPE` is `LoadBalancer`, verify it uses TLS and that access is restricted to trusted networks.

## Preventing This in Future

Create a runbook or checklist that includes disabling dashboard debug mode after any troubleshooting session. For automated drift detection, you can include a health check script in your monitoring:

```bash
#!/bin/bash
STATUS=$(ceph dashboard debug status 2>/dev/null)
if echo "$STATUS" | grep -q "'enabled'"; then
  echo "WARNING: Ceph dashboard debug mode is enabled"
  exit 1
fi
echo "Dashboard debug mode is off"
```

## Summary

The `DASHBOARD_DEBUG` warning indicates the Ceph dashboard is running in debug mode, which poses a security risk. Fix it by running `ceph dashboard debug disable` from the Ceph CLI or Rook toolbox pod. Always verify with `ceph health` to confirm `HEALTH_OK` after the change.
