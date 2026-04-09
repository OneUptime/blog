# Validation Summary: How to Fix Clock Skew Warnings Between Ceph Monitors

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph (distributed storage system, specifically monitor clock skew)
- chrony / NTP (time synchronization)
- Kubernetes (kubectl, rook-ceph-tools deployment)
- systemd (systemctl, timedatectl)

## Sources Consulted
- Ceph source code `mon.yaml.in` for `mon_clock_drift_allowed` default value (https://github.com/ceph/ceph/blob/main/src/common/options/mon.yaml.in)
- Ceph health checks documentation (https://github.com/ceph/ceph/blob/main/doc/rados/operations/health-checks.rst)
- Ceph monitor troubleshooting documentation (https://github.com/ceph/ceph/blob/main/doc/rados/troubleshooting/troubleshooting-mon.rst)
- Ceph monitor configuration reference (https://github.com/ceph/ceph/blob/main/doc/rados/configuration/mon-config-ref.rst)
- AWS Time Sync Service documentation (https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/configure-ec2-ntp.html)
- GCP NTP configuration documentation (https://docs.cloud.google.com/compute/docs/instances/time-synchronization/configure-ntp)
- chrony documentation for Debian/Ubuntu and RHEL configuration differences

## Issues Found

### 1. Inaccurate claim about severe clock skew behavior (line 13)
- **What was wrong:** The post claimed "Severe clock skew (default threshold: 2x drift allowed) causes monitors to reject peer connections entirely." There is no documented "2x drift allowed" threshold in Ceph, and monitors do not explicitly reject peer connections based on clock skew.
- **What was changed:** Replaced with "Severe clock skew can cause election storms where monitors get stuck in the electing state, potentially losing quorum." This accurately reflects the documented behavior.
- **Why:** The Ceph documentation describes election instability and quorum loss as the consequence of severe clock skew, not connection rejection at a specific multiplier threshold.

### 2. Chrony config path and service name not portable across distros (lines 58, 68)
- **What was wrong:** The config path `/etc/chrony.conf` and service name `chronyd` are RHEL/CentOS conventions, but the install command included `apt-get` for Debian/Ubuntu. On Debian/Ubuntu, the config file is at `/etc/chrony/chrony.conf` and the service is named `chrony`.
- **What was changed:** Added distro detection logic: a variable `CHRONY_CONF` that checks for `/etc/chrony/` directory to select the correct path, and a fallback `|| sudo systemctl enable --now chrony` for the service name.
- **Why:** Users following the guide on Debian/Ubuntu would write the config to a path chrony doesn't read, and fail to start the service with the wrong unit name.

## Review Notes
- The `mon_clock_drift_allowed` default of 0.05s (50ms) was verified against Ceph source code.
- The `ceph config set` and `ceph config rm` command syntax is correct.
- AWS NTP endpoint `169.254.169.123` and GCP endpoint `metadata.google.internal` are both verified against official cloud documentation.
- The `chronyc makestep` command for forcing immediate synchronization is correct.
- The `watch ceph health` command inside kubectl exec assumes the rook-ceph-tools image includes `watch`, which is standard for this image.
