# Validation Summary: How to Configure Apache Spark Standalone on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu 22.04
- Apache Spark Standalone
- OpenJDK / Java
- PySpark
- Spark History Server
- systemd
- SSH

## Sources Consulted
- Apache Spark 4.1.1 Overview: https://spark.apache.org/docs/latest/
- Apache Spark 4.1.1 Standalone Mode: https://spark.apache.org/docs/latest/spark-standalone.html
- Apache Spark 4.1.1 Submitting Applications: https://spark.apache.org/docs/latest/submitting-applications.html
- Apache Spark 4.1.1 Monitoring and Instrumentation: https://spark.apache.org/docs/latest/monitoring.html
- Apache Spark 4.1.1 download directory: https://downloads.apache.org/spark/spark-4.1.1/
- Apache Spark daemon script source: https://apache.googlesource.com/spark/+/master/sbin/spark-daemon.sh
- Ubuntu package listing for openjdk-17-jdk: https://packages.ubuntu.com/openjdk-17-jdk
- systemd.service manual: https://www.freedesktop.org/software/systemd/man/systemd.service.html

## Issues Found
- The post used Apache Spark 3.5.1 and described Java 11 or 17 as prerequisites. Current Spark 4.1.1 documentation lists Java 17 or 21 support, so the prerequisite and download commands were updated to Spark 4.1.1 and Java 17/21.
- The download URL used the Apache archive for Spark 3.5.1. Updated it to the active Apache downloads host for Spark 4.1.1.
- The introduction referenced Mesos as an alternative cluster manager. Current Spark documentation lists YARN and Kubernetes, and Mesos is no longer a current Spark deploy-mode option, so the comparison was updated.
- The passwordless SSH setup generated a key under `~/.ssh` without first creating that directory. Added `mkdir -p ~/.ssh` and `chmod 700 ~/.ssh`.
- The `sudo -u spark pyspark` and `sudo -u spark spark-submit` examples relied on `/opt/spark/bin` being present in sudo's command PATH. Updated them to use absolute paths.
- The systemd master service used `PIDFile=/opt/spark/spark-master.pid`, but Spark daemon scripts write PID files under `SPARK_PID_DIR` using the daemon class name. Added `SPARK_PID_DIR=/run/spark`, `RuntimeDirectory=spark`, and corrected the master and worker `PIDFile` paths.
- The troubleshooting log path did not match Spark's daemon log filename pattern. Updated it to match the master daemon class name.
- The out-of-memory troubleshooting commands used shell redirection to a root-owned file without privilege on the redirection itself. Changed them to `sudo tee -a`.

## Review Notes
- The tutorial remains a minimal standalone-cluster setup. Production deployments should also consider Spark security settings, event-log storage on shared durable storage, and stronger service hardening.
