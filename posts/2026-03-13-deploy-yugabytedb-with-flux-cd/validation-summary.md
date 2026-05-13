# Validation Summary: How to Deploy YugabyteDB with Flux CD

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flux CD
- Kubernetes
- HelmRelease and HelmRepository custom resources
- YugabyteDB
- YugabyteDB Helm chart
- YSQL
- TLS

## Sources Consulted
- YugabyteDB Helm chart docs: https://docs.yugabyte.com/stable/deploy/kubernetes/single-zone/oss/helm-chart/
- YugabyteDB chart repository index and chart archive: https://charts.yugabyte.com/index.yaml and https://charts.yugabyte.com/yugabyte-2.20.7.tgz
- YugabyteDB YSQL authentication docs: https://docs.yugabyte.com/stable/secure/enable-authentication/authentication-ysql/
- YugabyteDB password authentication docs: https://docs.yugabyte.com/stable/secure/authentication/password-authentication/
- YugabyteDB yb-tserver configuration reference: https://docs.yugabyte.com/stable/reference/configuration/yb-tserver/
- YugabyteDB YB-TServer flags reference: https://docs.yugabyte.com/stable/reference/configuration/all-flags-yb-tserver/
- Flux HelmRelease docs: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux HelmRepository docs: https://fluxcd.io/flux/components/source/helmrepositories/
- Flux Kustomization docs: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Kubernetes Service docs: https://kubernetes.io/docs/concepts/services-networking/service/

## Issues Found
- The YugabyteDB Helm chart uses `Image`, not `image`, for image settings. Updated the HelmRelease values and aligned the tag with chart version 2.20.7's app version, `2.20.7.2-b1`.
- The post used a `services` values block that is not part of the YugabyteDB Helm chart. Replaced it with the chart's `serviceEndpoints` structure.
- The `ysql_enable_packed_row` flag was described as connection pooling. Updated the comment to describe packed rows.
- The standalone Job did not actually enable YSQL authentication and would not handle the TLS-enabled connection correctly. Replaced it with the chart-supported `authCredentials` values, which enable YSQL auth and trigger the chart's credential setup hook.
- The YSQL connection command used the default user without TLS options. Updated it to connect to the configured application database/user with `sslmode=require`.
- The shard tuning advice used an inaccurate "4-8 shards per CPU" rule. Reworded it to point readers to CPU count and tablet-splitting settings.
- The read replica best-practice bullet referenced `tserver.readReplica`, which is not a value in the YugabyteDB 2.20.7 Helm chart. Reworded it to refer to YugabyteDB read replica clusters without naming a nonexistent chart key.

## Review Notes
The tutorial now matches the Flux API versions and the YugabyteDB 2.20.7 Helm chart values checked during review. For a production GitOps setup, the plaintext database password should be moved out of `spec.values` and supplied through a Secret-backed values source.
