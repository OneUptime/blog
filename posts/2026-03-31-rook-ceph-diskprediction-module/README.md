# How to Use the DiskPrediction Module in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, DiskPrediction, Predictive, Storage

Description: Enable and configure the Ceph DiskPrediction module to detect failing drives early using ML-based health scoring and SMART data analysis.

---

The Ceph DiskPrediction module uses machine learning models to analyze OSD health data and SMART disk metrics, predicting drive failures before they cause data loss.

## DiskPrediction Module Variants

Ceph originally offered two DiskPrediction modules:

- **diskprediction_local** - Uses a local ML model (no external dependencies)
- **diskprediction_cloud** - Sent data to ProphetStor cloud service for predictions (removed in Octopus v15)

The `diskprediction_cloud` module was removed in Ceph Octopus (v15) because the ProphetStor external service became inaccessible. Only `diskprediction_local` is available in current releases.

## Enabling the Local Module

```bash
# Enable local disk prediction
kubectl -n rook-ceph exec -it deploy/rook-ceph-mgr-a -- \
  ceph mgr module enable diskprediction_local

# Set the prediction mode to local
kubectl -n rook-ceph exec -it deploy/rook-ceph-mgr-a -- \
  ceph config set global device_failure_prediction_mode local

# Verify it is active
kubectl -n rook-ceph exec -it deploy/rook-ceph-mgr-a -- \
  ceph mgr module ls | grep diskprediction
```

## Configuring Prediction Parameters

```bash
# Set prediction interval (seconds, default: 86400 = 1 day)
kubectl -n rook-ceph exec -it deploy/rook-ceph-mgr-a -- \
  ceph config set mgr mgr/diskprediction_local/predict_interval 86400

# Set sleep interval between data collection runs (seconds, default: 600)
kubectl -n rook-ceph exec -it deploy/rook-ceph-mgr-a -- \
  ceph config set mgr mgr/diskprediction_local/sleep_interval 600
```

## Viewing Disk Health Predictions

```bash
# Get prediction for all OSDs
kubectl -n rook-ceph exec -it deploy/rook-ceph-mgr-a -- \
  ceph device ls

# Get health prediction for a specific device
kubectl -n rook-ceph exec -it deploy/rook-ceph-mgr-a -- \
  ceph device predict-life-expectancy DEVICE_ID
```

The module classifies devices into categories such as `>6w` (good, more than 6 weeks), `>=2w and <=6w` (warning), or `<2w` (bad, less than 2 weeks). It then sets life expectancy dates on the device using `ceph device set-life-expectancy`.

## Checking SMART Data

```bash
# List devices with SMART info
kubectl -n rook-ceph exec -it deploy/rook-ceph-mgr-a -- \
  ceph device ls --format json | python3 -m json.tool

# Get SMART health metrics for a device
kubectl -n rook-ceph exec -it deploy/rook-ceph-mgr-a -- \
  ceph device get-health-metrics DEVICE_ID
```

## Setting Up Proactive OSD Replacement

Combine DiskPrediction with Prometheus alerting:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: ceph-disk-health
  namespace: rook-ceph
spec:
  groups:
  - name: disk-prediction
    rules:
    - alert: CephDeviceFailurePredicted
      expr: ceph_health_detail{name="DEVICE_HEALTH"} > 0
      for: 1h
      labels:
        severity: warning
      annotations:
        summary: "Ceph device failure predicted"
        description: "One or more Ceph devices have a predicted failure (DEVICE_HEALTH check active)"
```

## Summary

The Ceph DiskPrediction local module uses ML models to score OSD disk health and predict failure timelines. Enable it with `ceph mgr module enable diskprediction_local`, then query predictions with `ceph device predict-life-expectancy`. Combine with Prometheus alerting on the `DEVICE_HEALTH` health check to trigger proactive OSD replacement before actual failures occur.
