# Validation Summary: How to Use ClickHouse Operator (Altinity) on Kubernetes

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse
- Kubernetes
- Altinity ClickHouse Operator (clickhouse-operator)
- kubectl
- ZooKeeper (for ClickHouse replication coordination)

## Sources Consulted
- Altinity ClickHouse Operator GitHub repository: https://github.com/Altinity/clickhouse-operator
- Official install bundle manifest: https://raw.githubusercontent.com/Altinity/clickhouse-operator/master/deploy/operator/clickhouse-operator-install-bundle.yaml
- Operator quick start guide and README
- Official CHI example files (01-simple-layout, 03-persistent-volume, 99-clickhouseinstallation-max)
- Operator source code for naming patterns (`pkg/model/chi/namer/patterns.go`) and labels (`pkg/model/chi/tags/labeler/list.go`)
- Custom resource documentation (`docs/custom_resource_explained.md`)

## Issues Found

1. **Kubernetes version requirement was incorrect.** The post stated "Kubernetes cluster (1.19+)" but the Altinity ClickHouse Operator versions 0.16.0+ (the install bundle ships 0.26.2) require Kubernetes 1.25+. Changed to "1.25+".

2. **Helm 3 listed as prerequisite but not used.** The post listed "Helm 3 installed" as a prerequisite, but the installation method shown uses `kubectl apply -f <URL>`, which is a plain manifest-based install that does not require Helm. Removed this prerequisite. (The operator can be installed via Helm, but the blog does not use that method.)

## Review Notes
- All ClickHouse-operator-specific technical details are accurate: the CRD API version (`clickhouse.altinity.com/v1`), kind (`ClickHouseInstallation`), spec structure (clusters, layout, zookeeper, defaults, templates), field names (`shardsCount`, `replicasCount`), label selectors (`clickhouse.altinity.com/chi=ch-cluster`), and service naming convention (`chi-ch-cluster-production-0-0`) were all verified against the operator source code and official examples.
- The operator installs into `kube-system` namespace by default, matching the blog's kubectl commands.
- The post could mention ClickHouse Keeper as a modern alternative to ZooKeeper for coordination, but this is not an error — ZooKeeper remains a supported option.
